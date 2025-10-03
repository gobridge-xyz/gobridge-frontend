"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { formatUnits, parseUnits } from "viem";

import { CHAINS_TOKENS, type ChainConfig, type TokenConfig } from "@/data/chains_tokens";
import { useWalletData } from "@/providers/WalletDataProvider";

export type PSMState = {
  mode: "mint" | "redeem";
  minter: `0x${string}`;

  fromToken: `0x${string}`;
  toToken: `0x${string}`;

  amountIn: string;
  amountInRaw: bigint;

  amountOut: string;
  amountOutRaw: bigint;

  chainFee: bigint;
  chainFeeUSD: string;

  needsApprove: boolean;

  loadingQuote: boolean;
  error?: string | null;
};

type Action =
  | { type: "SET_MODE"; mode: "mint" | "redeem" }
  | { type: "SET_MINTER"; addr: `0x${string}` }
  | { type: "SET_FROM_TOKEN"; addr: `0x${string}` }
  | { type: "SET_TO_TOKEN"; addr: `0x${string}` }
  | { type: "SET_AMOUNT_IN"; value: string; amountRaw: bigint }
  | { type: "SET_AMOUNT_OUT"; value: string; amountRaw: bigint }
  | { type: "SET_CHAIN_FEE"; native: bigint; USD: string }
  | { type: "SET_NEEDS_APPROVE"; value: boolean }
  | { type: "QUOTE_LOADING"; value: boolean }
  | { type: "SET_ERROR"; message?: string | null }
  | { type: "RESET" };

/* ──────────────────────────────────────────
   Initial helpers
────────────────────────────────────────── */
function scaleUnits(
  amt: bigint,
  fromDec: number,
  toDec: number,
  rounding: "down" | "up" | "nearest" = "down"
): bigint {
  if (fromDec === toDec) return amt;

  if (toDec > fromDec) {
    const mul = 10n ** BigInt(toDec - fromDec);
    return amt * mul;
  } else {
    const div = 10n ** BigInt(fromDec - toDec);
    if (rounding === "nearest") return (amt + div / 2n) / div;
    if (rounding === "up")      return (amt + (div - 1n)) / div;
    return amt / div;
  }
}

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

const mainnet = CHAINS_TOKENS.find(c => c.chainId === 1)!;
const goUSDTokenMeta = mainnet.tokens.find(t => t.symbol === "goUSD")!;

const initialState: PSMState = {
  mode: "mint",
  minter: ZERO_ADDR,

  fromToken: mainnet.tokens.find(t => t.symbol === "USDC")?.tokenAddress ?? ZERO_ADDR,
  toToken: goUSDTokenMeta.tokenAddress ?? ZERO_ADDR,

  amountIn: "0",
  amountInRaw: 0n,

  amountOut: "0",
  amountOutRaw: 0n,

  chainFee: 0n,
  chainFeeUSD: "0",

  needsApprove: false,

  loadingQuote: false,
  error: null,
};

/* ──────────────────────────────────────────
   Reducer
────────────────────────────────────────── */

