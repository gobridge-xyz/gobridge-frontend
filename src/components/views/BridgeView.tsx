"use client";
import { ArrowDownUpIcon, WalletIcon } from "lucide-react";
import GasInfo from "@/components/GasInfo";
import AssetPicker from "@/components/AssetPicker";
import BridgeButton from "../buttons/BridgeButton";
import { useWalletData } from "@/providers/WalletDataProvider";
import { useBridge } from "@/providers/BridgeProvider";
import { motion, useAnimationControls } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { LoaderRing } from "../LoaderRing";
import { useSwitchChain } from "wagmi";

const AMOUNT_RE = /^$|^\d+(\.\d{0,10})?$|^\.(\d{0,10})?$/;

export default function BridgeView() {
  const wallet = useWalletData();
  const bridge = useBridge();
  const { switchChain } = useSwitchChain();

  // --- ANIM controls & refs ---
  const sendCtr = useAnimationControls();
  const getCtr = useAnimationControls();
  const sendRef = useRef<HTMLDivElement>(null);
  const getRef = useRef<HTMLDivElement>(null);
  const [rot, setRot] = useState(0);

  function nextAmount(raw: string) {
    const v = raw.replace(",", ".");
    return AMOUNT_RE.test(v) ? v : null;
  }

  const diffPct = bridge.srcValueUsd && bridge.srcValueUsd > 0 && bridge.dstValueUsd ? ((bridge.dstValueUsd - bridge.srcValueUsd) / bridge.srcValueUsd) * 100 : 0;

  const playSwapAnim = async () => {
    if (!sendRef.current || !getRef.current) return bridge.swapSides();
    setRot((r) => r + 180);

    const timing = { times: [0, 0.5, 1], duration: 0.5, ease: [0.16, 0.5, 0.3, 1] as any };
    sendCtr.start({ y: [0, 3, 0], transition: timing });
    getCtr.start({ y: [0, -3, 0], transition: timing });

    setTimeout(() => {
      switchChain({ chainId: bridge.dstChainId });
      bridge.swapSides();
    }, 250);
  };

  useEffect(() => {
    switchChain({ chainId: bridge.srcChainId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <section className="flex flex-col mx-auto w-full max-w-[400px] sm:max-w-[500px] gap-2">
      <div className="flex items-center justify-between gap-3 h-10">
        {/* Left: marquee message */}
        <p className="whitespace-nowrap text-[12px] font-medium text-[#c4c4c4]">GoBridge is in <b className="text-[#0EEBC6]">early</b> stage. Bridging is limited between <b className="text-[#0EEBC6]">$1</b> - <b className="text-[#0EEBC6]">$15</b>.</p>

        {/* Right: square refresh button (same height as container) */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => { wallet.refresh(); bridge.refreshQuote(); }}
          disabled={wallet.isReady === false}
          className="shrink-0 h-10 w-10 grid place-items-center border-2 border-[#122122] bg-[#051718]/60 rounded-md
                    hover:bg-white/[0.08] active:bg-white/[0.12] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer group"
          aria-label="Refresh"
          title="Refresh"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[white/90] group-active:rotate-90 transition-transform" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 8h5V3M21 12a9 9 0 11-3.2-6.9M21 4.8v4.5" />
          </svg>
        </motion.button>
      </div>
      <div className="mx-auto w-full max-w-[400px] sm:max-w-[500px] px-5 py-5 border-2 border-[#122122] bg-[#051718]/60 rounded-md">
        <div className="relative">
          {/* SWAP BUTTON */}
          <button
            className="absolute top-1/2 z-10 -translate-y-1/2 left-1/2 -translate-x-1/2 flex border border-[#122122] bg-[#050709] rounded-md py-3 px-3 w-min cursor-pointer group"
            onClick={playSwapAnim}
          >
            <motion.span
              animate={{ rotate: rot }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="grid place-items-center"
            >
              <ArrowDownUpIcon className="size-5 text-[#c4c4c4] group-hover:text-[#e0e0e0] transition" />
            </motion.span>
          </button>

          {/* YOU SEND */}
          <motion.div
            ref={sendRef}
            animate={sendCtr}
            className="flex-col items-center bg-[#050709]/80 w-full h-[120px] border-2 border-[#186d5c]/80 rounded-md py-3 px-4"
            style={{ boxShadow: "inset 0 0 0 1px rgba(14,235,198,0.18), 0 8px 24px rgba(14,235,198,0.10)" }}
          >
            <div className="flex justify-between w-full">
              <p className="text-[#5c5e62] text-[14px] font-semibold font-inter select-none">You send</p>
              <div className="flex items-center">
                <p
                  className="text-[#53c7a8] text-[13px] font-bold font-inter leading-[10px] cursor-pointer select-none"
                  onClick={() => {
                    if (!wallet.connected || !bridge.srcBalance || !wallet.isReady) return;
                    bridge.setAmountIn(Number(bridge.srcBalance.formatted).toFixedTruncate(10).toString());
                  }}
                >
                  MAX
                </p>
                <WalletIcon className="size-4 text-[#5c5e62] ml-3 mr-1 leading-[5px]" />
                <p className="text-[#5c5e62] text-[14px] font-semibold font-inter leading-[10px]">
                  {Number(bridge.srcBalance?.formatted).toFixedTruncate(6).toString()}
                </p>
              </div>
            </div>

            <div className="flex items-center w-full gap-2">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={bridge.amountIn}
                onChange={(e) => {
                  if (!wallet.connected || !bridge.srcBalance || !wallet.isReady) return;
                  const v = nextAmount(e.target.value);
                  if (v !== null) bridge.setAmountIn(v);
                }}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                className={`
                  flex-1 min-w-0
                  ${bridge.amountInRaw <= bridge.srcBalance!.raw ? "text-[#f0f0f0]" : "text-[#ff593c]"} font-inter font-bold
                  sm:text-[32px] text-[28px]
                  tracking-[-0.02em]
                  [font-variant-numeric:tabular-nums]
                  mt-1 outline-0 caret-[#0EEBC6]
                `}
                placeholder="0"
              />
              <AssetPicker srcOrdst="src" />
            </div>
            <div className="flex w-full justify-between">
              <p className="text-[#acadb1] text-[12px] font-semibold">~${bridge.srcValueUsd?.toFixed(2)}</p>
              <p className="text-[#5c5e62] text-[12px] font-inter font-semibold">{bridge.srcChain?.name.toUpperCase()}</p>
            </div>
          </motion.div>

          {/* YOU GET */}
          <motion.div
            ref={getRef}
            animate={getCtr}
            className="flex-col items-center bg-[#040d0c]/80 w-full h-[120px] rounded-md py-3 px-4 mt-2"
          >
            <div className="flex justify-between w-full">
              <p className="text-[#5c5e62] text-[14px] font-semibold font-inter">You get</p>
              <div className="flex items-center">
                <WalletIcon className="size-4 text-[#5c5e62] ml-3 mr-1 leading-[5px]" />
                <p className="text-[#5c5e62] text-[14px] font-semibold font-inter leading-[10px]">
                  {Number(bridge.dstBalance?.formatted).toFixedTruncate(6).toString()}
                </p>
              </div>
            </div>
            <div className="flex w-full items-center gap-2">
              <p className={`flex-1 min-w-0 ${bridge.amountOut ? "text-[#c5c5c5]" : "text-[#4d4d4d]"} font-inter font-bold text-[32px] mt-1`}>
                {bridge.loadingQuote ? <LoaderRing /> : Number(bridge.amountOut).toFixedTruncate(10).toString()}
              </p>
              <AssetPicker srcOrdst="dst" />
            </div>
            <div className="flex w-full justify-between">
              <p className="text-[#acadb1] text-[12px] font-semibold">
                ~${bridge.dstValueUsd?.toFixed(2)}{" "}
                <span className="text-[#a03838] ml-2">({diffPct.toFixed(2)}%)</span>
              </p>
              <p className="text-[#5c5e62] text-[12px] font-inter font-semibold">{bridge.dstChain?.name.toUpperCase()}</p>
            </div>
          </motion.div>
        </div>

        <GasInfo />
        <BridgeButton />
      </div>
    </section>
  );
}