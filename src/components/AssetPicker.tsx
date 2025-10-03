"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { ChainConfig, CHAINS_TOKENS } from "@/data/chains_tokens";
import { ChainTokenState, useWalletData } from "@/providers/WalletDataProvider";
import { useBridge } from "@/providers/BridgeProvider";
import { useSwitchChain } from "wagmi";
import Image from "next/image";

type Asset = { chain: ChainConfig; token: ChainTokenState };

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
const easeIn:  [number, number, number, number] = [0.4, 0, 1, 1];

const overlayV: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22, ease: easeOut } },
  exit:    { opacity: 0, transition: { duration: 0.18, ease: easeIn } },
};

const modalV: Variants = {
  hidden:  { opacity: 0, scale: 0.96, y: -8, filter: "blur(2px)" },
  visible: {
    opacity: 1, scale: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.24, ease: easeOut },
  },
  exit: {
    opacity: 0, scale: 0.97, y: -8, filter: "blur(2px)",
    transition: { duration: 0.18, ease: easeIn },
  },
};

const gridV: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const chipV: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible:{ opacity: 1, scale: 1, transition: { duration: 0.18, ease: easeOut } },
};

const liV: Variants = {
  hidden:  { opacity: 0, x: 12 },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: easeOut, delay: i * 0.1 },
  }),
  exit:     { opacity: 0, y: -6, transition: { duration: 0.12, ease: easeIn } },
};
  
