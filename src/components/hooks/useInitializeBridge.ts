import {
  type Hex,
  PublicClient,
  Address,
  parseAbiItem,
  TransactionReceipt
} from "viem";
import { useWriteContract } from "wagmi";
import { BRIDGE_ABI } from "@/libs/bridgeAbi";
import { useBridge } from "@/providers/BridgeProvider";
import { usePublicClientByChain } from "@/libs/publicClients";

function addGasMargin(g: bigint, bps = 1500) {
  return g + (g * BigInt(bps)) / 10_000n;
}

const BRIDGE_INITIALIZED_TOPIC0 =
  "0xbb4e2221f9347bcadff9aadb79493437e3abd69afe2647b192995a0193e269fd";

const FINALIZED_EVENT = parseAbiItem(
  'event BridgeFinalized(bytes32 indexed requestId, address to, address destToken, uint256 amountOut)'
);

function getRequestIdFromReceiptTopics(
  receipt: TransactionReceipt,
  bridgeAddress: `0x${string}`
): Hex | null {
  const log = receipt.logs.find(
    (l) =>
      l.address.toLowerCase() === bridgeAddress.toLowerCase() &&
      l.topics?.[0]?.toLowerCase() === BRIDGE_INITIALIZED_TOPIC0
  );

  console.log("getRequestIdFromReceiptTopics", { receipt, bridgeAddress, log });
  return (log?.topics?.[1] as Hex) ?? null;
}

export async function waitForFinalizeTxByRequestIdWS(
  wsPc: PublicClient,
  contract: Address,
  requestId: Hex,
  opts?: {
    httpFallbackClient?: PublicClient;
    timeoutMs?: number;
    lookbackBlocks?: bigint;
  }
): Promise<Hex> {
  const timeoutMs = opts?.timeoutMs ?? 10 * 60_000;
  const lookback = opts?.lookbackBlocks ?? 1_000n;

  console.log("Waiting for finalize on dest chain...", { contract, requestId, wsPc });

  const latest = await wsPc.getBlockNumber();
  const fromBlock = latest > lookback ? latest - lookback : 0n;
  const past = await wsPc.getLogs({
    address: contract,
    event: FINALIZED_EVENT,
    args: { requestId },
    fromBlock,
    toBlock: "latest",
  });
  if (past.length) return past[past.length - 1].transactionHash as Hex;

  let stop: (() => void) | null = null;

   const promise = new Promise<Hex>((resolve, reject) => {
    const timer =
      timeoutMs > 0
        ? (setTimeout(() => {
            stop?.();
            reject(new Error("waitForFinalize WS timeout"));
          }, timeoutMs) as unknown as number)
        : null;

    const unwatch = wsPc.watchContractEvent({
      address: contract,
      abi: [FINALIZED_EVENT],
      eventName: "BridgeFinalized",
      args: { requestId },
      onLogs: (logs) => {
        for (const log of logs) {
          if (log.args?.requestId === requestId) {
            if (timer) clearTimeout(timer);
            unwatch?.();
            resolve(log.transactionHash as Hex);
            return;
          }
        }
      },
      onError: async (e) => {
        console.warn("WS watch error:", e);
        unwatch?.();
      },
    });

    stop = () => {
      if (timer) clearTimeout(timer);
      unwatch?.();
    };
  });

  return promise;
}

export function useInitializeBridge() {
  const bridge = useBridge();
  const { writeContractAsync } = useWriteContract();
  const getPc = usePublicClientByChain();

  async function initializeBridge() {
    // ----- request payload -----
    const req = {
      srcInitiator: bridge.srcInitiator as `0x${string}`,
      destTo:       (bridge.dstReceiver ?? bridge.srcInitiator) as `0x${string}`,
      srcToken:     bridge.srcToken as `0x${string}`,
      destToken:    bridge.dstToken as `0x${string}`,
      amountIn:     bridge.amountInRaw,
      minAmountOut: bridge.minAmountOut,
      destChainId:  BigInt(bridge.dstChainId),
    };
    const permit = {
      owner:     bridge.srcInitiator,
      nonce:     BigInt(bridge.permit2.nonce),
      deadline:  BigInt(bridge.permit2.deadline),
      signature: bridge.permit2.signature! as `0x${string}`,
    };
    const feeQuote = {
      srcBridge:  bridge.srcChain!.bridge! as `0x${string}`,
      srcChainId: BigInt(bridge.srcChainId),
      destChainId:BigInt(bridge.dstChainId),
      rnk:        BigInt(bridge.feeQuote!.rnkFee),
      dest:       BigInt(bridge.feeQuote!.destFee),
      expiresAt:  BigInt(bridge.feeQuote!.deadline),
      signature:  bridge.feeQuote!.signature as `0x${string}`,
    };
    const args = [req, permit, bridge.srcSwapPath as Hex, bridge.dstSwapPath as Hex, feeQuote] as const;

    const ZERO = "0x0000000000000000000000000000000000000000";
    const isNative = req.srcToken.toLowerCase() === ZERO;
    const value = isNative ? req.amountIn : 0n;

    const srcPc = getPc(bridge.srcChainId);

    const { request: sim } = await srcPc.simulateContract({
      address: bridge.srcChain!.bridge! as `0x${string}`,
      abi: BRIDGE_ABI,
      functionName: "initiateBridge",
      args,
      account: bridge.srcInitiator as `0x${string}`,
      value,
    });
    const gas = await srcPc.estimateContractGas({
      address: bridge.srcChain!.bridge! as `0x${string}`,
      abi: BRIDGE_ABI,
      functionName: "initiateBridge",
      args,
      account: bridge.srcInitiator as `0x${string}`,
      value,
    });
    const gasWithMargin = addGasMargin(gas);

    // ----- send -----
    const txHash = await writeContractAsync({
      ...sim,
      gas: gasWithMargin,
    });

    // ----- wait receipt -----
    const receipt = await srcPc.waitForTransactionReceipt({ hash: txHash });

    const requestId = getRequestIdFromReceiptTopics(receipt, bridge.srcChain!.bridge!);

    if (!requestId) throw new Error("requestId not found in source receipt logs");

    return {
      txHash: txHash,
      requestId: requestId,
    };
  }

  return { initializeBridge };
}