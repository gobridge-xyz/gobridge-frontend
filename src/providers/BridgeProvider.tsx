"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { formatUnits, parseUnits } from "viem";

import { CHAINS_TOKENS, type ChainConfig, type TokenConfig } from "@/data/chains_tokens";
import { useWalletData } from "@/providers/WalletDataProvider";

/* ──────────────────────────────────────────
   Types
────────────────────────────────────────── */

interface Permit2 {
  nonce: bigint;
  deadline: number;
  signature: `0x${string}`;
}

export type FeeQuote = {
  rnkFee: bigint;
  destFee: bigint;
  deadline: number;
  signature: `0x${string}`;
};

type CalculateBridgeReq = {
  srcInitiator: `0x${string}`;
  destTo: `0x${string}`;
  srcChainId: bigint;
  destChainId: bigint;
  srcToken: `0x${string}`;
  destToken: `0x${string}`;
  amountInRaw: bigint;
};

type CalculateBridgeRes = {
  srcSwapPath: `0x${string}`;
  dstSwapPath: `0x${string}`;
  feeQuote: FeeQuote;
  protocolFee: bigint;
  srcFee: bigint;
  totalFees: bigint;
  amountOutAfterFees: bigint;
  minAmountOut: bigint;
};

export type BridgeState = {
  srcInitiator: `0x${string}`;
  dstReceiver?: `0x${string}`;

  srcChainId: number;
  dstChainId: number;

  srcToken: `0x${string}`;
  dstToken: `0x${string}`;

  amountIn: string;
  amountInRaw: bigint;

  amountOut: number;
  amountOutRaw: bigint;

  minAmountOut: bigint;

  srcSwapPath: `0x${string}`;
  dstSwapPath: `0x${string}`;

  feeQuote: FeeQuote;
  srcFee: bigint;
  protocolFee: bigint;

  permit2: Permit2;
  needsPermit2Approve: boolean;

  totalFees: bigint;

  loadingQuote: boolean;
  error?: string | null;
};

type Action =
  | { type: "SET_SRC_INITIATOR"; addr: `0x${string}` }
  | { type: "SET_DST_RECEIVER"; addr?: `0x${string}` }
  | { type: "SET_SRC_CHAIN"; chainId: number }
  | { type: "SET_DST_CHAIN"; chainId: number }
  | { type: "SET_SRC_TOKEN"; addr: `0x${string}` }
  | { type: "SET_DST_TOKEN"; addr: `0x${string}` }
  | { type: "SWAP_SIDES" }
  | { type: "SET_AMOUNT_IN"; value: string; amountRaw: bigint }
  | { type: "SET_AMOUNT_OUT"; value: number; amountRaw: bigint }
  | { type: "SET_MIN_OUT"; value: bigint }
  | { type: "SET_SWAP_PATHS"; srcPath: `0x${string}`; dstPath: `0x${string}` }
  | { type: "SET_FEE_QUOTE"; value: FeeQuote }
  | { type: "SET_PROTOCOL_FEE"; value: bigint }
  | { type: "SET_SRC_FEE"; value: bigint }
  | { type: "SET_TOTAL_FEES"; value: bigint }
  | { type: "SET_PERMIT2"; value: Permit2 }
  | { type: "SET_NEEDS_PERMIT2_APPROVE"; value: boolean }
  | { type: "QUOTE_LOADING"; value: boolean }
  | { type: "SET_ERROR"; message?: string | null }
  | { type: "RESET" };

/* ──────────────────────────────────────────
   Initial helpers
────────────────────────────────────────── */

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;
const ZERO_PATH = "0x" as `0x${string}`;

const firstActive = CHAINS_TOKENS.find(c => c.active) ?? CHAINS_TOKENS[0];
const secondActive =
  CHAINS_TOKENS.find(c => c.active && c.chainId !== firstActive.chainId) ??
  CHAINS_TOKENS.find(c => c.chainId !== firstActive.chainId) ??
  firstActive;

function defToken(c: ChainConfig): `0x${string}` {
  return c.tokens[0]?.tokenAddress ?? ZERO_ADDR;
}

