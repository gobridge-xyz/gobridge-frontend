"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Info, WalletIcon } from "lucide-react";
import { useWalletData } from "@/providers/WalletDataProvider";
import { usePSM } from "@/providers/PSMProvider";
import { useSwitchChain } from "wagmi";
import MintRedeemModal from "../modals/MintRedeemModal";
import Image from "next/image";

/* ------------------- Config ------------------- */
const UNI_POOLS = [
  {
    chainId: 8453,
    chainName: "Base",
    chainIcon: "/chains/base.png",
    pair: "goUSD / WETH",
    apr: "1.55%",
    tvlUsd: "-",
    feeTier: "0.05%",
    addUrl: "https://app.uniswap.org/explore/pools/base/0x41463f059347F8802c8B57a17d1470A3344bc7C0",
  },
  {
    chainId: 1,
    chainName: "Ethereum",
    chainIcon: "/chains/ethereum.png",
    pair: "goUSD / WETH",
    apr: "8.4%",
    tvlUsd: "-",
    feeTier: "0.05%",
    addUrl: "https://app.uniswap.org/explore/pools/ethereum/0x92Eda77ba708C2ef6564701Efec6dd9cFFCc9382",
  },
  {
    chainId: 42161,
    chainName: "Arbitrum",
    chainIcon: "/chains/arbitrum-one.png",
    pair: "goUSD / WETH",
    apr: "1.57%",
    tvlUsd: "-",
    feeTier: "0.05%",
    addUrl: "https://app.uniswap.org/explore/pools/arbitrum/0xA4A4e140Af40b02F3395c5DdE8c41a5F9DDFA0D3",
  },
] as const;

/* ------------------- Helpers ------------------- */
const AMOUNT_RE = /^$|^\d+(\.\d{0,18})?$|^\.(\d{0,18})?$/;
function nextAmount(raw: string) {
  const v = raw.replace(",", ".");
  return AMOUNT_RE.test(v) ? v : null;
}

