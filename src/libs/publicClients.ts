import { PublicClient, createPublicClient, webSocket, http } from "viem";
import { getPublicClient } from "wagmi/actions";
import { useConfig } from "wagmi";

export function usePublicClientByChain() {
  const cfg = useConfig();
  return (chainId: number): PublicClient => {
    const pc = getPublicClient(cfg, { chainId });
    if (!pc) throw new Error(`No public client for chain ${chainId}`);
    return pc;
  };
}

export function makeWsClient({
  chain,
  wsUrl,
  httpUrl,
}: {
  chain: {
    id: number;
    name: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: { default: { http: string[] } };
  };
  wsUrl: string;
  httpUrl?: string;
}) {
  try {
    return createPublicClient({
      chain,
      transport: webSocket(wsUrl),
    });
  } catch {
    return createPublicClient({
      chain,
      transport: http(httpUrl ?? chain.rpcUrls.default.http[0]),
    });
  }
}