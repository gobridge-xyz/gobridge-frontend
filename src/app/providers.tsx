"use client";
import WalletProvider from "@/libs/wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { ReactNode, useEffect, useState } from "react";
import { WalletDataProvider } from "../providers/WalletDataProvider";
import { CHAINS_TOKENS } from "@/data/chains_tokens";
import { BridgeProvider } from "@/providers/BridgeProvider";
import { PSMProvider } from "@/providers/PSMProvider";

export default function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <WalletProvider>
      <RainbowKitProvider  theme={darkTheme({
          accentColor: '#0EEBC6',
          accentColorForeground: '#031417',
          borderRadius: 'medium',
          overlayBlur: 'small',
        })}
        modalSize="compact"
      >
        <WalletDataProvider chainsConfig={CHAINS_TOKENS} pollIntervalMs={120_000}>
          <BridgeProvider>
            <PSMProvider>
              {children}
            </PSMProvider>
          </BridgeProvider>
        </WalletDataProvider>
      </RainbowKitProvider>
    </WalletProvider>
  );
}