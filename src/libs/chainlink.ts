import { formatUnits, PublicClient } from "viem";
import type { TokenConfig } from "@/data/chains_tokens";

const aggregatorV3InterfaceABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function fetchPricesChainlink(
  inputs: { chainId: number; token: TokenConfig; pc: PublicClient }[]
): Promise<Record<`0x${string}`, number>> {
  const out: Record<`0x${string}`, number> = {};

  for (const i of inputs) {
    try {
      const decimals = await i.pc.readContract({
        address: i.token.priceFeed.proxy,
        abi: aggregatorV3InterfaceABI,
        functionName: "decimals",
      });

      const [ , answer ] = await i.pc.readContract({
        address: i.token.priceFeed.proxy,
        abi: aggregatorV3InterfaceABI,
        functionName: "latestRoundData",
      }) as [bigint, bigint, bigint, bigint, bigint];

      const price = Number(formatUnits(answer, decimals));
      if (!isNaN(price)) {
        out[i.token.tokenAddress.toLowerCase() as `0x${string}`] = price;
      }
    } catch (err) {
      console.error(`Price fetch failed for ${i.token.symbol}`, err);
    }
  }

  return out;
}