/* ------------------- View ------------------- */
export default function GoUSDView() {
  const wallet = useWalletData();
  const PSM = usePSM();
  const { switchChain } = useSwitchChain();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    switchChain({ chainId: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stable = PSM.fromTokenMeta!;

  const canSubmit = Number(PSM.amountInRaw) > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-[1050px] w-full px-5 py-8"
    >
      {/* Modal */}
      <MintRedeemModal open={open} onClose={() => setOpen(false)} />

      {/* INFO - compact, English */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-xl p-4 mb-6 flex items-start gap-3"
        style={{
          background: "linear-gradient(180deg, rgba(8,28,30,0.8) 0%, rgba(6,20,22,0.8) 100%)",
          boxShadow: "inset 0 0 0 1px rgba(17,74,102,.25), 0 20px 60px rgba(0,0,0,.35)",
        }}
      >
        <div className="shrink-0 grid place-items-center rounded-lg h-8 w-8"
             style={{ background: "rgba(14,235,198,0.1)", boxShadow: "inset 0 0 0 1px rgba(14,235,198,.25)" }}>
          <Info className="h-4 w-4 text-[#0EEBC6]" />
        </div>
        <div className="text-[13px] leading-5 text-[rgb(188,208,218)]">
          <p><span className="text-white/90 font-semibold">goUSD</span> is the settlement layer of <span className="text-white/90">goBridge</span>. It routes value across chains efficiently and reliably.</p>
          <p className="mt-1">Mint and redeem maintain peg strength through on-chain liquidity and organic usage; conversions are straightforward and available at any time.</p>
          <p className="mt-1">Uniswap pools on Arbitrum, Base and Ethereum back swaps/bridges and provide sustainable yields for LPs.</p>
        </div>
      </motion.div>
      
      {/* GRID: Left=Pools (fixed 3), Right=Mint/Redeem */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* LEFT — Pools */}
        <div
          className="rounded-2xl p-4 flex flex-col"          // <-- flex column
          style={{
            backgroundColor: "rgba(4,13,12,0.9)",
            boxShadow: "inset 0 0 0 1px rgba(17,74,102,.28), 0 30px 120px rgba(0,0,0,.35)",
          }}
        >
          <h3 className="text-white/90 font-semibold mb-3">Uniswap Pools</h3>

          <div className="grid grid-rows-3 auto-rows-fr gap-3 flex-1 h-full">
            {UNI_POOLS.map((p) => (
              <a
                key={`${p.chainId}-${p.pair}`}
                href={p.addUrl}
                target="_blank"
                rel="noreferrer"
                className="h-full rounded-xl px-3 py-3 cursor-pointer group
                          flex items-center justify-between"
                style={{
                  backgroundColor: "rgba(7,16,20,0.36)",
                  boxShadow: "inset 0 0 0 1px rgba(17,74,102,.22)",
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Image src={p.chainIcon} alt={p.chainName} height={24} width={24} className="rounded-full" />
                  <div className="min-w-0">
                    <div className="text-white/90 font-medium leading-[1.15]">{p.pair}</div>
                    <div className="text-[12px] text-white/60">{p.chainName} • Fee {p.feeTier}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Chip label="APR" value={p.apr} />
                  <Chip label="TVL" value={p.tvlUsd} />
                  <div className="hidden sm:flex items-center gap-1 text-[#0EEBC6] text-[13px] font-medium opacity-0 group-hover:opacity-100 transition">
                    Add <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M12 5v14m-7-7h14"/></svg>
                  </div>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/50 group-hover:text-white/80 transition">
                    <path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"/><path fill="currentColor" d="M5 5h5v2H7v10h10v-3h2v5H5z"/>
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
        {/* RIGHT — Mint/Redeem */}
        <div
          className="rounded-2xl p-4 flex flex-col"
          style={{
            backgroundColor: "rgba(4,13,12,0.9)",
            boxShadow: "inset 0 0 0 1px rgba(17,74,102,.28), 0 30px 120px rgba(0,0,0,.35)",
          }}
        >
          {/* Toggle bar (not two obvious buttons) */}
          <div className="relative w-full h-10 rounded-lg bg-black/25 ring-1 ring-white/10 overflow-hidden">
            <motion.div
              className="absolute top-0 bottom-0 rounded-md"
              style={{ left: 2, right: "50%" }}
              animate={{ left: PSM.mode === "mint" ? 0 : "50%", right: PSM.mode === "mint" ? "50%" : 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="h-full w-full rounded-md"
                style={{
                  background: "linear-gradient(180deg, rgba(14,235,198,0.95) 0%, rgba(12,161,154,0.82) 100%)",
                  boxShadow: "inset 0 0 0 1px rgba(14,235,198,0.28)",
                }}
              />
            </motion.div>
            <div className="relative grid grid-cols-2 h-full">
              <button
                className={`text-[13px] font-semibold cursor-pointer ${PSM.mode === "mint" ? "text-[#031417]" : "text-white/80"}`}
                onClick={() => PSM.setMode("mint")}
              >
                Mint
              </button>
              <button
                className={`text-[13px] font-semibold cursor-pointer ${PSM.mode === "redeem" ? "text-[#031417]" : "text-white/80"}`}
                onClick={() => PSM.setMode("redeem")}
              >
                Redeem
              </button>
            </div>
          </div>

          {/* Stable selector — icon pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {PSM.STABLES.map((t) => (
              <button
                key={t.symbol}
                onClick={() => PSM.mode === "mint" ? PSM.setFromToken(t.tokenAddress) : PSM.setToToken(t.tokenAddress)}
                className={`flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] transition font-semibold cursor-pointer ${
                  (PSM.mode === "mint" ? PSM.fromToken === t.tokenAddress : PSM.toToken === t.tokenAddress) ? "text-[#031417]" : "text-white/85"
                }`}
                style={{
                  background:
                    (PSM.mode === "mint"
                      ? PSM.fromToken.toLowerCase() === t.tokenAddress.toLowerCase()
                      : PSM.toToken.toLowerCase() === t.tokenAddress.toLowerCase())
                      ? "linear-gradient(180deg, rgba(14,235,198,0.95) 0%, rgba(12,161,154,0.82) 100%)"
                      : "rgba(7,16,20,0.36)",
                  boxShadow:
                    (PSM.mode === "mint"
                      ? PSM.fromToken.toLowerCase() === t.tokenAddress.toLowerCase()
                      : PSM.toToken.toLowerCase() === t.tokenAddress.toLowerCase())
                      ? "inset 0 0 0 1px rgba(14,235,198,0.28)"
                      : "inset 0 0 0 1px rgba(17,74,102,.22)",
                }}
              >
                <Image src={t.icon!} alt={t.symbol} height={16} width={16} className="rounded-full" />
                {t.symbol}
              </button>
            ))}
          </div>

          {/* Amount card */}
          <div
            className="mt-3 rounded-xl p-3"
            style={{
              backgroundColor: "rgba(5,7,9,0.8)",
              boxShadow: "inset 0 0 0 1px rgba(24,109,92,.45), 0 8px 24px rgba(14,235,198,0.08)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[#5c5e62] text-[13px] font-medium">
                {PSM.mode === "mint" ? "You deposit" : "You redeem"}
              </span>
              <div className="flex items-center gap-2 text-[#5c5e62] text-[12px]">
                <p
                  className="text-[#53c7a8] text-[13px] font-bold font-inter leading-[10px] cursor-pointer select-none"
                  onClick={() => {
                    if (!wallet.connected || !PSM.fromBalance || !wallet.isReady) return;
                    PSM.setAmountIn(Number(PSM.fromBalance.formatted).toFixedTruncate(10).toString());
                  }}
                >
                  MAX
                </p>
                <WalletIcon className="size-4 text-[#5c5e62] ml-3 mr-1 leading-[5px]" />
                <p className="text-[#5c5e62] text-[14px] font-semibold font-inter leading-[10px]">
                  {Number(PSM.fromBalance?.formatted).toFixedTruncate(6).toString()}
                </p>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <Image src={PSM.mode === "mint" ? PSM.fromTokenMeta!.icon! : PSM.goUSDTokenMeta.icon!} height={28} width={28} className="rounded-full" alt="" />
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={PSM.amountIn}
                onChange={(e) => {
                  if (!wallet.connected || !PSM.fromBalance || !wallet.isReady) return;
                  const v = nextAmount(e.target.value);
                  if (v !== null) PSM.setAmountIn(v);
                }}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                className="flex-1 bg-transparent outline-none text-white/90 font-semibold text-[26px] tracking-[-0.02em] [font-variant-numeric:tabular-nums]"
                placeholder="0"
              />
              <span className="text-white/75 font-semibold">
                {PSM.mode === "mint" ? PSM.fromTokenMeta?.symbol : PSM.goUSDTokenMeta.symbol}
              </span>
            </div>
          </div>

          {/* Receive (estimated) */}
          <div className="rounded-xl p-3 bg-black/25 ring-1 ring-white/5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[#5c5e62] text-[13px] font-medium">Estimated receive</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Image src={PSM.toTokenMeta!.icon!} height={24} width={24} className="rounded-full" alt="" />
              <div className="text-white/90 font-semibold text-[22px] [font-variant-numeric:tabular-nums]">
                {PSM.amountOut} {PSM.toTokenMeta!.symbol}
              </div>
            </div>
            <p className="text-[12px] text-white/45 mt-1">Network fee may apply.</p>
          </div>

          {/* Submit */}
          <button
            disabled={!canSubmit}
            onClick={() => setOpen(true)}
            className="relative inline-flex w-full h-[48px] items-center justify-center rounded-lg mt-3 px-3 py-2 text-[15px] font-semibold text-[#031417] cursor-pointer overflow-hidden select-none group focus:outline-none disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, rgba(14,235,198,0.95) 0%, rgba(12,161,154,0.82) 50%, rgba(14,235,198,0.95) 100%)",
              backgroundSize: "180% 180%",
              boxShadow: "0 12px 36px rgba(14,235,198,0.18), inset 0 0 0 1px rgba(14,235,198,0.28)",
              transition: "transform 120ms ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(0.5px) scale(0.995)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0) scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0) scale(1)")}
          >
            {PSM.mode === "mint" ? "Mint goUSD" : `Redeem to ${stable.symbol}`}
          </button>
        </div>
      </div>
    </motion.section>
  );
}

/* ------------------- Tiny bits ------------------- */
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1 rounded-md text-[12px]"
         style={{ backgroundColor: "rgba(7,16,20,0.36)", boxShadow: "inset 0 0 0 1px rgba(17,74,102,.22)" }}>
      <span className="text-white/55 mr-1">{label}</span>
      <span className="text-white/90 font-semibold">{value}</span>
    </div>
  );
}