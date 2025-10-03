import { BaseError, ContractFunctionRevertedError, Hex, maxUint256, PublicClient } from "viem";
import { useWalletData } from "@/providers/WalletDataProvider";
import { usePSM } from "@/providers/PSMProvider";
import { useWriteContract } from "wagmi";
import { usePublicClientByChain } from "@/libs/publicClients";

export const PSM_ADDRESS = "0x08D00b3F3a3c2Ba0b0d5cfd9c7c8578A6Cb8578e" as `0x${string}`;

export const PSM_ABI = [
  // MINT (stable -> goUSD)
  {
    type: "error",
    name: "InsufficientReserve",
    inputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "deposit",
    inputs: [
      { name: "sym", type: "bytes32" },
      { name: "stableAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "depositWithPermit",
    inputs: [
      { name: "sym", type: "bytes32" },
      { name: "stableAmount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },

  // REDEEM (goUSD -> stable)
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "redeem",
    inputs: [
      { name: "sym", type: "bytes32" },
      { name: "goUSD18", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "redeemWithPermit",
    inputs: [
      { name: "sym", type: "bytes32" },
      { name: "goUSD18", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },

  { type: "function", stateMutability: "pure", name: "symUSDC", inputs: [], outputs: [{ type: "bytes32", name: "" }] },
  { type: "function", stateMutability: "pure", name: "symUSDT", inputs: [], outputs: [{ type: "bytes32", name: "" }] },
  { type: "function", stateMutability: "pure", name: "symDAI",  inputs: [], outputs: [{ type: "bytes32", name: "" }] },

  {
    type: "event",
    name: "Minted",
    inputs: [
      { indexed: true,  name: "sym",     type: "bytes32" },
      { indexed: true,  name: "user",    type: "address" },
      { indexed: false, name: "stableIn",type: "uint256" },
      { indexed: false, name: "goUSDOut",type: "uint256" },
      { indexed: false, name: "fee",     type: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Redeemed",
    inputs: [
      { indexed: true,  name: "sym",      type: "bytes32" },
      { indexed: true,  name: "user",     type: "address" },
      { indexed: false, name: "goUSDIn",  type: "uint256" },
      { indexed: false, name: "stableOut",type: "uint256" },
    ],
    anonymous: false,
  },
] as const;

const ERC20_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const

async function readSymBySymbol(opts: {
  pc: PublicClient;
  chainId: number;
  symbol: string; // "USDC" | "USDT" | "DAI"
}): Promise<Hex> {
  const { pc, symbol } = opts;
  const client = pc;

  const fn =
    symbol.toUpperCase() === "USDC" ? "symUSDC" :
    symbol.toUpperCase() === "USDT" ? "symUSDT" :
    symbol.toUpperCase() === "DAI"  ? "symDAI"  : null;

  if (!fn) throw new Error(`Unsupported symbol: ${symbol}`);

  const sym = await client.readContract({
    abi: PSM_ABI,
    address: PSM_ADDRESS,
    functionName: fn as "symUSDC" | "symUSDT" | "symDAI",
    args: [],
  });

  return sym as Hex; // bytes32
}

export function useWithPSM() {
  const getPc = usePublicClientByChain();
  const wallet = useWalletData();
  const PSM = usePSM();
  const { writeContractAsync } = useWriteContract();

  async function mintApprove(opts?: { isMax?: boolean }) {
    try {
      if (!wallet.address || !wallet.isReady || !wallet.connected) throw new Error("Wallet not ready");
      if (PSM.mode !== "mint") throw new Error("Wrong mode");
      if (!PSM.amountInRaw || PSM.amountInRaw === 0n) throw new Error("Amount is zero");
      if (!PSM.fromTokenMeta) throw new Error("fromTokenMeta missing");

      const chainId = PSM.chain!.chainId;
      const pc = getPc(chainId);
      const token = PSM.fromTokenMeta.tokenAddress as `0x${string}`;
      const amount = opts?.isMax ? maxUint256 : PSM.amountInRaw;

      const current: bigint = await pc.readContract({
        abi: ERC20_ABI, address: token, functionName: "allowance",
        args: [wallet.address, PSM_ADDRESS],
      });
      if (current >= PSM.amountInRaw) {
        return { ok: true as const};
      } 

      const forceReset = (PSM.fromTokenMeta!.symbol ?? "").toUpperCase() === "USDT";

      if (forceReset && current > 0n) {
        await pc.estimateContractGas({
          abi: ERC20_ABI, address: token, functionName: "approve",
          args: [PSM_ADDRESS, 0n], account: wallet.address,
        });

        const tx = await writeContractAsync({
          abi: ERC20_ABI, address: token, functionName: "approve",
          args: [PSM_ADDRESS, 0n], account: wallet.address,
        });

        await pc.waitForTransactionReceipt({ hash: tx });
      };

      await pc.estimateContractGas({
        abi: ERC20_ABI, address: token, functionName: "approve",
        args: [PSM_ADDRESS, amount], account: wallet.address,
      });

      const tx = await writeContractAsync({
        abi: ERC20_ABI, address: token, functionName: "approve",
        args: [PSM_ADDRESS, amount], account: wallet.address,
      });

      const receipt = await pc.waitForTransactionReceipt({ hash: tx });

      return { ok: true as const, hash: receipt.transactionHash };
    } catch {
      return { ok: false as const, hash: "" };
    }
  }

  async function redeemApprove(opts?: { isMax?: boolean }) {
    try {
      if (!wallet.address || !wallet.isReady || !wallet.connected) throw new Error("Wallet not ready");
      if (PSM.mode !== "redeem") throw new Error("Wrong mode");
      if (!PSM.amountInRaw || PSM.amountInRaw === 0n) throw new Error("Amount is zero");

      const chainId = PSM.chain!.chainId;
      const pc = getPc(chainId);
      const goUSD = PSM.goUSDTokenMeta.tokenAddress as `0x${string}`;
      const amount = opts?.isMax ? maxUint256 : PSM.amountInRaw;

      const current: bigint = await pc.readContract({
        abi: ERC20_ABI, address: goUSD, functionName: "allowance",
        args: [wallet.address, PSM_ADDRESS],
      });
      if (current >= PSM.amountInRaw) {
        return { ok: true as const, message: "Approve gerekmiyor ✅" };
      }

      await pc.estimateContractGas({
        abi: ERC20_ABI, address: goUSD, functionName: "approve",
        args: [PSM_ADDRESS, amount], account: wallet.address,
      });

      const tx = await writeContractAsync({
        abi: ERC20_ABI, address: goUSD, functionName: "approve",
        args: [PSM_ADDRESS, amount], account: wallet.address,
      });

      const receipt = await pc.waitForTransactionReceipt({ hash: tx });

      return { ok: true as const, hash: receipt.transactionHash };
    } catch {
      return { ok: false as const, hash: "" };
    }
  }

  async function mintGOUSD() {
    try {
      if (!wallet.address || !wallet.isReady || !wallet.connected) throw new Error("Wallet not ready");
      if (PSM.mode !== "mint") throw new Error("Wrong mode");
      if (!PSM.amountInRaw || PSM.amountInRaw === 0n) throw new Error("Amount is zero");
      if (!PSM.fromTokenMeta) throw new Error("fromTokenMeta missing");

      const chainId = PSM.chain!.chainId;
      const pc = getPc(chainId);
      const sym = await readSymBySymbol({pc, chainId, symbol: PSM.fromTokenMeta.symbol!}); // USDC/USDT/DAI

      await pc.estimateContractGas({
        abi: PSM_ABI, address: PSM_ADDRESS, functionName: "deposit",
        args: [sym, PSM.amountInRaw], account: wallet.address,
      });

      const tx = await writeContractAsync({
        abi: PSM_ABI, address: PSM_ADDRESS, functionName: "deposit",
        args: [sym, PSM.amountInRaw], account: wallet.address,
      });

      const receipt = await pc.waitForTransactionReceipt({ hash: tx });

      return { ok: true as const, hash: receipt.transactionHash, message: "" };
    } catch (err) {
      return { ok: false as const, hash: "", message: (err as any).message || "" };
    }
  }

  async function redeemGOUSD() {
    try {
      if (!wallet.address || !wallet.isReady || !wallet.connected) throw new Error("Wallet not ready");
      if (PSM.mode !== "redeem") throw new Error("Wrong mode");
      if (!PSM.amountInRaw || PSM.amountInRaw === 0n) throw new Error("Amount is zero");
      if (!PSM.toTokenMeta) throw new Error("toTokenMeta missing");

      const chainId = PSM.chain!.chainId;
      const pc = getPc(chainId);
      const sym = await readSymBySymbol({ pc, chainId, symbol: PSM.toTokenMeta.symbol! });

      await pc.estimateContractGas({
        abi: PSM_ABI, address: PSM_ADDRESS, functionName: "redeem",
        args: [sym, PSM.amountInRaw], account: wallet.address,
      });

      const tx = await writeContractAsync({
        abi: PSM_ABI, address: PSM_ADDRESS, functionName: "redeem",
        args: [sym, PSM.amountInRaw], account: wallet.address,
      });

      const receipt = await pc.waitForTransactionReceipt({ hash: tx });

      return { ok: true as const, hash: receipt.transactionHash, message: "" };
    } catch (err) {
      if (err instanceof BaseError) {
        const revert = err.walk?.((e) => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | undefined;
        switch (revert?.data?.errorName) {
          case "InsufficientReserve":
            return { ok: false as const, hash: "", message: "Not enough reserve on PSM. Try it with a different token." };
        }
      }
      return { ok: false as const, hash: "", message: (err as any).message || "" };
    }
  }

  return { mintApprove, redeemApprove, mintGOUSD, redeemGOUSD };
}
