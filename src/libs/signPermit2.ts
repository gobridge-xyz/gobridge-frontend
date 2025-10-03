// signPermit2.ts (frontend)
import { useAccount, useSignTypedData } from "wagmi";
import { useBridge } from "@/providers/BridgeProvider";

export function useSignPermit2() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const bridge = useBridge();

  async function sign(): Promise<void> {
    if (!address) throw new Error("Connect wallet");

    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const nonce = BigInt('0x' + (Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')));

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

    const sig = await signTypedDataAsync({
      domain: { name: "Permit2", chainId: bridge.srcChainId, verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3' },
      primaryType: 'PermitWitnessTransferFrom',
      types: {
        BridgeWitness: [
          { name: 'destTo', type: 'address' },
          { name: 'destToken', type: 'address' },
          { name: 'minAmountOut', type: 'uint256' },
          { name: 'destChainId', type: 'uint64' },
          { name: 'deadline', type: 'uint64' },
          { name: 'permitNonce', type: 'uint256' },
        ],
        PermitWitnessTransferFrom: [
          { name: 'permitted', type: 'TokenPermissions' },
          { name: 'spender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'witness', type: 'BridgeWitness' },
        ],
        TokenPermissions: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
      },
      message: {
        permitted: {
          token: bridge.srcToken,
          amount: bridge.amountInRaw,
        },
        spender: bridge.srcChain?.bridge as `0x${string}`,
        nonce: nonce,
        deadline: deadline,
        witness: {
          destTo: bridge.dstReceiver ?? bridge.srcInitiator,
          destToken: bridge.dstToken,
          minAmountOut: bridge.minAmountOut,
          destChainId: BigInt(bridge.dstChainId),
          deadline: deadline,
          permitNonce: nonce,
        },
      }
    })

    bridge.setPermit2({
      nonce: nonce,
      deadline: Number(deadline),
      signature: sig as `0x${string}`,
    })
  }

  return { sign };
}