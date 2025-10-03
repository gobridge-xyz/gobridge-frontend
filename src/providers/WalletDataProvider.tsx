// use client
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, PublicClient } from "viem";
import { useAccount, useConfig } from "wagmi";

import { ChainConfig, TokenConfig } from "@/data/chains_tokens";
import { getPublicClient } from "wagmi/actions";

type DecCache = Map<`0x${string}`, number>;

export type ChainTokenState = (TokenConfig & {
  balance: string;
  balanceRaw: bigint;
  priceUsd?: number;
  valueUsd?: number;
});

export type ChainState = {
  chainId: number;
  rpcUrl: string;
  name: string;
  icon: string;
  active: boolean;
  tokens: ChainTokenState[];
  totalUsd: number;
};

export type WalletDataContextValue = {
  isReady: boolean;
  address?: `0x${string}`;
  connected: boolean;
  chains: ChainState[];
  totals: { totalUsd: number };
  loading: boolean;
  error?: string | null;
  refresh: (resetInterval?: boolean) => Promise<void>;

  getChain: (chainId: number) => ChainState | undefined;
  getToken: (chainId: number, addr: `0x${string}`) => (ChainTokenState | undefined);
  getPriceUsd: (chainId: number, addr: `0x${string}`) => number | undefined;
  getBalance: (chainId: number, addr: `0x${string}`) => { raw: bigint; formatted: string } | undefined;
};

type PricePlanItem = {
  tokenAddr: `0x${string}`;
  feed: `0x${string}`;
  hasDecimalsCall: boolean;
};

/* ---------- Context ---------- */

const WalletDataContext = createContext<WalletDataContextValue | undefined>(undefined);

/* -------------------- Minimal ERC20 & Chainlink iface -------------------- */

