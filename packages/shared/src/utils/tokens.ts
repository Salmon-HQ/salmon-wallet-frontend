import type { DetectedERC20Token } from '../api/services/ethereum';
import type { TokenSelectorToken } from '../types/ui/token-selector';
import { SOL_CONSTANTS } from './balance';

// ============================================================================
// ETH Constants
// ============================================================================

/** ETH token constants */
export const ETH_CONSTANTS = {
  DECIMALS: 18,
  SYMBOL: 'ETH',
  NAME: 'Ethereum',
  ADDRESS: '',
  COINGECKO_ID: 'ethereum',
} as const;

/** Null address representing native ETH */
export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

/** Alternative null address for native ETH */
export const ETH_ADDRESS_ALT = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

/** Minimal ERC20 ABI for reading token metadata and balances */
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
] as const;

// ============================================================================
// Native Token Checks
// ============================================================================

/**
 * Checks if an address is the native SOL address
 *
 * @param address - Token address to check
 * @returns True if address is native SOL
 */
export function isNativeSol(address: string | null | undefined): boolean {
  return address === null || address === undefined || address === SOL_CONSTANTS.ADDRESS;
}

/**
 * Checks if an address represents native ETH
 *
 * @param address - Token address to check
 * @returns True if address is native ETH
 */
export function isNativeEth(address: string | null | undefined): boolean {
  if (!address) return true;
  const normalized = address.toLowerCase();
  return normalized === ETH_ADDRESS.toLowerCase() || normalized === ETH_ADDRESS_ALT.toLowerCase();
}

// ============================================================================
// Ethereum Transfer Token Types & Factories
// ============================================================================

/** Token types supported by the Ethereum transfer service */
export type TokenType = 'native' | 'erc20' | 'erc721' | 'erc1155';

/**
 * Token information for Ethereum transfers
 */
export interface TransferToken {
  /** Contract address (ETH_ADDRESS for native ETH) */
  address: string;
  /** Token decimals (18 for ETH, varies for ERC20) */
  decimals: number;
  /** Token symbol (e.g., 'ETH', 'USDC') */
  symbol?: string;
  /** Token type */
  type: TokenType;
}

/**
 * Creates a TransferToken object for native ETH
 */
export function createNativeToken(decimals: number = 18): TransferToken {
  return { address: ETH_ADDRESS, decimals, symbol: 'ETH', type: 'native' };
}

/**
 * Creates a TransferToken object for an ERC20 token
 */
export function createERC20Token(
  address: string,
  decimals: number,
  symbol?: string
): TransferToken {
  return { address, decimals, symbol, type: 'erc20' };
}

/**
 * Creates a TransferToken object for an ERC721 NFT
 */
export function createERC721Token(address: string, symbol?: string): TransferToken {
  return { address, decimals: 0, symbol, type: 'erc721' };
}

/**
 * Creates a TransferToken object for an ERC1155 multi-token
 */
export function createERC1155Token(address: string, symbol?: string): TransferToken {
  return { address, decimals: 0, symbol, type: 'erc1155' };
}

// ============================================================================
// Token Search / Filtering
// ============================================================================

const MIN_SEARCH_LENGTH = 3;

/**
 * Filters tokens locally by name or symbol.
 * Returns all tokens if query is shorter than MIN_SEARCH_LENGTH.
 */
export function filterTokensLocally(
  tokens: TokenSelectorToken[],
  query: string
): TokenSelectorToken[] {
  if (query.length < MIN_SEARCH_LENGTH) {
    return tokens;
  }

  const lowerQuery = query.toLowerCase();
  return tokens.filter(
    (token) =>
      (token.name || '').toLowerCase().includes(lowerQuery) ||
      (token.symbol || '').toLowerCase().includes(lowerQuery)
  );
}

// ============================================================================
// CoinGecko ID Lookups
// ============================================================================

/**
 * Known token mappings for coingeckoId lookups
 * Maps lowercase contract address to coingeckoId
 */
