"use client";

import { Wallet2 as WalletIcon, AlertTriangle } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useBridge } from "@/providers/BridgeProvider";
import ConfirmBridgeModal from "@/components/modals/ConfirmBridgeModal";
import { useState } from "react";
import { useSignPermit2 } from "@/libs/signPermit2";
import { useEnsurePermit2Approval } from "../hooks/useApprove";
import { useWalletData } from "@/providers/WalletDataProvider";

export default function BridgeButton() {
  const bridge = useBridge();
  const wallet = useWalletData();
  const [open, setOpen] = useState(false);
  const { sign } = useSignPermit2();
  const { ensureApproval } = useEnsurePermit2Approval();

  const isFormValid = bridge.srcChain !== null && bridge.dstChain !== null;
  const isAmountValid = bridge.amountInRaw !== null && bridge.amountInRaw > 0n;
  const isBalanceSufficient = Number(bridge.amountInRaw) <= Number(bridge.srcBalance?.raw)

  const isSubmitDisabled = !isFormValid  || !isBalanceSufficient || !wallet.isReady || bridge.error !== null;
  const errorMessage = !isFormValid ? "Select a token" : !isBalanceSufficient ? `Not enough ${bridge.srcTokenMeta?.symbol.toUpperCase()}` : !wallet.isReady ? "Fetching wallet data..." : !bridge.error !== null ? bridge.error : "Unknown Error";

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
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
              className="inline-flex items-center justify-center w-full h-[50px] rounded-md mt-4 gap-2 px-3 py-2 text-sm font-medium text-[#031417] cursor-pointer"
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
              className="inline-flex items-center justify-center w-full h-[50px] rounded-md mt-4 gap-2 border px-3 py-2 text-sm cursor-pointer text-[#fbe9e9]"
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
        
        // ---- Disabled ----
        if (isSubmitDisabled) {
          return (
            <button
              className="relative inline-flex items-center justify-center w-full h-[50px] rounded-md mt-4 gap-2 px-3 py-2 text-md font-medium cursor-default overflow-hidden"
              title="Error"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#8B1C1Ccc] via-[#B43C3Ccc] to-[#8B1C1Ccc] animate-pulse" />

              <span className="absolute inset-0 rounded-md border border-[#B43C3Caa]" />

              <span className="relative text-[#fbe9e9] font-semibold">
                {errorMessage}
              </span>
            </button>
          );
        }

        // ---- Amount Not Valid ----
        if (!isAmountValid) {
          return (
            <button
              className="relative inline-flex items-center justify-center w-full h-[50px] rounded-md mt-4 gap-2 px-3 py-2 text-[15px] font-semibold cursor-default overflow-hidden"
              title="Error"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#11362f] via-[#11362f] to-[#11362f]" />

              <span className="relative text-[#e4e4e4]">
                Enter an amount
              </span>
            </button>
          );
        }
        
        // ---- Loading ----
        if (bridge.loadingQuote) {
          return (
            <button
              className="inline-flex items-center justify-center w-full h-[50px] rounded-md mt-4 gap-2 px-3 py-2 text-[15px] font-semibold cursor-pointer relative overflow-hidden"
              disabled
              style={{
                boxShadow:
                  "inset 0 0 0 1px rgba(14,235,198,0.25), 0 10px 28px rgba(14,235,198,0.12)"
              }}
            >
              <span className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#0EEBC622] via-[#31313133] to-[#0EEBC622]" />

              <span className="relative flex items-center gap-2 text-[#cefff4]">
                Finalizing quote...
              </span>
            </button>
          );
        }
        
        // ---- Connected ----
        return (
          <>
            <button
              onClick={() => setOpen(true)}
              className="relative inline-flex w-full h-[50px] items-center justify-center rounded-lg mt-4 px-3 py-2 text-[15px] font-semibold text-[#031417] cursor-pointer overflow-hidden select-none group focus:outline-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(14,235,198,0.95) 0%, rgba(12,161,154,0.82) 50%, rgba(14,235,198,0.95) 100%)",
                backgroundSize: "180% 180%",
                boxShadow:
                  "0 12px 36px rgba(14,235,198,0.18), inset 0 0 0 1px rgba(14,235,198,0.28)",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(0.5px) scale(0.995)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0) scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0) scale(1)")}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-lg"
                style={{
                  boxShadow: "0 0 0 0 rgba(14,235,198,0.22)",
                  transition: "box-shadow 280ms ease",
                }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.35) 12%, transparent 24%)",
                  backgroundSize: "220% 100%",
                  transition: "opacity 220ms ease",
                  mixBlendMode: "soft-light",
                }}
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-[10px] ring-0 group-focus-visible:ring-8 group-focus-visible:ring-[#0EEBC6]/100 transition"
              />

              <span className="relative z-10">Bridge</span>
            </button>
            <ConfirmBridgeModal
              open={open}
              onClose={() => {setOpen(false); wallet.refresh();}}
              onApprove={async () => { await ensureApproval(); }}
              onPermit={async () => { await sign(); }}
            />
          </>
        );
      }}
    </ConnectButton.Custom>
  );
}