function reducer(state: PSMState, action: Action): PSMState {
  switch (action.type) {
    case "SET_MODE": {
      const newMode = action.mode;

      const currentFrom = state.fromToken;
      const currentTo   = state.toToken;

      let nextFrom = currentFrom;
      let nextTo   = currentTo;

      if (newMode === "mint") {
        const prevToIsGoUSD = currentTo.toLowerCase() === goUSDTokenMeta.tokenAddress.toLowerCase();
        nextTo = goUSDTokenMeta.tokenAddress;
        nextFrom = prevToIsGoUSD
          ? (mainnet.tokens.find(t => t.symbol === "USDC")?.tokenAddress ?? state.fromToken)
          : currentTo;
      } else {
        const prevFromIsGoUSD = currentFrom.toLowerCase() === goUSDTokenMeta.tokenAddress.toLowerCase();
        nextFrom = goUSDTokenMeta.tokenAddress;
        nextTo = prevFromIsGoUSD
          ? (mainnet.tokens.find(t => t.symbol === "USDC")?.tokenAddress ?? state.toToken)
          : currentFrom;
      }

      return {
        ...state,
        mode: newMode,
        fromToken: nextFrom,
        toToken: nextTo,
        amountIn: "0",
        amountInRaw: 0n,
        amountOut: "0",
        amountOutRaw: 0n,
      };
    }

    case "SET_MINTER":
      return { ...state, minter: action.addr };

    case "SET_FROM_TOKEN":
      return { ...state, fromToken: action.addr };

    case "SET_TO_TOKEN":
      return { ...state, toToken: action.addr };

    case "SET_AMOUNT_IN":
      return { ...state, amountIn: action.value, amountInRaw: action.amountRaw };

    case "SET_AMOUNT_OUT":
      return { ...state, amountOut: action.value, amountOutRaw: action.amountRaw };

    case "SET_CHAIN_FEE":
      return { ...state, chainFee: action.native, chainFeeUSD: action.USD };

    case "SET_NEEDS_APPROVE":
      return { ...state, needsApprove: action.value };

    case "QUOTE_LOADING":
      return { ...state, loadingQuote: action.value };

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

type PSMContextValue = PSMState & {
  STABLES: TokenConfig[];
  chain?: ChainConfig;

  fromTokenMeta?: TokenConfig;
  toTokenMeta?: TokenConfig;
  goUSDTokenMeta: TokenConfig;

  fromBalance?: { raw: bigint; formatted: string };
  toBalance?: { raw: bigint; formatted: string };
  fromPriceUsd?: number;
  toPriceUsd?: number;
  fromValueUsd?: number;
  toValueUsd?: number;

  setMode: (a: "mint" | "redeem") => void;
  setMinter: (a: `0x${string}`) => void;

  setFromToken: (a: `0x${string}`) => void;
  setToToken: (a: `0x${string}`) => void;

  setAmountIn: (val: string) => void;
  setAmountOut: (val: number) => void;

  setChainFee: (native: bigint, USD: string) => void;

  setNeedsApprove: (v: boolean) => void;

  setQuoteLoading: (v: boolean) => void;

  // reset
  reset: () => void;
};

const PSMContext = createContext<PSMContextValue | undefined>(undefined);

/* ──────────────────────────────────────────
   Provider
────────────────────────────────────────── */

const STABLE_SYMBOLS = ['USDC', 'USDT', 'DAI'] as const;

export function PSMProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wallet = useWalletData();

  const STABLES = useMemo(() => {
    const mainnet = wallet.chains?.find(c => c.chainId === 1);
    if (!mainnet) return [];
    return mainnet.tokens.filter(t => STABLE_SYMBOLS.includes(t.symbol as typeof STABLE_SYMBOLS[number]));
  }, [wallet.chains]);

  const isReady =
    !!wallet.address && wallet.connected && wallet.isReady;

  const fromTokenMeta = useMemo(
    () => mainnet.tokens.find(t => t.tokenAddress.toLowerCase() === state.fromToken.toLowerCase()),
    [state.fromToken]
  );

  const toTokenMeta = useMemo(
    () => mainnet.tokens.find(t => t.tokenAddress.toLowerCase() === state.toToken.toLowerCase()),
    [state.toToken]
  );

  useEffect(() => {
    if (!isReady || !fromTokenMeta || !toTokenMeta) return;

    const decIn  = fromTokenMeta.decimals ?? 18;
    const decOut = toTokenMeta.decimals ?? 18;

    const inRaw = state.amountInRaw ?? 0n;

    const afterFeeRaw = state.mode === "mint"
      ? (inRaw * 9975n) / 10000n
      : inRaw;

    const outRaw = scaleUnits(afterFeeRaw, decIn, decOut, "down");
    
    const outStr = formatUnits(outRaw, decOut);
     setAmountOut(Number(outStr));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, state.mode, state.amountInRaw, fromTokenMeta?.decimals, goUSDTokenMeta.decimals, fromTokenMeta, toTokenMeta]);

  const fromBalance = useMemo(() => {
    if (!fromTokenMeta) return undefined;
    return wallet.getBalance?.(mainnet.chainId, fromTokenMeta.tokenAddress);
  }, [wallet, fromTokenMeta]);

  const toBalance = useMemo(() => {
    if (!toTokenMeta) return undefined;
    return wallet.getBalance?.(mainnet.chainId, toTokenMeta.tokenAddress);
  }, [wallet, toTokenMeta]);

  const fromPriceUsd = useMemo(() => {
    if (!fromTokenMeta) return undefined;
    return wallet.getPriceUsd?.(mainnet.chainId, fromTokenMeta.tokenAddress);
  }, [wallet, fromTokenMeta]);

  const toPriceUsd = useMemo(() => {
    if (!toTokenMeta) return undefined;
    return wallet.getPriceUsd?.(mainnet.chainId, toTokenMeta.tokenAddress);
  }, [wallet, toTokenMeta]);

  const fromValueUsd = useMemo(() => {
    if (!fromPriceUsd) return undefined;
    return (Number(state.amountIn) ?? 0) * fromPriceUsd;
  }, [fromPriceUsd, state.amountIn]);

  const toValueUsd = useMemo(() => {
    if (!toPriceUsd) return undefined;
    return (Number(state.amountOut) ?? 0) * toPriceUsd;
  }, [toPriceUsd, state.amountOut]);

  /* ── actions ───────────────────────────────── */

  const setMode = useCallback((a: "mint" | "redeem") => {
    dispatch({ type: "SET_MODE", mode: a });
  }, []);

  const setMinter = useCallback((a: `0x${string}`) => {
    dispatch({ type: "SET_MINTER", addr: a });
  }, []);

  const setFromToken = useCallback((a: `0x${string}`) => {
    dispatch({ type: "SET_FROM_TOKEN", addr: a });
  }, []);

  const setToToken = useCallback((a: `0x${string}`) => {
    dispatch({ type: "SET_TO_TOKEN", addr: a });
  }, []);

  const setAmountIn = useCallback(
    (val: string) => {
      const dec = fromTokenMeta!.decimals ?? 18;
      let raw = 0n;
      try {
        const trimmed = val.trim();
        raw = trimmed ? parseUnits(trimmed as `${number}`, dec) : 0n;
      } catch {
        raw = 0n;
      }
      dispatch({ type: "SET_AMOUNT_IN", value: val, amountRaw: raw });
    },
    [fromTokenMeta]
  );

  const setAmountOut = useCallback(
    (val: number) => {
      const dec = goUSDTokenMeta.decimals;
      let raw = 0n;
      try {
        const trimmed = val.toString().trim();
        raw = trimmed ? parseUnits(trimmed as `${number}`, dec) : 0n;
      } catch {
        raw = 0n;
      }
      dispatch({ type: "SET_AMOUNT_OUT", value: val.toFixedTruncate(6).toString(), amountRaw: raw });
    },[]
  );

  const setChainFee = useCallback((value: bigint, USD: string) => {
    dispatch({ type: "SET_CHAIN_FEE", native: value, USD: USD });
  }, []);

  const setNeedsApprove = useCallback((bool: boolean) => {
    dispatch({ type: "SET_NEEDS_APPROVE", value: bool });
  }, []);

  const setQuoteLoading = useCallback((bool: boolean) => {
    dispatch({ type: "QUOTE_LOADING", value: bool });
  }, []);

  const setQuoteError = useCallback((message: string | null) => {
    dispatch({ type: "SET_ERROR", message });
  }, []);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  /* ── context value ─────────────────────────── */

  const value: PSMContextValue = useMemo(
    () => ({
      ...state,

      STABLES,
      chain: mainnet,

      goUSDTokenMeta,
      fromTokenMeta,
      toTokenMeta,

      fromBalance,
      toBalance,
      fromPriceUsd,
      toPriceUsd,
      fromValueUsd,
      toValueUsd,

      setMode,
      setMinter,
      setFromToken,
      setToToken,
      setAmountIn,
      setAmountOut,
      setChainFee,
      setNeedsApprove,
      setQuoteLoading,
      setQuoteError,
      reset
    }),
    [
      state,
      fromTokenMeta,
      toTokenMeta,
      fromBalance,
      toBalance,
      STABLES,
      fromPriceUsd,
      toPriceUsd,
      fromValueUsd,
      toValueUsd,
      setMode, setMinter, setFromToken, setToToken, setAmountIn, setAmountOut, setChainFee,
      setNeedsApprove, setQuoteLoading, reset, setQuoteError
    ]
  );

  return <PSMContext.Provider value={value}>{children}</PSMContext.Provider>;
}

/* ──────────────────────────────────────────
   Hook
────────────────────────────────────────── */

export function usePSM() {
  const ctx = useContext(PSMContext);
  if (!ctx) throw new Error("usePSM must be used inside PSMProvider");
  return ctx;
}