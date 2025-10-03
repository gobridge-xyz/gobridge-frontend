export const BRIDGE_ABI = [
  {
    type: "function",
    stateMutability: "payable",
    name: "initiateBridge",
    inputs: [
      {
        name: "request",
        type: "tuple",
        components: [
          { name: "srcInitiator", type: "address" },
          { name: "destTo",       type: "address" },
          { name: "srcToken",     type: "address" },
          { name: "destToken",    type: "address" },
          { name: "amountIn",     type: "uint256" },
          { name: "minAmountOut", type: "uint256" },
          { name: "destChainId",  type: "uint64"  },
        ],
      },
      {
        name: "permit",
        type: "tuple",
        components: [
          { name: "owner",     type: "address" },
          { name: "nonce",     type: "uint256" },
          { name: "deadline",  type: "uint256" },
          { name: "signature", type: "bytes"   },
        ],
      },
      { name: "srcSwapPath",  type: "bytes" },
      { name: "destSwapPath", type: "bytes" },
      {
        name: "feeQuote",
        type: "tuple",
        components: [
          { name: "srcBridge",  type: "address" },
          { name: "srcChainId", type: "uint64"  },
          { name: "destChainId",type: "uint64"  },
          { name: "rnk",        type: "uint256" },
          { name: "dest",       type: "uint256" },
          { name: "expiresAt",  type: "uint64"  },
          { name: "signature",  type: "bytes"   },
        ],
      },
    ],
    outputs: [],
  },
] as const;