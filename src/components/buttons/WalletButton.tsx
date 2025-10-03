"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Wallet2 as WalletIcon, LogOut, Copy, AlertTriangle } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { motion, AnimatePresence } from "motion/react";

import { useWalletData } from "@/providers/WalletDataProvider";
import { CHAINS_TOKENS } from "@/data/chains_tokens";
import Image from "next/image";

function shortAddr(a?: string) {
  if (!a) return "";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

const fmtUSD = (n?: number) =>
  n === undefined ? "--" : n < 0.01 ? "$<0.01" : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const fmtAmt = (s?: string) => {
  if (!s) return "0";
  const n = Number(s);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
};

export default function WalletButton() {
  const [open, setOpen] = useState(false);
  const pop = useRef<HTMLDivElement | null>(null);
  const { disconnectAsync } = useDisconnect();

  useEffect(() => {
    const on = (e: MouseEvent) => {
      if (!pop.current) return;
      if (!pop.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", on);
    return () => document.removeEventListener("mousedown", on);
  }, []);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
        authenticationStatus,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account != null &&
          chain != null &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        // ---- Not Connected ----
        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#031417] cursor-pointer"
              style={{
                background:
                  "linear-gradient(180deg, rgba(14,235,198,0.95) 0%, rgba(12,181,154,0.95) 100%)",
                boxShadow:
                  "inset 0 0 0 1px rgba(14,235,198,0.25), 0 10px 28px rgba(14,235,198,0.12)",
              }}
            >
              <WalletIcon className="h-4 w-4" />
              Connect Wallet
            </button>
          );
        }

        // ---- Wrong Network ----
        if (chain?.unsupported) {
          return (
            <button
              onClick={openChainModal}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer text-[#fbe9e9]"
              style={{
                borderColor: "rgba(136,56,56,0.45)",
                backgroundColor: "rgba(60,16,16,0.7)",
                boxShadow:
                  "inset 0 0 0 1px rgba(180,60,60,0.45), 0 1px 0 rgba(255,255,255,0.04)",
              }}
              title="Switch network"
            >
              <AlertTriangle className="h-4 w-4" />
              Wrong network
            </button>
          );
        }

        // ---- Connected ----
        return (
          <div className="relative" ref={pop}>
            <button
              onClick={() => setOpen((s) => !s)}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer"
              style={{
                borderColor: "rgba(17,74,102,0.28)",
                backgroundColor: "rgba(7,16,20,0.36)",
                boxShadow:
                  "inset 0 0 0 1px rgba(17,74,102,0.2), 0 1px 0 rgba(255,255,255,0.04)",
                color: "rgba(230,243,241,0.92)",
              }}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[rgba(14,235,198,0.9)]" />
              {account.ensName || shortAddr(account?.address)}
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 z-50 mt-2 w-[360px] rounded-xl overflow-hidden bg-[#040d0c]"
                  style={{
                    boxShadow:
                      "0 18px 48px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(17,74,102,0.20)",
                    border: "1px solid rgba(17,74,102,0.28)",
                  }}
                >
                  <BalancesPanel
                    address={account.address as `0x${string}`}
                    onCopy={() => navigator.clipboard.writeText(account.address)}
                    onDetails={openAccountModal}
                    onDisconnect={async () => {
                      setOpen(false);
                      await disconnectAsync();
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

/* ---------------- Panel ---------------- */

function BalancesPanel({
  address,
  onCopy,
  onDetails,
  onDisconnect,
}: {
  address: `0x${string}`;
  onCopy: () => void;
  onDetails: () => void;
  onDisconnect: () => Promise<void> | void;
}) {
  const wallet = useWalletData();

  const { activeChains, inactiveChains } = useMemo(() => {
    return {
      activeChains: wallet.chains.filter((c) => c.active),
      inactiveChains: CHAINS_TOKENS.filter((c) => !c.active),
    };
  }, [wallet.chains]);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2 text-[13px] text-[rgb(188,208,218)]">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[rgba(14,235,198,0.9)]" />
          {shortAddr(address)}
        </div>
        <div className="text-[13px] text-white/80 font-medium">
          Total: {fmtUSD(wallet.totals.totalUsd)}
        </div>
      </div>

      {/* Scroll body */}
      <div className="max-h-[420px] overflow-y-auto px-2 py-2">
        {/* ACTIVE CHAINS */}
        {activeChains.map((c) => (
          <div key={c.chainId} className="rounded-lg px-2 py-2 hover:bg-white/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image
                  src={CHAINS_TOKENS.find((x) => x.chainId === c.chainId)?.icon || ""}
                  alt={CHAINS_TOKENS.find((x) => x.chainId === c.chainId)?.name || ""}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <div className="text-sm text-white/90 font-medium">{c.name}</div>
              </div>
              <div className="text-sm text-white/80 font-semibold">{fmtUSD(c.totalUsd)}</div>
            </div>

            <ul className="mt-2 space-y-1">
              {c.tokens.map((t) => (
                <li
                  key={`${t.tokenAddress}-${t.symbol}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 cursor-pointer"
                  style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                  onClick={() => navigator.clipboard.writeText(t.tokenAddress)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative">
                      <Image src={t.icon || ""} alt={t.name || ""} height={24} width={24} className="rounded-full" />
                      {/* chain badge */}
                      <Image
                        src={CHAINS_TOKENS.find((x) => x.chainId === c.chainId)?.icon || ""}
                        alt={CHAINS_TOKENS.find((x) => x.chainId === c.chainId)?.name || ""}
                        height={14}
                        width={14}
                        className="absolute -right-1 -bottom-1 rounded-full"
                        style={{ outline: "2px solid rgba(7,16,20,0.98)" }}
                      />
                    </div>
                    <div className="truncate">
                      <div className="text-[13px] text-white/90 font-medium truncate">
                        {t.symbol}
                      </div>
                      <div className="text-[12px] text-[rgb(188,208,218)] -mt-0.5">
                        {fmtAmt(t.balance)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] text-white/90 font-semibold">
                      {fmtUSD(t.valueUsd)}
                    </div>
                    <div className="text-[11px] text-[rgb(188,208,218)]">
                      {t.priceUsd ? `$${t.priceUsd.toFixed(2)}` : "--"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* INACTIVE CHAINS */}
        {inactiveChains.length > 0 && (
          <div className="mt-2">
            <div className="px-3 py-1 text-[12px] uppercase tracking-wider text-[rgb(188,208,218)]/70">
              Inactive
            </div>
            <div className="grid grid-cols-2 gap-2 px-1">
              {inactiveChains.map((c) => (
                <div
                  key={c.chainId}
                  className="flex items-center gap-2 rounded-md px-2 py-2"
                  style={{
                    filter: "grayscale(100%)",
                    border: "1px dashed rgba(255,255,255,0.06)",
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                >
                  <Image src={c.icon} alt={c.name} height={20} width={20} className="rounded-full" />
                  <div className="text-sm text-white/60">{c.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* footer actions */}
      <div
        className="flex items-center gap-2 px-2 py-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={onCopy}
          className="flex-1 rounded-md px-3 py-2 text-[13px] text-[rgb(188,208,218)] hover:text-white hover:bg-white/5 cursor-pointer inline-flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Copy address
        </button>
        <button
          onClick={onDetails}
          className="flex-1 rounded-md px-3 py-2 text-[13px] text-[rgb(188,208,218)] hover:text-white hover:bg-white/5 cursor-pointer inline-flex items-center gap-2"
        >
          <WalletIcon className="h-4 w-4" />
          Details
        </button>
        <button
          onClick={onDisconnect}
          className="rounded-md px-3 py-2 text-[13px] text-[rgb(188,208,218)] hover:text-white hover:bg-white/5 cursor-pointer inline-flex items-center gap-2"
          title="Disconnect"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
