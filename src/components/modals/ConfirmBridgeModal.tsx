"use client";
import { useEffect, useState, useRef, useId, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ShieldCheck, Send, Check, ArrowDownIcon } from "lucide-react";
import { useBridge } from "@/providers/BridgeProvider";
import { makeWsClient } from "@/libs/publicClients";
import { useInitializeBridge, waitForFinalizeTxByRequestIdWS } from "../hooks/useInitializeBridge";
import { BaseError, ContractFunctionRevertedError, type Hex } from "viem";
import { ChainConfig, TokenConfig } from "@/data/chains_tokens";
import { LoaderRing } from "../LoaderRing";
import { useEnsurePermit2Approval } from "../hooks/useApprove";
import Image from "next/image";

type Props = {
  open: boolean;
  onClose: () => void;
  onApprove: () => Promise<void>;
  onPermit: () => Promise<void>;
};

type Step = "approve" | "permit" | "bridge" | "done";
type Status = "idle" | "loading" | "success" | "error";

const REACTIVE_LOGO = "/reactive-network.png";

export default function ConfirmBridgeModal({ open, onClose, onApprove, onPermit }: Props) {
  const bridge = useBridge();
  const { initializeBridge } = useInitializeBridge();
  const { needsApproval } = useEnsurePermit2Approval();

  useEffect(() => {
    if (bridge.needsPermit2Approve !== needsApproval) {
      bridge.setNeedsPermit2Approve(needsApproval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsApproval]);

  // UI state
  const [step, setStep]     = useState<Step>("approve");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError]   = useState<string | null>(null);

  // progress state
  const [srcTx, setSrcTx]  = useState<`0x${string}` | null>(null);
  const [dstTx, setDstTx]  = useState<`0x${string}` | null>(null);

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(
      bridge.srcToken === "0x0000000000000000000000000000000000000000"
        ? "bridge"
        : (bridge.needsPermit2Approve ? "approve" : "permit")
    );
    setStatus("idle");
    setError(null);
    setSrcTx(null); setDstTx(null);
    setProcessing(false);
  }, [open, bridge.needsPermit2Approve, bridge.srcToken]);

  // ==== actions ====
  async function handleBridge() {
    setStatus("loading");
    try {
      const dstPc = makeWsClient({ chain: { id: bridge.dstChainId, name: bridge.dstChain!.name, nativeCurrency: { name: bridge.dstChain!.tokens[0].name, symbol: bridge.dstChain!.tokens[0].symbol, decimals: bridge.dstChain!.tokens[0].decimals }, rpcUrls: { default: { http: [bridge.dstChain!.rpcUrl] } } }, wsUrl: (bridge.dstChain as ChainConfig).wssUrl! })
      const dstBridge = bridge.dstBridge!;

      // source tx → requestId
      const src = await initializeBridge();
      setProcessing(true);
      setSrcTx(src.txHash);
      
      const dst = await waitForFinalizeTxByRequestIdWS(dstPc, dstBridge, src.requestId as Hex);
      setDstTx(dst);
      setStatus("success");
      setStep("done");
    } catch (err: BaseError | any) {
      setStatus("error");
      if (err instanceof BaseError) {
        const revert = err.walk?.((e) => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | undefined;
        switch (revert?.reason) {
          case "Too little received":
            setError("Slippage too low, try it later.");
            break;
          default:
            setError(revert?.reason ? `Transaction reverted: ${revert.reason}` : err.shortMessage  ?? "Bridge failed");
        }
      } else {
        setError(err?.message ?? "Bridge failed");
      }

      setProcessing(false);
    }
  }

  async function onPrimary() {
    if (step === "approve") {
      setStatus("loading");
      try {
        await onApprove();
        setStatus("success");
        setTimeout(() => { setStatus("idle"); setStep("permit"); }, 250);
      } catch (e: any) { setStatus("idle"); setError(e?.message ?? "Approve failed"); }
      return;
    }
    if (step === "permit") {
      setStatus("loading");
      try {
        await onPermit();
        setStatus("success");
        setTimeout(() => { setStatus("idle"); setStep("bridge"); }, 250);
      } catch (e: any) { setStatus("idle"); setError(e?.message ?? "Permit failed"); }
      return;
    }
    if (step === "bridge") {
      await handleBridge();
      return;
    }
    onClose();
  }

  // ==== helpers ====
  const srcChain = bridge.srcChain!;
  const dstChain = bridge.dstChain!;

  const openInExplorer = (tx: `0x${string}`, isSrc: boolean) => {
    const chain = isSrc ? srcChain : dstChain;
    if (!chain?.blockExplorer) return;
    const url = chain.blockExplorer.replace(/\/+$/,"") + "/tx/" + tx;
    window.open(url, "_blank");
  };

  function useAsymptoticProgress(active: boolean, snapDone: boolean, cap = 92) {
    const [p, setP] = useState(0);          // 0..100
    const raf = useRef<number | null>(null);

    useEffect(() => {
      if (!active || snapDone) {
        if (snapDone) setP(100);
        return;
      }
      let progress = p;
      const start = performance.now();

      const step = (t: number) => {
        const elapsed = (t - start) / 1000; // s
        const target = cap * (1 - Math.exp(-1.2 * elapsed)); // 0..cap
        if (target > progress) {
          progress = Math.min(target, cap, progress + 1.35);
          setP(prev => (progress > prev ? progress : prev));
        }
        if (!snapDone && active) raf.current = requestAnimationFrame(step);
      };

      raf.current = requestAnimationFrame(step);
      return () => { if (raf.current) cancelAnimationFrame(raf.current); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, snapDone]);

    return Math.round(p);
  }

  // ==== render switch ====
  const showProgress = processing || step === "done" || !!srcTx;

  const topActive    = processing && !srcTx;
  const topDone      = !!srcTx;
  const topPercent   = useAsymptoticProgress(topActive, topDone, 92);

  const bottomActive = processing && !!srcTx && !dstTx;
  const bottomDone   = !!dstTx;
  const bottomPercent= useAsymptoticProgress(bottomActive, bottomDone, 94);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center p-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="absolute inset-0 bg-black/70"
            onClick={() => status === "loading" && step !== "done" ? null : onClose()} />
          <motion.div
            className="relative w-full max-w-[430px] rounded-2xl p-5 bg-[#040d0c] ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,.5)]"
            initial={{ scale: .96, y: -6, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}>

            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white/90 font-semibold">
                {showProgress ? "Confirm Bridge" : "Bridge"}
              </h3>
              <button className="text-[#c9d9e2]"
                onClick={() => status === "loading" && step !== "done" ? null : onClose()}>
                <X size={16}/>
              </button>
            </div>

            {showProgress ? (
              <VerticalProgressCard
                srcChain={srcChain}
                dstChain={dstChain}
                reactiveLogo={REACTIVE_LOGO}
                srcTx={srcTx}
                dstTx={dstTx}
                topDone={topDone}
                bottomDone={bottomDone}
                topPercent={topPercent}
                bottomPercent={bottomPercent}
                onOpenExplorer={openInExplorer}
                error={error}
                done={step === "done"}
                onClose={onClose}
              />
            ) : (
              <UniCard
                srcChain={srcChain}
                dstChain={dstChain}
                amountIn={bridge.amountIn ?? "-"}
                amountOut={bridge.amountOut.toFixedTruncate(6) ?? "-"}
                srcValueUSD={bridge.srcValueUsd ?? 0}
                dstValueUSD={bridge.dstValueUsd ?? 0}
                srcToken={bridge.srcTokenMeta!}
                dstToken={bridge.dstTokenMeta!}
                error={error}
                step={step}
                status={status}
                onPrimary={onPrimary}
                onClose={onClose}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================== SUB-COMPONENTS ================== */

function UniCard({
  srcChain, dstChain, amountIn, amountOut, srcToken, dstToken, srcValueUSD, dstValueUSD, error, step, status, onPrimary, onClose
}:{
  srcChain?: ChainConfig; dstChain?:ChainConfig; amountIn:string; amountOut:number; srcToken: TokenConfig; dstToken: TokenConfig;
  srcValueUSD: number, dstValueUSD: number, error:string|null; step:Step; status:Status; onPrimary:()=>void; onClose:()=>void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col rounded-2xl gap-2 p-5">

        {/* FROM */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/90 text-[20px] font-semibold">{amountIn} {srcToken?.symbol ?? "Token"}</p>
            <p className="text-white/80 text-[14px]">{srcValueUSD?.toFixed(2) ? "$" + srcValueUSD?.toFixed(2) : "-"}</p>
          </div>
          <div className="flex -space-x-2">
            <ChainAvatar logo={srcChain?.icon} label={srcChain?.name ?? "SRC"} />
            <ChainAvatar logo={srcToken?.icon} label={srcToken?.name ?? "TOKEN"} />
          </div>
        </div>

        {/* ARROW */}
        <div className="flex my-2">
          <ArrowDownIcon className="text-white/30" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/90 text-[20px] font-semibold">{amountOut} {dstToken?.symbol ?? "Token"}</p>
            <p className="text-white/80 text-[14px]">{dstValueUSD?.toFixed(2) ? "$" + dstValueUSD?.toFixed(2) : "-"}</p>
          </div>
          <div className="flex -space-x-2">
            <ChainAvatar logo={dstChain?.icon} label={dstChain?.name ?? "SRC"} />
            <ChainAvatar logo={dstToken?.icon} label={dstToken?.name ?? "TOKEN"} />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-[13px] text-[#fbe9e9] bg-[rgba(60,16,16,.6)] ring-1 ring-[rgba(180,60,60,.45)] rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid gap-2">
        <PrimaryBtn
          label={step === "approve" ? "Approve Tokens" : step === "permit" ? "Sign Permit2" : "Bridge"}
          icon={step === "approve" ? <ShieldCheck size={16}/> : step === "bridge" ? <Send size={16}/> : <Check size={16}/> }
          loading={status === "loading"}
          onClick={onPrimary}
        />
        <button
          className="rounded-md px-3 py-2 text-sm text-[rgb(188,208,218)] hover:text-white hover:bg-white/5"
          disabled={status === "loading"}
          onClick={() => status === "loading" ? null : onClose()}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function VerticalProgressCard({
  srcChain, dstChain, reactiveLogo, srcTx, dstTx, topDone, topPercent, bottomDone, bottomPercent, onOpenExplorer, error, done, onClose
}:{
  srcChain:any; dstChain:any; reactiveLogo:string;
  srcTx:`0x${string}`|null; dstTx:`0x${string}`|null;
  topDone:boolean; topPercent:number; bottomDone:boolean; bottomPercent:number;
  onOpenExplorer:(tx:`0x${string}`, isSrc:boolean)=>void;
  error:string|null; done:boolean; onClose:()=>void;
}) {
  return (
    <div className="grid grid-rows-[1fr_auto] gap-6 pt-4">
      {/* LEFT */}
      <div className="flex items-center justify-center">
        <div className="flex flex-col items-start justify-items-center gap-4 min-h-[230px]">
          {/* top logo */}
          {/* vertical segment 1 */}
          <div className="relative flex gap-6">
            <ChainAvatar logo={srcChain?.icon} label={srcChain?.name ?? "SRC"} />
            <p className="absolute text-white/90 font-medium top-11">{srcChain?.name ?? "SRC"}</p>
            <div className="absolute text-white/70 top-18 items-center flex gap-2">
              <p>Tx Hash:</p> 
              { srcTx ? (
                <p className="cursor-pointer text-[#0EEBC6]" onClick={() => onOpenExplorer(srcTx, true)}>
                  {shortHash(srcTx)}
                </p>
              ) : (
                <LoaderRing />
              )}
            </div>
            <CurvedProgressXY
              className="mt-5 mr-5"
              percent={topDone ? 100 : topPercent}
              variant="top"
              x={260}
              y={20}
              r={16}
            />
          </div>
          {/* middle reactive */}
          <div className="flex w-full justify-end font-inter gap-6">
            <Image src={reactiveLogo} alt="Reactive" height={40} width={40} className="rounded-full ring-1 ring-white/10" />
          </div>
          {/* vertical segment 2 */}
          <div className="relative flex gap-6 items-end">
            <ChainAvatar logo={dstChain?.icon} label={dstChain?.name ?? "DST"} />
            <p className="absolute text-white/70 font-medium top-11">{dstChain?.name ?? "DST"}</p>
            <div className="absolute text-white/70 top-18 items-center flex gap-2">
              <p>Tx Hash:</p> 
              { dstTx ? (
                <p className="cursor-pointer text-[#0EEBC6]" onClick={() => onOpenExplorer(dstTx, false)}>
                  {shortHash(dstTx)}
                </p>
              ) : (
                <LoaderRing />
              )}
            </div>
            <CurvedProgressXY
              className="mb-5 mr-5"
              percent={bottomDone ? 100 : bottomPercent}
              variant="bottom"
              x={260}
              y={20}
              r={16}
            />
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex flex-col justify-center gap-5 min-w-[280px]">

        {error && (
          <div className="text-[13px] text-[#fbe9e9] bg-[rgba(60,16,16,.6)] ring-1 ring-[rgba(180,60,60,.45)] rounded-md px-3">
            {error}
          </div>
        )}

        <div className="grid gap-2">
          <PrimaryBtn
            label={done ? "Close" : "Processing…"}
            icon={done ? <Check size={16}/> : <Send size={16}/>}
            loading={!done}
            onClick={done ? onClose : () => {}}
          />
          {!done && (
            <button
              className="rounded-md px-3 py-2 text-sm text-[rgb(188,208,218)] hover:text-white hover:bg-white/5"
              onClick={onClose}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChainAvatar({ logo, label }:{ logo?: string; label: string }) {
  if (logo) {
    return (
      <div className="h-10 w-10 relative rounded-full overflow-hidden ring-1 ring-white/10 shadow-[0_8px_24px_rgba(0,0,0,.35)]">
        <Image src={logo} alt={label} fill sizes="32px" className="object-cover" />
      </div>
    );
  }
  const mono = (label ?? "?").slice(0,2).toUpperCase();
  return (
    <div className="h-12 w-12 rounded-full grid place-items-center bg-white/5 ring-1 ring-white/10 text-white/80 text-sm font-semibold">
      {mono}
    </div>
  );
}

/* ====== tiny UI helpers ====== */
function shortHash(h: `0x${string}`) { return `${h.slice(0,12)}…${h.slice(-6)}`; }

function PrimaryBtn({ label, icon, loading, onClick }:{
  label:string; icon:React.ReactNode; loading?:boolean; onClick:()=>void;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className="relative inline-flex w-full h-[46px] items-center justify-center rounded-lg px-3 py-2 text-[15px] font-semibold text-[#031417]
                 bg-[linear-gradient(135deg,rgba(14,235,198,.95),rgba(12,161,154,.82),rgba(14,235,198,.95))]
                 shadow-[0_12px_36px_rgba(14,235,198,.18),inset_0_0_0_1px_rgba(14,235,198,.28)] overflow-hidden cursor-pointer gap-2">
      <span className="relative z-10 inline-flex items-center gap-2">{loading ? <LoaderRing color="black/5" /> : icon}{label}</span>
    </button>
  );
}

function CurvedProgressXY({
  percent,
  className = "",
  variant = "top",
  x = 180, y = 84, r = 16, strokeWidth = 4,
}: {
  percent: number;
  className?: string;
  variant?: "top" | "bottom";
  x?: number; y?: number; r?: number; strokeWidth?: number;
}) {
  const trackRef = useRef<SVGPathElement | null>(null);
  const [len, setLen] = useState(0);
  const gradId = useId();

  const p  = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const rr = Math.max(0, Math.min(r, Math.floor(Math.min(x, y) / 2)));

  const d =
    variant === "top"
      ? `M 0 0 L ${x - rr} 0 Q ${x} 0 ${x} ${rr} L ${x} ${y}`
      : `M ${x} 0 L ${x} ${y - rr} Q ${x} ${y} ${x - rr} ${y} L 0 ${y}`;

  useLayoutEffect(() => {
    const af = requestAnimationFrame(() => {
      if (trackRef.current) {
        const L = trackRef.current.getTotalLength();
        if (Number.isFinite(L) && L > 0) setLen(L);
      }
    });
    return () => cancelAnimationFrame(af);
  }, [d, strokeWidth]);

  const dash   = len || 1;
  const offset = dash * (1 - p / 100);

  const progKey = `${variant}-${x}-${y}-${dash.toFixed(2)}`;

  return (
    <svg width={x} height={y} viewBox={`0 0 ${x} ${y}`} className={`overflow-visible ${className}`}>
      {/* Track */}
      <path
        ref={trackRef}
        d={d}
        fill="none"
        stroke="rgba(17,74,102,.28)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* Progress */}
      {len > 0 && (
        <motion.path
          key={progKey}
          d={d}
          fill="none"
          stroke={`url(#grad-${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{
            strokeDasharray: `${dash} ${dash}`,
            filter: "drop-shadow(0 6px 14px rgba(14,235,198,.25))",
          }}
          initial={{ strokeDashoffset: dash }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "tween", duration: 0.5, ease: [0.45,0.05,0.55,0.95] }}
        />
      )}

      <defs>
        <linearGradient id={`grad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0EEBC6" />
          <stop offset="60%" stopColor="#0ec3b5" />
          <stop offset="100%" stopColor="#0EEBC6" />
        </linearGradient>
      </defs>
    </svg>
  );
}