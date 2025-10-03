import { useBridge } from "@/providers/BridgeProvider";
import { useMemo } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

export const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

export function useEnsurePermit2Approval() {
  const { address } = useAccount();
  const bridge = useBridge();
  const { data: allowance } = useReadContract({
    address: bridge.srcToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, PERMIT2_ADDRESS],
    query: { enabled: !!address && !!bridge.srcToken },
  });

  const { writeContractAsync } = useWriteContract();

  async function ensureApproval(): Promise<void> {
    if (!address) throw new Error("Not connected");
    if ((allowance ?? 0n) >= bridge.amountInRaw) return;

    if (bridge.srcToken === "0x0000000000000000000000000000000000000000") return;

    if ((allowance ?? 0n) > 0n) {
      await writeContractAsync({
        address: bridge.srcToken,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [PERMIT2_ADDRESS, 0n],
      });
    }

    const MAX = (1n << 256n) - 1n;
    await writeContractAsync({
      address: bridge.srcToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [PERMIT2_ADDRESS, MAX],
    });
  }

   const needsApproval = useMemo(() => {
    if (!address) return true;
    return (allowance ?? 0n) < bridge.amountInRaw;
  }, [address, allowance, bridge.amountInRaw]);

  return { ensureApproval, allowance, needsApproval };
}