const initialState: BridgeState = {
  srcInitiator: ZERO_ADDR,
  dstReceiver: undefined,

  srcChainId: firstActive.chainId,
  dstChainId: secondActive.chainId,

  srcToken: defToken(firstActive),
  dstToken: defToken(secondActive),

  amountIn: "0",
  amountInRaw: 0n,
  
  amountOut: 0,
  amountOutRaw: 0n,
  
  minAmountOut: 0n,

  srcSwapPath: ZERO_PATH,
  dstSwapPath: ZERO_PATH,

  feeQuote: {
    rnkFee: 0n,
    destFee: 0n,
    deadline: 0,
    signature: ZERO_PATH,
  },

  permit2: { nonce: 0n, deadline: 0, signature: ZERO_PATH },
  needsPermit2Approve: false,
  
  protocolFee: 0n,
  srcFee: 0n,
  totalFees: 0n,

  loadingQuote: false,
  error: null,
};

/* ──────────────────────────────────────────
   Reducer
────────────────────────────────────────── */

function reducer(state: BridgeState, action: Action): BridgeState {
  switch (action.type) {
    case "SET_SRC_INITIATOR":
      return { ...state, srcInitiator: action.addr };

    case "SET_DST_RECEIVER":
      return { ...state, dstReceiver: action.addr };

    case "SET_SRC_CHAIN":
      return { ...state, srcChainId: action.chainId };

    case "SET_DST_CHAIN":
      return { ...state, dstChainId: action.chainId };

    case "SET_SRC_TOKEN":
      return { ...state, srcToken: action.addr };

    case "SET_DST_TOKEN":
      return { ...state, dstToken: action.addr };

    case "SWAP_SIDES":
      return {
        ...state,
        srcToken: state.dstToken,
        dstToken: state.srcToken,
        srcChainId: state.dstChainId,
        dstChainId: state.srcChainId,
      };

    case "SET_AMOUNT_IN":
      return { ...state, amountIn: action.value, amountInRaw: action.amountRaw };

    case "SET_AMOUNT_OUT":
      return { ...state, amountOut: action.value, amountOutRaw: action.amountRaw };

    case "SET_MIN_OUT":
      return { ...state, minAmountOut: action.value };

    case "SET_SWAP_PATHS":
      return { ...state, srcSwapPath: action.srcPath, dstSwapPath: action.dstPath };

    case "QUOTE_LOADING":
      return { ...state, loadingQuote: action.value };

    case "SET_FEE_QUOTE":
      return { ...state, feeQuote: action.value };

    case "SET_SRC_FEE":
      return { ...state, srcFee: action.value };
    
    case "SET_PERMIT2":
      return { ...state, permit2: action.value };

    case "SET_NEEDS_PERMIT2_APPROVE":
      return { ...state, needsPermit2Approve: action.value };

    case "SET_PROTOCOL_FEE":
      return { ...state, protocolFee: action.value };

    case "SET_TOTAL_FEES":
      return { ...state, totalFees: action.value };

    case "SET_ERROR":
      return { ...state, error: action.message ?? null };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

/* ──────────────────────────────────────────
   Context
────────────────────────────────────────── */

type BridgeContextValue = BridgeState & {
  // derived selector’lar
  srcChain?: ChainConfig;
  dstChain?: ChainConfig;
  dstBridge?: `0x${string}`;
  srcTokenMeta?: TokenConfig;
  dstTokenMeta?: TokenConfig;

  srcBalance?: { raw: bigint; formatted: string };
  dstBalance?: { raw: bigint; formatted: string };
  srcPriceUsd?: number;
  dstPriceUsd?: number;
  srcValueUsd?: number;
  dstValueUsd?: number;

  // setters
  setSrcInitiator: (a: `0x${string}`) => void;
  setDstReceiver: (a?: `0x${string}`) => void;

  setSrcChain: (id: number) => void;
  setDstChain: (id: number) => void;

  setSrcToken: (addr: `0x${string}`) => void;
  setDstToken: (addr: `0x${string}`) => void;
  swapSides: () => void;

  setAmountIn: (val: string) => void;
  setAmountOut: (val: number) => void;
  setMinAmountOut: (v: bigint) => void;

  setSwapPaths: (srcPath: `0x${string}`, dstPath: `0x${string}`) => void;

  setPermit2: (v: Permit2) => void;
  setNeedsPermit2Approve: (v: boolean) => void;

  refreshQuote: (opts?: { force?: boolean }) => void;
  clearQuote: () => void;
  clearFeeQuote: () => void;

  // reset
  reset: () => void;
};

const BridgeContext = createContext<BridgeContextValue | undefined>(undefined);

/* ──────────────────────────────────────────
   Provider
────────────────────────────────────────── */

export function BridgeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wallet = useWalletData();
  const inFlightRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  const postWithAbort = useCallback(async <T,>(url: string, body: unknown, signal?: AbortSignal): Promise<T> => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
      signal,
    });
    if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Request failed (${res.status})`);
    return (await res.json()) as T;
  }, []);

  const buildQuotePayload = useCallback((): CalculateBridgeReq | null => {
    if (!state.srcChainId || !state.dstChainId) return null;
    if (!state.srcToken || !state.dstToken) return null;
    if (!state.amountIn || state.amountInRaw <= 0n) return null;
    if (state.srcChainId === state.dstChainId) return null;

    return {
      srcInitiator: state.srcInitiator,
      destTo: state.dstReceiver ?? state.srcInitiator,
      srcChainId: BigInt(state.srcChainId),
      destChainId: BigInt(state.dstChainId),
      srcToken: state.srcToken,
      destToken: state.dstToken,
      amountInRaw: state.amountInRaw,
    };
  }, [
    state.srcChainId, state.dstChainId,
    state.srcToken, state.dstToken,
    state.amountIn, state.amountInRaw,
    state.srcInitiator, state.dstReceiver,
  ]);

  const fetchQuote = useCallback(async () => {
    const payload = buildQuotePayload();

    if (!payload) {
      dispatch({ type: "SET_FEE_QUOTE", value: { rnkFee: 0n, destFee: 0n, deadline: 0, signature: ZERO_ADDR } });
      dispatch({ type: "QUOTE_LOADING", value: false });
      dispatch({ type: "SET_ERROR", message: null });
      return;
    }

    if (inFlightRef.current) inFlightRef.current.abort();
    const ctrl = new AbortController();
    inFlightRef.current = ctrl;

    dispatch({ type: "QUOTE_LOADING", value: true });
    dispatch({ type: "SET_ERROR", message: null });

    try {
      const data = await postWithAbort<CalculateBridgeRes>(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/calculateBridge`,
        payload,
        ctrl.signal
      );
      if (!ctrl.signal.aborted) {
        dispatch({ type: "SET_FEE_QUOTE", value: data.feeQuote });
        dispatch({ type: "SET_SWAP_PATHS", srcPath: data.srcSwapPath, dstPath: data.dstSwapPath });

        const dec = dstTokenMeta?.decimals ?? 18;
        const rawOut = BigInt(String(data.amountOutAfterFees ?? "0"));
        const humanStr = formatUnits(rawOut, dec);
        const humanNum = Number.isFinite(Number(humanStr)) ? parseFloat(humanStr) : 0;
        dispatch({ type: "SET_AMOUNT_OUT", value: humanNum, amountRaw: rawOut });

        dispatch({ type: "SET_PROTOCOL_FEE", value: BigInt((data.protocolFee as unknown as string) ?? "0") });
        dispatch({ type: "SET_SRC_FEE", value: BigInt((data.srcFee as unknown as string) ?? "0") });
        dispatch({ type: "SET_TOTAL_FEES", value: BigInt((data.totalFees as unknown as string) ?? "0") + BigInt((data.srcFee as unknown as string) ?? "0") });
        dispatch({ type: "SET_MIN_OUT", value: BigInt((data.minAmountOut as unknown as string) ?? "0") });

        dispatch({ type: "QUOTE_LOADING", value: false });
        dispatch({ type: "SET_ERROR", message: null });
      }
    } catch (e) {
      if (ctrl.signal.aborted) return;
      console.log("Quote fetch error:", e)
      dispatch({ type: "QUOTE_LOADING", value: false });
      dispatch({ type: "SET_FEE_QUOTE", value: { rnkFee: 0n, destFee: 0n, deadline: 0, signature: ZERO_ADDR } });
      dispatch({ type: "SET_ERROR", message: "Quote failed" });
    } finally {
      if (inFlightRef.current === ctrl) inFlightRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildQuotePayload, postWithAbort]);

  const refreshQuote = useCallback((opts?: { force?: boolean }) => {
    const force = !!opts?.force;
    const hasPayload = !!buildQuotePayload();

    if (!hasPayload) {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      dispatch({ type: "SET_FEE_QUOTE", value: { rnkFee: 0n, destFee: 0n, deadline: 0, signature: ZERO_ADDR } });
      dispatch({ type: "QUOTE_LOADING", value: false });
      dispatch({ type: "SET_ERROR", message: null });
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (force) fetchQuote();
    else debounceRef.current = window.setTimeout(fetchQuote, 450) as unknown as number;
  }, [buildQuotePayload, fetchQuote]);

  useEffect(() => {
    refreshQuote();
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [
    state.srcChainId,
    state.dstChainId,
    state.srcToken,
    state.dstToken,
    state.amountInRaw,
    refreshQuote,
  ]);

  useEffect(() => {
    if (!wallet.connected) return;

    const addr = wallet.address ?? ZERO_ADDR;

    if (state.srcInitiator !== addr) {
      dispatch({ type: "SET_SRC_INITIATOR", addr });
    }
    if (state.dstReceiver !== addr) {
      dispatch({ type: "SET_DST_RECEIVER", addr });
    }
  }, [
    wallet.connected,
    wallet.address,
    state.srcInitiator,
    state.dstReceiver,
    dispatch,
  ]);

  const dstBridge = useMemo(
    () => CHAINS_TOKENS.find(c => c.chainId === state.dstChainId)?.bridge,
    [state.dstChainId]
  );

  const srcChain = useMemo(
    () => CHAINS_TOKENS.find(c => c.chainId === state.srcChainId),
    [state.srcChainId]
  );
  const dstChain = useMemo(
    () => CHAINS_TOKENS.find(c => c.chainId === state.dstChainId),
    [state.dstChainId]
  );

  const srcTokenMeta = useMemo(
    () => srcChain?.tokens.find(t => t.tokenAddress.toLowerCase() === state.srcToken.toLowerCase()),
    [srcChain, state.srcToken]
  );
  const dstTokenMeta = useMemo(
    () => dstChain?.tokens.find(t => t.tokenAddress.toLowerCase() === state.dstToken.toLowerCase()),
    [dstChain, state.dstToken]
  );

  const srcBalance = useMemo(() => {
    if (!srcTokenMeta) return undefined;
    return wallet.getBalance?.(state.srcChainId, srcTokenMeta.tokenAddress);
  }, [wallet, state.srcChainId, srcTokenMeta]);

  const dstBalance = useMemo(() => {
    if (!dstTokenMeta) return undefined;
    return wallet.getBalance?.(state.dstChainId, dstTokenMeta.tokenAddress);
  }, [wallet, state.dstChainId, dstTokenMeta]);

  const srcPriceUsd = useMemo(() => {
    if (!srcTokenMeta) return undefined;
    return wallet.getPriceUsd?.(state.srcChainId, srcTokenMeta.tokenAddress);
  }, [wallet, state.srcChainId, srcTokenMeta]);

  const dstPriceUsd = useMemo(() => {
    if (!dstTokenMeta) return undefined;
    return wallet.getPriceUsd?.(state.dstChainId, dstTokenMeta.tokenAddress);
  }, [wallet, state.dstChainId, dstTokenMeta]);

  const srcValueUsd = useMemo(() => {
    if (!srcPriceUsd) return undefined;
    return (Number(state.amountIn) ?? 0) * srcPriceUsd;
  }, [srcPriceUsd, state.amountIn]);

  const dstValueUsd = useMemo(() => {
    if (!dstPriceUsd) return undefined;
    return (state.amountOut ?? 0) * dstPriceUsd;
  }, [dstPriceUsd, state.amountOut]);

  /* ── actions ───────────────────────────────── */

  const setSrcInitiator = useCallback((a: `0x${string}`) => {
    dispatch({ type: "SET_SRC_INITIATOR", addr: a });
  }, []);

  const setDstReceiver = useCallback((a?: `0x${string}`) => {
    dispatch({ type: "SET_DST_RECEIVER", addr: a });
  }, []);

  const setSrcChain = useCallback((id: number) => {
    dispatch({ type: "SET_SRC_CHAIN", chainId: id });
  }, []);

  const setDstChain = useCallback((id: number) => {
    dispatch({ type: "SET_DST_CHAIN", chainId: id });
  }, []);

  const setSrcToken = useCallback((addr: `0x${string}`) => {
    dispatch({ type: "SET_SRC_TOKEN", addr });
  }, []);

  const setDstToken = useCallback((addr: `0x${string}`) => {
    dispatch({ type: "SET_DST_TOKEN", addr });
  }, []);

  const swapSides = useCallback(() => {
    dispatch({ type: "SWAP_SIDES" });
  }, []);

  const setAmountIn = useCallback(
    (val: string) => {
      const dec = srcTokenMeta?.decimals ?? 18;
      let nextRaw = 0n;
      try {
        const trimmed = val.trim();
        nextRaw = trimmed ? parseUnits(trimmed as `${number}`, dec) : 0n;
      } catch {
        nextRaw = 0n;
      }

      dispatch({ type: "SET_AMOUNT_IN", value: val, amountRaw: nextRaw });
    },
    [srcTokenMeta?.decimals]
  );

  const setAmountOut = useCallback(
    (val: number) => {
      const dec = dstTokenMeta?.decimals ?? 18;
      let raw = 0n;
      try {
        const trimmed = val.toString().trim();
        raw = trimmed ? parseUnits(trimmed as `${number}`, dec) : 0n;
      } catch {
        raw = 0n;
      }
      dispatch({ type: "SET_AMOUNT_OUT", value: val, amountRaw: raw });
    },
    [dstTokenMeta?.decimals]
  );

  const setMinAmountOut = useCallback((v: bigint) => {
    dispatch({ type: "SET_MIN_OUT", value: v });
  }, []);

  const setSwapPaths = useCallback((srcPath: `0x${string}`, dstPath: `0x${string}`) => {
    dispatch({ type: "SET_SWAP_PATHS", srcPath, dstPath });
  }, []);

  const setPermit2 = useCallback((v: Permit2) => {
    dispatch({ type: "SET_PERMIT2", value: v });
  }, []);

  const setNeedsPermit2Approve = useCallback((v: boolean) => {
    dispatch({ type: "SET_NEEDS_PERMIT2_APPROVE", value: v });
  }, []);

  const setSrcFee = useCallback((v: bigint) => {
    dispatch({ type: "SET_SRC_FEE", value: v });
  }, []);

  const clearQuote = useCallback(() => {
    dispatch({ type: "SET_AMOUNT_OUT", value: 0, amountRaw: 0n });
    dispatch({ type: "SET_MIN_OUT", value: 0n });
  }, []);

  const clearFeeQuote = useCallback(() => {
    dispatch({ type: "SET_FEE_QUOTE", value: { rnkFee: 0n, destFee: 0n, deadline: 0, signature: ZERO_ADDR } });
  }, []);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  /* ── context value ─────────────────────────── */

  const value: BridgeContextValue = useMemo(
    () => ({
      ...state,

      srcChain,
      dstChain,
      dstBridge,
      srcTokenMeta,
      dstTokenMeta,

      srcBalance,
      dstBalance,
      srcPriceUsd,
      dstPriceUsd,
      srcValueUsd,
      dstValueUsd,

      setSrcInitiator,
      setDstReceiver,
      setSrcChain,
      setDstChain,

      setSrcToken,
      setDstToken,
      swapSides,

      setAmountIn,
      setAmountOut,
      setMinAmountOut,

      setSwapPaths,

      setPermit2,
      setNeedsPermit2Approve,

      setSrcFee,
      clearQuote,
      clearFeeQuote,
      
      refreshQuote,
      reset,
    }),
    [
      state,
      srcChain, dstChain, dstBridge, srcTokenMeta, dstTokenMeta,
      srcBalance, dstBalance, srcPriceUsd, dstPriceUsd,
      setSrcInitiator, setDstReceiver, setSrcChain, setDstChain,
      dstValueUsd, refreshQuote, setAmountOut, srcValueUsd,
      setSrcToken, setDstToken, swapSides, setSrcFee,
      setAmountIn, setMinAmountOut, setPermit2,
      setSwapPaths, setNeedsPermit2Approve,
      clearQuote, clearFeeQuote,
      reset,
    ]
  );

  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>;
}

/* ──────────────────────────────────────────
   Hook
────────────────────────────────────────── */

export function useBridge() {
  const ctx = useContext(BridgeContext);
  if (!ctx) throw new Error("useBridge must be used inside BridgeProvider");
  return ctx;
}