export const aggregatorV3Abi = [
  {
    name: "decimals",
    stateMutability: "view",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint8", name: "" }],
  },
  {
    name: "latestRoundData",
    stateMutability: "view",
    type: "function",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

/* -------------------- Cache -------------------- */

const feedDecimalsCache: DecCache = new Map();

/* -------------------- Provider -------------------- */

export function WalletDataProvider({
  children,
  chainsConfig,
  pollIntervalMs = 15_000,
}: {
  children: React.ReactNode;
  chainsConfig: ChainConfig[];
  pollIntervalMs?: number;
}) {
  const wagmiConfig = useConfig();
  const { address, isConnected } = useAccount();

  const [chains, setChains] = useState<ChainState[]>(
    () =>
      chainsConfig.map((c) => ({
        chainId: c.chainId,
        name: c.name,
        tokens: c.active
          ? c.tokens.map((t) => ({
              ...t,
              balance: "0",
              balanceRaw: 0n,
              priceUsd: undefined,
              valueUsd: 0,
            }))
          : [],
        totalUsd: 0,
      })) as ChainState[]
  );
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  const publicClients = useMemo(() => {
    const map = new Map<number, PublicClient>();
    for (const c of chainsConfig) {
      if (!c.active) continue;
      const pc = getPublicClient(wagmiConfig, { chainId: c.chainId });
      if (pc) map.set(c.chainId, pc);
    }
    return map;
  }, [wagmiConfig, chainsConfig]);

  const doFetch = useCallback(async () => {
    if (!address || !isConnected || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setIsReady(false);
    setError(null);

    try {
      const activeCfgs = chainsConfig.filter((c) => c.active);

      const chainResults = await Promise.all(
        activeCfgs.map(async (cfg) => {
          const pc = publicClients.get(cfg.chainId);
          if (!pc) {
            console.warn('No PublicClient for chain', cfg.chainId);
            return {
              chainId: cfg.chainId, name: cfg.name, rpcUrl: cfg.rpcUrl, icon: cfg.icon,
              active: cfg.active, tokens: [], totalUsd: 0,
            } as ChainState;
          }

        const blockNumber = await pc.getBlockNumber();

        const nativeP = pc.getBalance({ address, blockNumber });

        const erc20Calls = cfg.tokens.map(t => ({
          address: t.tokenAddress as `0x${string}`,
          abi: [{
            type: 'function', stateMutability: 'view', name: 'balanceOf',
            inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256', name: '' }]
          }] as const,
          functionName: 'balanceOf' as const,
          args: [address] as const
        }));

        const priceCalls: any[] = [];
        const plan: PricePlanItem[] = [];
        for (const t of cfg.tokens) {
          const feed = t.priceFeed?.proxy as `0x${string}` | undefined;
          if (!feed) continue;

          const hasDecimalsCall = !feedDecimalsCache.has(feed);
          if (hasDecimalsCall) {
            priceCalls.push({ address: feed, abi: aggregatorV3Abi, functionName: 'decimals' as const, args: [] as const });
          }
          priceCalls.push({ address: feed, abi: aggregatorV3Abi, functionName: 'latestRoundData' as const, args: [] as const });

          plan.push({ tokenAddr: t.tokenAddress as `0x${string}`, feed, hasDecimalsCall });
        }

        const [nativeRaw, multi] = await Promise.all([
          nativeP.catch(() => 0n),
          (erc20Calls.length || priceCalls.length)
            ? pc.multicall({ contracts: [...erc20Calls, ...priceCalls], allowFailure: true, blockNumber })
            : Promise.resolve([])
        ]);

        const tokens: ChainTokenState[] = cfg.tokens.map((t, i) => {
          const res = multi[i] as { status: 'success'; result: bigint } | { status: 'failure' } | undefined;
          const raw = res?.status === 'success' ? res.result : 0n;
          return { ...t, balanceRaw: raw, balance: formatUnits(raw, t.decimals ?? 18), priceUsd: undefined, valueUsd: 0 };
        });

        let ptr = erc20Calls.length;
        for (const item of plan) {
          try {
            let decimals = feedDecimalsCache.get(item.feed);

            if (item.hasDecimalsCall) {
              const decRes = multi[ptr++] as { status: 'success'; result: number } | { status: 'failure' } | undefined;
              if (decRes?.status === 'success' && typeof decRes.result === 'number') {
                decimals = decRes.result;
                feedDecimalsCache.set(item.feed, decimals);
              } else {
                decimals = decimals ?? 8;
                feedDecimalsCache.set(item.feed, decimals);
              }
            } else if (decimals == null) {
              decimals = 8;
              feedDecimalsCache.set(item.feed, decimals);
            }

            const lr = multi[ptr++] as
              | { status: 'success'; result: readonly [bigint, bigint, bigint, bigint, bigint] }
              | { status: 'failure' }
              | undefined;

            if (lr?.status !== 'success') continue;
            const tuple = lr.result;
            const answer = Array.isArray(tuple) ? tuple[1] : undefined;
            if (typeof answer !== 'bigint' || typeof decimals !== 'number') continue;

            const price = Number(formatUnits(answer, decimals));
            if (!Number.isFinite(price)) continue;

            const tok = tokens.find(x => x.tokenAddress.toLowerCase() === item.tokenAddr.toLowerCase());
            if (tok) tok.priceUsd = price;
          } catch (err) {
            console.error(`Error processing prices for chain ${cfg.chainId}`, err);
          }
        }


        const evaluated = tokens.map((t) => {
          const price = t.priceUsd ?? 0;
          const val = price ? Number(formatUnits(t.balanceRaw, t.decimals ?? 18)) * price : 0;
          return { ...t, valueUsd: val };
        });

        if (evaluated[0]) {
          const n = evaluated[0];
          n.balanceRaw = nativeRaw ?? 0n;
          n.balance = formatUnits(nativeRaw ?? 0n, n.decimals ?? 18);

          const price = n.priceUsd ?? 0;
          n.valueUsd = price ? Number(formatUnits(n.balanceRaw, n.decimals ?? 18)) * price : 0;
        }

        const totalUsd = evaluated.reduce((s, x) => s + (x.valueUsd ?? 0), 0);        

        return {
          chainId: cfg.chainId,
          name: cfg.name,
          rpcUrl: cfg.rpcUrl,
          icon: cfg.icon,
          active: cfg.active,
          tokens: evaluated,
          totalUsd,
        } as ChainState;
      }));
      const inactive = chainsConfig.filter(c => !c.active).map<ChainState>((c) => ({
        chainId: c.chainId, name: c.name, rpcUrl: c.rpcUrl, icon: c.icon, active: c.active, tokens: [], totalUsd: 0
      }));
      const byId = new Map<number, ChainState>();
      [...inactive, ...chainResults].forEach(cs => byId.set(cs.chainId, cs));
      const final = chainsConfig.map(cfg => byId.get(cfg.chainId)!).filter(Boolean) as ChainState[];

      setChains(final);
      setIsReady(true);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message ?? 'fetch error');
      setLoading(false);
      setIsReady(false);
    } finally {
      inFlightRef.current = false;
    }
  }, [address, isConnected, chainsConfig, publicClients]);

  const refresh = useCallback(
    async (resetInterval = false) => {
      await doFetch();
      if (resetInterval) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
          doFetch().catch(() => {});
        }, pollIntervalMs) as unknown as number;
      }
    },
    [doFetch, pollIntervalMs]
  );  

  useEffect(() => {
    if (!address || !isConnected) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsReady(false);
      return;
    }
    (async () => {
      await doFetch();
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        doFetch().catch(() => {});
      }, pollIntervalMs) as unknown as number;
    })();

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [address, isConnected, doFetch, pollIntervalMs]);

  const chainMap = useMemo(() => {
    const m = new Map<number, ChainState>();
    for (const cs of chains) m.set(cs.chainId, cs);
    return m;
  }, [chains]);

  const tokenMap = useMemo(() => {
    const m = new Map<string, ChainTokenState>();
    for (const cs of chains) {
      for (const t of cs.tokens) {
        m.set(`${cs.chainId}:${t.tokenAddress.toLowerCase()}`, t);
      }
    }
    return m;
  }, [chains]);

  const getChain = useCallback(
    (chainId: number) => chainMap.get(chainId),
    [chainMap]
  );

  const getToken = useCallback(
    (chainId: number, addr: `0x${string}`) =>
      tokenMap.get(`${chainId}:${addr.toLowerCase()}`),
    [tokenMap]
  );

  const getPriceUsd = useCallback(
    (chainId: number, addr: `0x${string}`) =>
      tokenMap.get(`${chainId}:${addr.toLowerCase()}`)?.priceUsd,
    [tokenMap]
  );

  const getBalance = useCallback(
    (chainId: number, addr: `0x${string}`) => {
      const t = tokenMap.get(`${chainId}:${addr.toLowerCase()}`);
      return t ? { raw: t.balanceRaw, formatted: t.balance } : undefined;
    },
    [tokenMap]
  );

  const ctxValue = useMemo<WalletDataContextValue>(() => {
    const totalUsd = chains.reduce((s, c) => s + (c.totalUsd || 0), 0);
    return {
      address,
      connected: !!address && isConnected,
      chains,
      totals: { totalUsd },
      loading,
      error,
      refresh,

      getChain,
      getToken,
      getPriceUsd,
      getBalance,
      isReady,
    };
  }, [address, isConnected, chains, loading, error, refresh, getChain, getToken, getPriceUsd, getBalance, isReady]);

  return <WalletDataContext.Provider value={ctxValue as any}>{children}</WalletDataContext.Provider>;
}

/* ---------- hook ---------- */

export function useWalletData() {
  const ctx = useContext(WalletDataContext);
  if (!ctx) throw new Error("useWalletData must be used inside WalletDataProvider");
  return ctx;
}