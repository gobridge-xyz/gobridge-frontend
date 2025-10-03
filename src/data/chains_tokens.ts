type Denom = "USD" | "ETH";

export type FeedInfo = {
  proxy: `0x${string}`;
  denom: Denom;
};

export type TokenConfig = {
  tokenAddress: `0x${string}`;
  decimals: number;
  symbol: string;
  name: string;
  icon?: string;
  priceFeed: FeedInfo;
};

export type ChainConfig = {
  chainId: number;
  rpcUrl: string;
  wssUrl?: string;
  name: string;
  icon: string;
  bridge?: `0x${string}`;
  blockExplorer?: string;
  active: boolean;
  tokens: TokenConfig[];
};

export const CHAINS_TOKENS: ChainConfig[] = [
  {
    chainId: 1,
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    wssUrl: "wss://ethereum-rpc.publicnode.com",
    name: "Ethereum",
    icon: "/chains/ethereum.png",
    bridge: "0x3Cf8F4abA78848012d9Ba3D4f3B543669287107B",
    blockExplorer: "https://etherscan.io/",
    active: true,
    tokens: [
      {
        tokenAddress: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        symbol: "ETH",
        name: "Ether",
        icon: "/tokens/eth.png",
        priceFeed: { proxy: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", denom: "USD" },
      },
      {
        tokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        decimals: 18,
        symbol: "WETH",
        name: "Wrapped Ether",
        icon: "/tokens/weth.png",
        priceFeed: { proxy: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", denom: "USD" },
      },
      {
        tokenAddress: "0xaDD290D9262768C039ca8Ce6013C7F2F20DD24c0",
        decimals: 18,
        symbol: "goUSD",
        name: "GoBridge USD",
        icon: "/tokens/gousd.svg",
        priceFeed: { proxy: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6", denom: "USD" },
      },
      {
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        decimals: 6,
        symbol: "USDC",
        name: "USD Coin",
        icon: "/tokens/usdc.png",
        priceFeed: { proxy: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6", denom: "USD" },
      },
      {
        tokenAddress: "0x6b175474e89094c44da98b954eedeac495271d0f",
        decimals: 18,
        symbol: "DAI",
        name: "Dai Stablecoin",
        icon: "/tokens/dai.png",
        priceFeed: { proxy: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9", denom: "USD" },
      },
      {
        tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals: 6,
        symbol: "USDT",
        name: "Tether USD",
        icon: "/tokens/usdt.svg",
        priceFeed: { proxy: "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D", denom: "USD" },
      },
    ]
  },
  {
    chainId: 8453,
    rpcUrl: "https://base-rpc.publicnode.com",
    wssUrl: "wss://base-rpc.publicnode.com",
    name: "Base",
    icon: "/chains/base.png",
    bridge: "0x274Df598AcA76e85a7a3A3c5a09ce076Cded3EAE",
    blockExplorer: "https://basescan.org/",
    active: true,
    tokens: [
      {
        tokenAddress: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        symbol: "ETH",
        name: "Ether",
        icon: "/tokens/eth.png",
        priceFeed: { proxy: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", denom: "USD" },
      },
      {
        tokenAddress: "0x4200000000000000000000000000000000000006",
        decimals: 18,
        symbol: "WETH",
        name: "Wrapped Ether",
        icon: "/tokens/weth.png",
        priceFeed: { proxy: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", denom: "USD" },
      },
      {
        tokenAddress: "0xaDD290D9262768C039ca8Ce6013C7F2F20DD24c0",
        decimals: 18,
        symbol: "goUSD",
        name: "GoBridge USD",
        icon: "/tokens/gousd.svg",
        priceFeed: { proxy: "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B", denom: "USD" },
      },
      {
        tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
        symbol: "USDC",
        name: "USD Coin",
        icon: "/tokens/usdc.png",
        priceFeed: { proxy: "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B", denom: "USD" },
      },
      {
        tokenAddress: "0x6b175474e89094c44da98b954eedeac495271d0f",
        decimals: 18,
        symbol: "DAI",
        name: "Dai Stablecoin",
        icon: "/tokens/dai.png",
        priceFeed: { proxy: "0x591e79239a7d679378eC8c847e5038150364C78F", denom: "USD" },
      },
      {
        tokenAddress: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        decimals: 6,
        symbol: "USDT",
        name: "Tether USD",
        icon: "/tokens/usdt.svg",
        priceFeed: { proxy: "0xf19d560eB8d2ADf07BD6D13ed03e1D11215721F9", denom: "USD" },
      },
    ]
  },
  {
    chainId: 42161,
    rpcUrl: "https://arbitrum-one-rpc.publicnode.com",
    wssUrl: "wss://arbitrum-one-rpc.publicnode.com",
    name: "Arbitrum One",
    icon: "/chains/arbitrum-one.png",
    bridge: "0x8601df7a871FAB7Ff7513AC95Cc7bd005326FAa5",
    blockExplorer: "https://arbiscan.io/",
    active: true,
    tokens: [
      {
        tokenAddress: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        symbol: "ETH",
        name: "Ether",
        icon: "/tokens/eth.png",
        priceFeed: { proxy: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612", denom: "USD" },
      },
      {
        tokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        decimals: 18,
        symbol: "WETH",
        name: "Wrapped Ether",
        icon: "/tokens/weth.png",
        priceFeed: { proxy: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612", denom: "USD" },
      },
      {
        tokenAddress: "0xaDD290D9262768C039ca8Ce6013C7F2F20DD24c0",
        decimals: 18,
        symbol: "goUSD",
        name: "GoBridge USD",
        icon: "/tokens/gousd.svg",
        priceFeed: { proxy: "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3", denom: "USD" },
      },
      {
        tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        decimals: 6,
        symbol: "USDC",
        name: "USD Coin",
        icon: "/tokens/usdc.png",
        priceFeed: { proxy: "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3", denom: "USD" },
      },
      {
        tokenAddress: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
        decimals: 18,
        symbol: "DAI",
        name: "Dai Stablecoin",
        icon: "/tokens/dai.png",
        priceFeed: { proxy: "0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB", denom: "USD" },
      },
      {
        tokenAddress: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        decimals: 6,
        symbol: "USDT",
        name: "Tether USD",
        icon: "/tokens/usdt.svg",
        priceFeed: { proxy: "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7", denom: "USD" },
      },
    ]
  },
  {
    chainId: 10,
    rpcUrl: "https://optimism-rpc.publicnode.com",
    name: "Optimism",
    icon: "/chains/optimism.png",
    active: false,
    tokens: [
      {
        tokenAddress: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        symbol: "ETH",
        name: "Ether",
        icon: "https://token-icons.s3.amazonaws.com/eth.png",
        priceFeed: { proxy: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419", denom: "USD" },
      }
    ]
  },
  {
    chainId: 999,
    rpcUrl: "https://rpc.hyperlend.finance",
    name: "HyperEVM",
    icon: "/chains/hyperevm.png",
    active: false,
    tokens: [{
        tokenAddress: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        symbol: "ETH",
        name: "Ether",
        icon: "https://token-icons.s3.amazonaws.com/eth.png",
        priceFeed: { proxy: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419", denom: "USD" },
      }]
  },
  {
    chainId: 43114,
    rpcUrl: "https://avalanche-c-chain.publicnode.com",
    name: "Avalanche",
    icon: "/chains/avalanche.png",
    active: false,
    tokens: [{
        tokenAddress: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        symbol: "ETH",
        name: "Ether",
        icon: "https://token-icons.s3.amazonaws.com/eth.png",
        priceFeed: { proxy: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419", denom: "USD" },
      }]
  },
  {
    chainId: 56,
    rpcUrl: "https://bsc-rpc.publicnode.com",
    name: "BNB Chain",
    icon: "/chains/bnb.png",
    active: false,
    tokens: [{
        tokenAddress: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        symbol: "ETH",
        name: "Ether",
        icon: "https://token-icons.s3.amazonaws.com/eth.png",
        priceFeed: { proxy: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419", denom: "USD" },
      }]
  },
  {
    chainId: 137,
    rpcUrl: "https://polygon-bor-rpc.publicnode.com",
    name: "Polygon",
    icon: "/chains/polygon.png",
    active: false,
    tokens: [{
        tokenAddress: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        symbol: "ETH",
        name: "Ether",
        icon: "https://token-icons.s3.amazonaws.com/eth.png",
        priceFeed: { proxy: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419", denom: "USD" },
      }]
  }
] as const;