export const KNOWN_COINGECKO_IDS: Record<string, string> = {
  // Stablecoins
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'usd-coin', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'tether', // USDT
  '0x6b175474e89094c44da98b954eedec16991e0f68': 'dai', // DAI
  '0x4fabb145d64652a948d72533023f6e7a623c7c53': 'binance-usd', // BUSD
  '0x8e870d67f660d95d5be530380d0ec0bd388289e1': 'paxos-standard', // USDP
  '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd': 'gemini-dollar', // GUSD
  '0x853d955acef822db058eb8505911ed77f175b99e': 'frax', // FRAX

  // Wrapped tokens
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'weth', // WETH
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'wrapped-bitcoin', // WBTC

  // DeFi tokens
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'uniswap', // UNI
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'aave', // AAVE
  '0xc00e94cb662c3520282e6f5717214004a7f26888': 'compound-governance-token', // COMP
  '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': 'maker', // MKR
  '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2': 'sushi', // SUSHI
  '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e': 'yearn-finance', // YFI
  '0xd533a949740bb3306d119cc777fa900ba034cd52': 'curve-dao-token', // CRV
  '0xba100000625a3754423978a60c9317c58a424e3d': 'balancer', // BAL
  '0x111111111117dc0aa78b770fa6a738034120c302': '1inch', // 1INCH

  // Other popular tokens
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'chainlink', // LINK
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': 'shiba-inu', // SHIB
  '0x4d224452801aced8b2f0aebe155379bb5d594381': 'apecoin', // APE
  '0x3845badade8e6dff049820680d1f14bd3903a5d0': 'the-sandbox', // SAND
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 'matic-network', // MATIC (ERC20)
  '0xbb0e17ef65f82ab018d8edd776e8dd940327b28b': 'axie-infinity', // AXS
  '0x15d4c048f83bd7e37d49ea4c83a07267ec4203da': 'gala', // GALA
  '0x4e15361fd6b4bb609fa63c81a2be19d873717870': 'fantom', // FTM (ERC20)
};

/**
 * Look up CoinGecko ID for a token address
 *
 * @param address - Token contract address
 * @returns CoinGecko ID if known, undefined otherwise
 */
export function lookupCoingeckoId(address: string): string | undefined {
  return KNOWN_COINGECKO_IDS[address.toLowerCase()];
}

/**
 * Convert hex balance string to bigint
 *
 * @param hexBalance - Balance as hex string (e.g., "0x123")
 * @returns Balance as bigint
 */
export function hexToBalance(hexBalance: string): bigint {
  if (!hexBalance || hexBalance === '0x0' || hexBalance === '0x') {
    return 0n;
  }
  return BigInt(hexBalance);
}

/**
 * Format token balance for display
 *
 * @param balance - Raw balance as bigint or string
 * @param decimals - Token decimals
 * @param displayDecimals - Number of decimals to show (default: 4)
 * @returns Formatted balance string
 */
export function formatERC20TokenBalance(
  balance: bigint | string,
  decimals: number,
  displayDecimals: number = 4
): string {
  const balanceBigInt = typeof balance === 'string' ? BigInt(balance) : balance;
  const divisor = BigInt(10 ** decimals);

  const wholePart = balanceBigInt / divisor;
  const fractionPart = balanceBigInt % divisor;

  const fractionStr = fractionPart.toString().padStart(decimals, '0').slice(0, displayDecimals);

  const numValue = parseFloat(`${wholePart}.${fractionStr}`);

  if (numValue === 0) return '0';
  if (numValue < 0.0001) return '<0.0001';
  if (numValue >= 1_000_000) return `${(numValue / 1_000_000).toFixed(2)}M`;
  if (numValue >= 1000) return `${(numValue / 1000).toFixed(2)}K`;

  return numValue.toFixed(displayDecimals);
}

/**
 * Merge featured tokens with detected tokens
 *
 * Combines automatically detected tokens with a list of featured tokens,
 * deduplicating by address.
 *
 * @param detectedTokens - Tokens detected via API
 * @param featuredTokens - Hardcoded featured tokens to check
 * @returns Combined array of tokens
 */
export function mergeTokenLists(
  detectedTokens: DetectedERC20Token[],
  featuredTokens: Array<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoUri?: string;
    coingeckoId?: string;
  }>
): DetectedERC20Token[] {
  const tokenMap = new Map<string, DetectedERC20Token>();

  // Add detected tokens first (they have balances)
  detectedTokens.forEach((token) => {
    tokenMap.set(token.address.toLowerCase(), token);
  });

  // Featured tokens are only added if not already present (they may have zero balance)
  featuredTokens.forEach((token) => {
    const key = token.address.toLowerCase();
    if (!tokenMap.has(key)) {
      tokenMap.set(key, {
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        balance: '0',
        uiAmount: 0,
        logoUri: token.logoUri,
        coingeckoId: token.coingeckoId,
      });
    }
  });

  // Return only tokens with non-zero balance
  return Array.from(tokenMap.values()).filter((token) => token.uiAmount > 0);
}

/**
 * Get a unique key for a token (used as React key / keyExtractor)
 */
export function getTokenKey(token: TokenSelectorToken): string {
  return token.mint || token.address || token.symbol || Math.random().toString();
}

// ============================================================================
// Feature Badge Colors
// ============================================================================

export const DEFAULT_FEATURE_COLORS = [
  '#FF5C45',
  '#10B981',
  '#8B5CF6',
  '#F59E0B',
  '#3B82F6',
  '#EC4899',
];
