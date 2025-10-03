"use client";

import { useMemo } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  coinbaseWallet,
  zerionWallet,
  phantomWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { CHAINS_TOKENS } from "@/data/chains_tokens";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID!;

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const wagmiConfig = useMemo(() => {
    const connectors = connectorsForWallets(
      [
        {
          groupName: "Popular",
          wallets: [injectedWallet, coinbaseWallet, zerionWallet, phantomWallet, walletConnectWallet],
        },
      ],
      { appName: "GoBridge", projectId }
    );

    const chainsArray = CHAINS_TOKENS.map((c) => ({
      id: c.chainId,
      name: c.name,
      network: c.name.toLowerCase().replace(/\s+/g, "-"),
      nativeCurrency: {
        name: c.tokens[0].name,
        symbol: c.tokens[0].symbol,
        decimals: c.tokens[0].decimals,
      },
      rpcUrls: { default: { http: [c.rpcUrl] } },
      contracts: {
        multicall3: {
          address: "0xca11bde05977b3631167028862be2a173976ca11" as `0x${string}`,
          blockCreated: 14353601,
        },
      },
    }));

    return createConfig({
      chains: chainsArray as [typeof chainsArray[0], ...typeof chainsArray],
      ssr: false,
      connectors,
      transports: Object.fromEntries(
        CHAINS_TOKENS.map((c) => [c.chainId, http(c.rpcUrl)])
      ) as any,
    });
  }, []);

  const qc = useMemo(() => new QueryClient(), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}