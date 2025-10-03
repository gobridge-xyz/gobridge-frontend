"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ShieldCheck, Send, Check } from "lucide-react";
import { usePSM } from "@/providers/PSMProvider";
import { PSM_ADDRESS, useWithPSM } from "../hooks/useWithPSM";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { LoaderRing } from "../LoaderRing";
import { useWalletData } from "@/providers/WalletDataProvider";
import { usePublicClientByChain } from "@/libs/publicClients";

const ERC20_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

type Step = "approve" | "action" | "done";
type Status = "idle" | "loading" | "success" | "error";

export default function MintRedeemModal({ open, onClose }: Props) {
  const PSM = usePSM();
  const wallet = useWalletData();
  const getPc = usePublicClientByChain();

  const { mintApprove, mintGOUSD, redeemApprove, redeemGOUSD } = useWithPSM();

  const isMint = PSM.mode === "mint";
  const title  = isMint ? "Mint goUSD" : "Redeem goUSD";

  // UI state
  const [step, setStep]       = useState<Step>("approve");
  const [status, setStatus]   = useState<Status>("idle");
  const [error, setError]     = useState<string | null>(null);
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null);
  const [actionHash, setActionHash]   = useState<`0x${string}` | null>(null);
  const [completed, setCompleted] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    amountIn: string;
    amountOut: string;
    fromSym: string;
    toSym: string;
    fromUsd: number;
    toUsd: number;
    fromIcon?: string;
    toIcon?: string;
  } | null>(null);

  /* ---------- explorer helper ---------- */
  const explorerBase = (PSM.chain as any)?.blockExplorer as string | undefined;
  const openInExplorer = (hash: `0x${string}`) => {
    if (!explorerBase) return;
    const url = `${explorerBase.replace(/\/+$/,"")}/tx/${hash}`;
    window.open(url, "_blank");
  };

  /* ---------- allowance kontrolü ---------- */
  useEffect(() => {
    if (!open) return;
    setStep("approve");
    setStatus("idle");
    setError(null);
    setApproveHash(null);
    setActionHash(null);
    PSM.setNeedsApprove(false);
    setCompleted(false);
    
    setSnapshot({
      amountIn: PSM.amountIn,
      amountOut: PSM.amountOut,
      fromSym: isMint ? (PSM.fromTokenMeta?.symbol ?? "-") : "goUSD",
      toSym:   isMint ? "goUSD" : (PSM.toTokenMeta?.symbol ?? "-"),
      fromUsd: PSM.fromValueUsd ?? 0,
      toUsd:   PSM.toValueUsd ?? 0,
      fromIcon: isMint ? PSM.fromTokenMeta?.icon : PSM.goUSDTokenMeta?.icon,
      toIcon:   isMint ? PSM.goUSDTokenMeta?.icon : PSM.toTokenMeta?.icon,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMint]);

  useEffect(() => {
    (async () => {
      try {
        if (!open) return;
        if (completed) return;
        if (step === "done") return;
        if (!wallet.address || !wallet.connected || !wallet.isReady) return;
        if (!PSM.amountInRaw || PSM.amountInRaw === 0n) return;

        const chainId = PSM.chain!.chainId;
        const pc = getPc(chainId);
        const owner = wallet.address;
        const spender = PSM_ADDRESS;

        const token = isMint
          ? (PSM.fromTokenMeta?.tokenAddress as `0x${string}` | undefined)
          : (PSM.goUSDTokenMeta?.tokenAddress as `0x${string}` | undefined);
        if (!token) return;

        const current: bigint = await pc.readContract({
          abi: ERC20_ABI, address: token, functionName: "allowance",
          args: [owner, spender],
        });

        const need = current < (PSM.amountInRaw ?? 0n);
        PSM.setNeedsApprove(need);
        setStep(need ? "approve" : "action");
      } catch {
        PSM.setNeedsApprove(true);
        setStep("approve");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open, completed, step, isMint, PSM.chain,
    wallet.address, wallet.connected, wallet.isReady,
    PSM.amountInRaw, PSM.amountIn, PSM.chain?.chainId,
    PSM.fromTokenMeta?.tokenAddress, PSM.goUSDTokenMeta?.tokenAddress,
    PSM.fromTokenMeta?.icon, PSM.goUSDTokenMeta?.symbol, PSM.fromValueUsd,
    PSM.goUSDTokenMeta?.icon, PSM.toTokenMeta?.icon, PSM.toValueUsd,
    getPc,
  ]);

  async function handleApprove() {
    setStatus("loading");
    setError(null);
    try {
      const res = isMint ? await mintApprove() : await redeemApprove();
      if (!res.ok) throw new Error("Approve failed");
      if (res.hash) setApproveHash(res.hash);
      setStatus("success");
      console.log("heytttttttttttt");
      setTimeout(() => { setStatus("idle"); setStep("action"); }, 250);
    } catch (err: any) {
      setStatus("error");
      setError(readableError(err));
    }
  }

  async function handleAction() {
    setStatus("loading");
    setError(null);
    try {
      const res = isMint ? await mintGOUSD() : await redeemGOUSD();
      if (!res.ok) throw new Error(res.message ? res.message : isMint ? "Mint failed" : "Redeem failed");
      if (res.hash) setActionHash(res.hash);

      await wallet.refresh();

      try {
        PSM.setAmountIn("0");
        PSM.setAmountOut(0);
      } catch {}

      setCompleted(true); 
      setStatus("success");
      setStep("done");
      await wallet.refresh();
    } catch (err: any) {
      setStatus("error");
      setError(readableError(err));
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center p-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button
            className="absolute inset-0 bg-black/70"
            onClick={() => status === "loading" && step !== "done" ? null : onClose()}
          />
          <motion.div
            className="relative w-full max-w-[430px] rounded-2xl p-5 bg-[#040d0c] ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,.5)]"
            initial={{ scale: .96, y: -6, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white/90 font-semibold">{title}</h3>
              <button
                className="text-[#c9d9e2] cursor-pointer"
                onClick={() => status === "loading" && step !== "done" ? null : onClose()}
              >
                <X size={16}/>
              </button>
            </div>

            {/* body */}
            <div className="space-y-4">
              <SummaryCard
                amountIn={snapshot?.amountIn ?? PSM.amountIn}
                amountOut={snapshot?.amountOut ?? PSM.amountOut}
                fromSym={snapshot?.fromSym ?? (isMint ? PSM.fromTokenMeta?.symbol ?? "-" : "goUSD")}
                toSym={snapshot?.toSym ?? (isMint ? "goUSD" : PSM.toTokenMeta?.symbol ?? "-")}
                fromUsd={snapshot?.fromUsd ?? (PSM.fromValueUsd ?? 0)}
                toUsd={snapshot?.toUsd ?? (PSM.toValueUsd ?? 0)}
                fromIcon={snapshot?.fromIcon ?? (isMint ? PSM.fromTokenMeta?.icon : PSM.goUSDTokenMeta?.icon)}
                toIcon={snapshot?.toIcon ?? (isMint ? PSM.goUSDTokenMeta?.icon : PSM.toTokenMeta?.icon)}
              />

              {/* tx hashes (clickable) */}
              {(approveHash || actionHash) && (
                <div className="rounded-md bg-white/5 ring-1 ring-white/10 p-3 space-y-2 text-[13px]">
                  {approveHash && (
                    <button
                      type="button"
                      className="w-full text-left hover:text-[#0EEBC6] cursor-pointer"
                      onClick={() => openInExplorer(approveHash)}
                    >
                      <Row k="Approve Tx" v={shortHash(approveHash)} />
                    </button>
                  )}
                  {actionHash && (
                    <button
                      type="button"
                      className="w-full text-left hover:text-[#0EEBC6] cursor-pointer"
                      onClick={() => openInExplorer(actionHash)}
                    >
                      <Row k={isMint ? "Mint Tx" : "Redeem Tx"} v={shortHash(actionHash)} />
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="text-[13px] text-[#fbe9e9] bg-[rgba(60,16,16,.6)] ring-1 ring-[rgba(180,60,60,.45)] rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <div className="grid gap-2">
                {step === "approve" && (
                  <PrimaryBtn
                    label="Approve"
                    icon={<ShieldCheck size={16}/>}
                    loading={status === "loading"}
                    onClick={handleApprove}
                  />
                )}

                {step === "action" && (
                  <PrimaryBtn
                    label={isMint ? "Mint" : "Redeem"}
                    icon={<Send size={16}/>}
                    loading={status === "loading"}
                    onClick={handleAction}
                  />
                )}

                {step === "done" && (
                  <PrimaryBtn
                    label="Close"
                    icon={<Check size={16}/>}
                    onClick={onClose}
                  />
                )}

                {step !== "done" && (
                  <button
                    className="rounded-md px-3 py-2 text-sm text-[rgb(188,208,218)] hover:text-white hover:bg-white/5"
                    disabled={status === "loading"}
                    onClick={() => status === "loading" ? null : onClose()}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================== SUB-COMPONENTS ================== */

function SummaryCard({
  amountIn, amountOut, fromSym, toSym, fromUsd, toUsd, fromIcon, toIcon
}:{
  amountIn: string;
  amountOut: string;
  fromSym: string;
  toSym: string;
  fromUsd: number;
  toUsd: number;
  fromIcon?: string;
  toIcon?: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl gap-3 p-5">
      {/* FROM */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TokenAvatar icon={fromIcon} symbol={fromSym} />
          <div>
            <p className="text-white/90 text-[20px] font-semibold">
              {amountIn} {fromSym}
            </p>
            <p className="text-white/80 text-[14px]">{fmtUsd(fromUsd)}</p>
          </div>
        </div>
      </div>

      <div className="flex my-1">
        <div className="h-[1px] w-full bg-white/10" />
      </div>

      {/* TO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TokenAvatar icon={toIcon} symbol={toSym} />
          <div>
            <p className="text-white/90 text-[20px] font-semibold">
              {amountOut} {toSym}
            </p>
            <p className="text-white/80 text-[14px]">{fmtUsd(toUsd)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TokenAvatar({ icon, symbol }: { icon?: string; symbol?: string }) {
  if (icon) {
    return (
      <div className="h-9 w-9 rounded-full overflow-hidden ring-1 ring-white/10 shadow-[0_8px_24px_rgba(0,0,0,.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt={symbol ?? "token"} className="h-full w-full object-cover" />
      </div>
    );
  }
  const mono = (symbol ?? "?").slice(0,2).toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full grid place-items-center bg-white/5 ring-1 ring-white/10 text-white/80 text-xs font-semibold">
      {mono}
    </div>
  );
}

function Row({ k, v }:{ k:string; v:string }) {
  return (
    <div className="flex items-center justify-between text-[13px] text-white/70">
      <span>{k}</span>
      <span className="text-white/90">{v}</span>
    </div>
  );
}

function PrimaryBtn({ label, icon, loading, onClick }:{
  label:string; icon:React.ReactNode; loading?:boolean; onClick:()=>void;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className="relative inline-flex w-full h-[46px] items-center justify-center rounded-lg px-3 py-2 text-[15px] font-semibold text-[#031417]
                 bg-[linear-gradient(135deg,rgba(14,235,198,.95),rgba(12,161,154,.82),rgba(14,235,198,.95))]
                 shadow-[0_12px_36px_rgba(14,235,198,.18),inset_0_0_0_1px_rgba(14,235,198,.28)] overflow-hidden cursor-pointer gap-2">
      <span className="relative z-10 inline-flex items-center gap-2">
        {loading ? <LoaderRing color="black/5" /> : icon}{label}
      </span>
    </button>
  );
}

/* utils */
function shortHash(h: `0x${string}`) { return `${h.slice(0,10)}…${h.slice(-6)}`; }
function fmtUsd(v?: number) {
  if (!Number.isFinite(v)) return "-";
  return "$" + v!.toFixed(2);
}
function readableError(err: unknown) {
  if (err instanceof BaseError) {
    const rev = err.walk?.((e) => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | undefined;
    if (rev?.reason) return rev.reason;
    if (rev?.signature) return rev.signature;
    return err.shortMessage || "Transaction reverted";
  }
  return (err as any)?.message ?? "Transaction failed";
}