/* ============ ASSET PICKER ============ */
export default function AssetPicker({ srcOrdst = "src"}: { srcOrdst?: "src" | "dst";}) {
  const bridge = useBridge();
  const wallet = useWalletData();
  const { switchChain } = useSwitchChain();

  const selectedChain = srcOrdst === "src" ? bridge.srcChain : bridge.dstChain;
  const selectedTokenAddr = srcOrdst === "src" ? bridge.srcToken : bridge.dstToken;

  const chainState = useMemo(
    () => wallet.chains.find((c) => c.chainId === selectedChain?.chainId),
    [wallet.chains, selectedChain?.chainId]
  );
  const selectedToken = useMemo(
    () => chainState?.tokens.find((t) => t.tokenAddress === selectedTokenAddr),
   [chainState?.tokens, selectedTokenAddr]
  );

  const [current, setCurrent] = useState<Asset | null>(() =>
    selectedChain && selectedToken ? { chain: selectedChain, token: selectedToken } : null
  );

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const on = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", on);
    return () => document.removeEventListener("mousedown", on);
  }, []);

  useEffect(() => {
    if (selectedChain && selectedToken) {
      setCurrent({ chain: selectedChain, token: selectedToken });
    }
  }, [selectedChain, selectedToken]);

  if (!selectedChain || !selectedToken || !current) {
    return (
      <div className="relative">
        <button
          className="flex items-center rounded-md px-2 py-2 bg-[rgba(7,16,20,0.55)] border border-[#122122]/20 opacity-70 cursor-not-allowed"
          disabled
        >
          Loading…
        </button>
      </div>
    );
  }

  const setChainAndToken = (_asset: Asset) => {
    if (srcOrdst === "src") {
      switchChain({ chainId: _asset.chain.chainId });
      bridge.setSrcChain(_asset.chain.chainId);
      bridge.setSrcToken(_asset.token.tokenAddress);
    } else {
      bridge.setDstChain(_asset.chain.chainId);
      bridge.setDstToken(_asset.token.tokenAddress);
    }
    setCurrent(_asset);
  };

  return (
    <div className="relative" ref={rootRef}>
      <motion.button
        onClick={() => setOpen(true)}
        className="flex items-center shrink-0 relative overflow-hidden rounded-md px-2 py-2 cursor-pointer group transition-colors bg-[rgba(7,16,20,0.55)] hover:bg-[#051718]/60 border border-[#122122]/20"
        style={{ boxShadow: "inset 0 0 0 1px rgba(14,235,198,0.10), 0 8px 24px rgba(14,235,198,0.10)" }}
      >
        <div className="relative mr-2">
          <Image width={25} height={25} className="w-[25px] h-[25px] rounded-full" src={selectedToken?.icon || ""} alt={selectedToken?.symbol || ""} />
          <Image width={14} height={14} className="absolute -right-1 -bottom-1 rounded-full outline-2 outline-[rgba(7,16,20,0.36)]" src={selectedChain?.icon} alt={selectedChain?.name} />
        </div>
        <p className="font-inter font-semibold text-white/90">{selectedToken?.symbol}</p>
        <motion.span
          className="ml-1 inline-flex"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: easeOut }}
        >
          <ChevronDown className="w-[18px] text-[#c9d9e2]" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <PickerModal
            initial={current}
            srcOrdst={srcOrdst}
            onClose={() => setOpen(false)}
            onSelect={(a) => { setChainAndToken(a); setOpen(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* =================== MODAL =================== */

function PickerModal({
  initial, onSelect, onClose, srcOrdst
}: { initial: Asset; onSelect: (a: Asset) => void; onClose: () => void; srcOrdst: "src" | "dst" }) {
  const [chainId, setChainId] = useState<string>(initial.chain.chainId.toString());
  const [q, setQ] = useState("");

  const wallet = useWalletData();

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  type Row = {
    token: ChainTokenState;
    chain: ChainConfig;
    chainName: string;
    chainIcon?: string;
  };
  const chainMetaById = useMemo(() => {
    const m = new Map<number, { name: string; icon?: string }>();
    for (const c of CHAINS_TOKENS) m.set(c.chainId, { name: c.name, icon: c.icon });
    return m;
  }, []);

  const rows: Row[] = useMemo(() => {
  const text = q.trim().toLowerCase();
  const match = (t: ChainTokenState) =>
    text === "" ||
    t.symbol.toLowerCase().includes(text) ||
    t.name.toLowerCase().includes(text);

  const sourceChains = wallet?.chains ?? [];

  if (chainId === "all") {
    const out: Row[] = [];
    for (const ch of sourceChains) {
      const meta = chainMetaById.get(ch.chainId);
      for (const t of ch.tokens) {
        if (match(t)) {
          out.push({
            token: t,
            chain: ch,
            chainName: meta?.name ?? ch.name ?? String(ch.chainId),
            chainIcon: meta?.icon,
          });
        }
      }
    }
    return out;
  }

  const ch = sourceChains.find((x) => x.chainId === Number(chainId));
  if (!ch) return [];

  const meta = chainMetaById.get(ch.chainId);
  return ch.tokens
    .filter(match)
    .map((t) => ({
      token: t,
      chain: ch,
      chainName: meta?.name ?? ch.name ?? String(ch.chainId),
      chainIcon: meta?.icon,
    }));
}, [wallet?.chains, chainId, q, chainMetaById]);

  return (
    <motion.div className="fixed inset-0 z-[60] grid place-items-center p-3"
      variants={overlayV}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* backdrop */}
      <motion.button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-[1px]"
        style={{ backdropFilter: "blur(2px)", background: "rgba(0,0,0,.7)" }}
        variants={overlayV}
      />

      {/* CARD */}
      <motion.div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[460px] rounded-2xl bg-[#040d0c] p-4
                  shadow-[0_30px_120px_rgba(0,0,0,.6),_inset_0_0_0_1px_rgba(17,74,102,.28)]
                  flex flex-col h-[540px] sm:h-[560px]"
        variants={modalV}
      >
        {/* TOP BAR */}
        <div className="mb-3 flex items-center gap-3 flex-none">
          <div
            className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2
                      bg-black/35 ring-1 ring-[rgba(17,74,102,.22)]"
          >
            <Search className="h-4 w-4 text-[#c9d9e2]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tokens"
              className="flex-1 bg-transparent outline-none text-white/90 placeholder:text-[rgb(188,208,218)]"
            />
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-[#c9d9e2] hover:bg-white/5 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* CHAIN ICONS => flex-none */}
        <div className="flex-none">
          <ChainIconsGrid chainId={chainId} onSelect={setChainId} srcOrdst={srcOrdst} />
        </div>

        {/* TOKEN LIST */}
        <div className="mt-3 flex-1 overflow-y-scroll overflow-x-hidden rounded-md">
          <motion.ul
            key={`${chainId}|${q}`}
            className="divide-y divide-white/5 mr-1"
            variants={gridV}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {rows.map(({ token: t, chain: ch }, i) => (
              <motion.li
                key={`${t.symbol}-${t.tokenAddress}-${ch.chainId}`} 
                variants={liV}
                custom={i}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <button
                  onClick={() => onSelect({ chain: ch, token: t })}
                  className="flex w-full items-center justify-between px-2 py-3 hover:bg-white/5 rounded-md transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-8 shrink-0">
                      <Image src={t.icon || ""} width={32} height={32} className="rounded-full" alt={t.symbol} />
                      <Image
                        src={ch.icon}
                        width={16}
                        height={16}
                        className="absolute -right-1 -bottom-1 rounded-full outline-2 outline-[rgba(12,18,22,.98)]"
                        alt=""
                      />
                    </div>
                    <div className="leading-[1.25]">
                      <div className="text-white/90 text-[15px] font-medium w-max">{t.name}</div>
                      <div className="text-[12px] text-[rgb(188,208,218)] w-max mt-1">
                        {t.symbol} on {ch.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right leading-[1.35]">
                    <div className="text-white/90 tabular-nums font-semibold text-[14px]">
                      {t.priceUsd ? `$${(t.valueUsd!).toFixed(2) }` : "--"}
                    </div>
                    <div className="text-[12px] text-[rgb(188,208,218)] tabular-nums">
                      {t.balance !== undefined ? Number(t.balance).toFixedTruncate(5) : ""}
                    </div>
                  </div>
                </button>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ChainIconsGrid({ chainId, onSelect, srcOrdst }: { chainId: string; onSelect: (id: string) => void; srcOrdst: "src" | "dst" }) {
  const wallet = useWalletData();
  const bridge = useBridge();

  const chains = [
    { chainId: "all", name: "All networks", active: true, icon: "" },
    ...wallet.chains
  ];

  return (
    <div className="mt-2">
      <motion.div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))" }}
        variants={gridV}
        initial="hidden"
        animate="visible"
      >
        {chains.map((c) => {
          const selected = c.chainId.toString() === chainId;
          const disabled = !c.active && c.chainId !== "all";
          const isUsed = c.chainId.toString() === (srcOrdst === "src" ? bridge.dstChain?.chainId.toString() : bridge.srcChain?.chainId.toString());
          return (
            <motion.button
              key={c.chainId}
              variants={chipV}
              onClick={() => !disabled && !isUsed && onSelect(c.chainId.toString())}
              className={`group relative aspect-square rounded-[10px] transition
                ${disabled || isUsed ? "cursor-not-allowed grayscale opacity-60" : "cursor-pointer"}
                ${selected ? "ring-1 ring-[rgba(14,235,198,0.35)] bg-white/5" : "hover:bg-white/5"}
              `}
              style={{
                boxShadow: selected
                  ? "inset 0 0 0 1px rgba(14,235,198,0.35), 0 0 0 4px rgba(14,235,198,0.10)"
                  : "inset 0 0 0 1px rgba(17,74,102,0.22)",
              }}
              title={c.name}
            >
              {selected && <span className="absolute inset-0 rounded-[10px] animate-[pulseRing_900ms_ease-out]" />}
              <div className="grid h-full w-full place-items-center">
                {c.chainId === "all" ? (
                  <AllIcon className={`h-5 w-5 ${!selected && "grayscale"}`} />
                ) : (
                  <Image src={c.icon} alt={c.name} width={20} height={20} className="rounded-full object-cover" />
                )}
              </div>

              {/* tooltip */}
              <span
                className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md px-2 py-1 text-xs text-white/90 opacity-0 backdrop-blur-sm transition
                          group-hover:opacity-100 bg-white/5"
                style={{
                  boxShadow: "inset 0 0 0 1px rgba(17,74,102,0.28), 0 8px 20px rgba(0,0,0,0.35)",
                }}
              >
                {c.name}{c.active ? "" : " (inactive)"}{isUsed ? srcOrdst === "src" ? " (used as source)" : " (used as destination)" : ""}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

/* 3x3 dot "All" icon (mint color) */
function AllIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <g fill="rgba(14,235,198,0.9)">
        {[4, 12, 20].map((x) =>
          [4, 12, 20].map((y, i) => (
            <circle key={`${x}-${y}-${i}`} cx={x} cy={y} r="2.1" />
          ))
        )}
      </g>
    </svg>
  );
}