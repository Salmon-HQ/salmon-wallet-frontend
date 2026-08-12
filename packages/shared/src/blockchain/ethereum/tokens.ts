/**
 * Ethereum Token List Service
 * Migrated from salmon-wallet-v2:
 * - src/adapter/services/ethereum/ethereum-token-list-service.js
 *
 * Provides functionality for ERC-20 token operations:
 * - Get token metadata (name, symbol, decimals)
 * - Get user's tokens with balances (automatic detection)
 * - Get featured/well-known tokens
 *
 * Features:
 * - Automatic ERC-20 token detection via indexing APIs
 * - Fallback to RPC calls for featured tokens
 * - Efficient batched balance queries
 *
 * Uses ethers.js v6 Contract for ERC-20 interactions.
 */

import { Contract, formatUnits } from 'ethers';
import type { Provider } from 'ethers';
import type { DetectedERC20Token } from '../../api/services/ethereum';
import type {
  EthereumToken as _EthereumToken,
  EthereumTokenBalance as _EthereumTokenBalance,
  TokenDetectionResult as _TokenDetectionResult,
} from '../../types/token';

// Re-export canonical types from types/token
export type EthereumToken = _EthereumToken;
export type EthereumTokenBalance = _EthereumTokenBalance;

/**
 * Known token entry for featured tokens
 */
interface KnownToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
  coingeckoId?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimal ERC-20 ABI for reading token metadata and balances
 */
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
];

// Re-export EthereumNetworkId from canonical location
export type { EthereumNetworkId } from '../../types/blockchain';

/**
 * Network IDs for Ethereum networks
 */
export const ETHEREUM_NETWORK_IDS = {
  MAINNET: 'ethereum-mainnet' as const,
  SEPOLIA: 'ethereum-sepolia' as const,
};

/**
 * Featured tokens for Ethereum Mainnet
 * Well-known ERC-20 tokens that are commonly used
 */
const MAINNET_FEATURED_TOKENS: KnownToken[] = [
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoUri:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    coingeckoId: 'weth',
  },
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUri:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
    coingeckoId: 'usd-coin',
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoUri:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
    coingeckoId: 'tether',
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeC16991e0F68',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoUri:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeC16991e0F68/logo.png',
    coingeckoId: 'dai',
  },
  {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    logoUri:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png',
    coingeckoId: 'uniswap',
  },
  {
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
    logoUri:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
    coingeckoId: 'chainlink',
  },
  {
    address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    symbol: 'AAVE',
    name: 'Aave',
    decimals: 18,
    logoUri:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9/logo.png',
    coingeckoId: 'aave',
  },
  {
    address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
    symbol: 'SHIB',
    name: 'Shiba Inu',
    decimals: 18,
    logoUri:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE/logo.png',
    coingeckoId: 'shiba-inu',
  },
];

/**
 * Featured tokens by network
 */
const FEATURED_TOKENS_BY_NETWORK: Record<string, KnownToken[]> = {
  [ETHEREUM_NETWORK_IDS.MAINNET]: MAINNET_FEATURED_TOKENS,
  // Testnets typically don't have featured tokens
  [ETHEREUM_NETWORK_IDS.SEPOLIA]: [],
};

// ============================================================================
// Token Info Functions
// ============================================================================

/**
 * Gets token metadata from an ERC-20 contract
 *
 * Reads the name, symbol, and decimals from the token contract.
 *
 * @param provider - Ethers.js provider
 * @param tokenAddress - Token contract address
 * @returns Token metadata
 *
 * @example
 * ```typescript
 * const token = await getTokenInfo(provider, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
 * // Returns: { address: '0x...', symbol: 'USDC', name: 'USD Coin', decimals: 6 }
 * ```
 */
export async function getTokenInfo(
  provider: Provider,
  tokenAddress: string
): Promise<EthereumToken> {
  const contract = new Contract(tokenAddress, ERC20_ABI, provider);

  const [name, symbol, decimals] = await Promise.all([
    contract.name() as Promise<string>,
    contract.symbol() as Promise<string>,
    contract.decimals() as Promise<bigint>,
  ]);

  return {
    address: tokenAddress,
    name,
    symbol,
    decimals: Number(decimals),
  };
}

/**
 * Gets the balance of a token for a specific address
 *
 * @param provider - Ethers.js provider
 * @param tokenAddress - Token contract address
 * @param ownerAddress - Address to check balance for
 * @returns Balance as bigint
 */
export async function getTokenBalance(
  provider: Provider,
  tokenAddress: string,
  ownerAddress: string
): Promise<bigint> {
  const contract = new Contract(tokenAddress, ERC20_ABI, provider);
  return contract.balanceOf(ownerAddress) as Promise<bigint>;
}

// ============================================================================
// Token List Functions
// ============================================================================

/**
 * Gets all tokens with non-zero balances for a user
 *
 * Checks the balance of each known token and returns only those
 * with a non-zero balance.
 *
 * @param provider - Ethers.js provider
 * @param address - User's Ethereum address
 * @param knownTokens - List of known tokens to check
 * @returns Tokens with non-zero balances
 *
 * @example
 * ```typescript
 * const tokens = await getTokensByOwner(provider, userAddress, [
 *   { address: '0x...', symbol: 'USDC', name: 'USD Coin', decimals: 6 }
 * ]);
 * // Returns: [{ address: '0x...', symbol: 'USDC', balance: 1000000n, uiAmount: '1.0' }]
 * ```
 */
export async function getTokensByOwner(
  provider: Provider,
  address: string,
  knownTokens: EthereumToken[]
): Promise<EthereumTokenBalance[]> {
  if (!knownTokens || knownTokens.length === 0) {
    return [];
  }

  // Check balance for each token in parallel
  const balanceResults = await Promise.allSettled(
    knownTokens.map(async (token) => {
      const balance = await getTokenBalance(provider, token.address, address);
      return { token, balance };
    })
  );

  // Filter to only non-zero balances and format results
  const tokensWithBalance: EthereumTokenBalance[] = [];

  for (const result of balanceResults) {
    if (result.status === 'fulfilled' && result.value.balance > 0n) {
      const { token, balance } = result.value;
      tokensWithBalance.push({
        ...token,
        balance,
        uiAmount: formatUnits(balance, token.decimals),
      });
    }
  }

  return tokensWithBalance;
}

/**
 * Gets featured/well-known tokens for a network
 *
 * Returns a hardcoded list of commonly used tokens for the given network.
 *
 * @param networkId - Network identifier (e.g., 'ethereum-mainnet', 'ethereum-sepolia')
 * @returns List of featured tokens
 *
 * @example
 * ```typescript
 * const tokens = getFeaturedTokens('ethereum-mainnet');
 * // Returns: [{ address: '0x...', symbol: 'WETH', ... }, ...]
 * ```
 */
export function getFeaturedTokens(networkId: string): EthereumToken[] {
  return FEATURED_TOKENS_BY_NETWORK[networkId] || [];
}

/**
 * Gets a specific featured token by symbol
 *
 * @param networkId - Network identifier
 * @param symbol - Token symbol (e.g., 'USDC')
 * @returns Token if found, undefined otherwise
 */
export function getFeaturedTokenBySymbol(
  networkId: string,
  symbol: string
): EthereumToken | undefined {
  const tokens = getFeaturedTokens(networkId);
  return tokens.find((t) => t.symbol.toLowerCase() === symbol.toLowerCase());
}

/**
 * Gets a specific featured token by address
 *
 * @param networkId - Network identifier
 * @param address - Token contract address
 * @returns Token if found, undefined otherwise
 */
export function getFeaturedTokenByAddress(
  networkId: string,
  address: string
): EthereumToken | undefined {
  const tokens = getFeaturedTokens(networkId);
  return tokens.find((t) => t.address.toLowerCase() === address.toLowerCase());
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if an address is a valid ERC-20 token contract
 *
 * Attempts to read the symbol from the contract. If successful,
 * the address is likely a valid ERC-20 token.
 *
 * @param provider - Ethers.js provider
 * @param address - Address to check
 * @returns True if the address is a valid ERC-20 token
 */
export async function isErc20Token(provider: Provider, address: string): Promise<boolean> {
  try {
    const contract = new Contract(address, ERC20_ABI, provider);
    await contract.symbol();
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats a token balance to a human-readable string
 *
 * @param balance - Raw balance as bigint
 * @param decimals - Token decimals
 * @returns Formatted balance string
 */
export function formatTokenBalance(balance: bigint, decimals: number): string {
  return formatUnits(balance, decimals);
}

// ============================================================================
// Automatic Token Detection Functions
// ============================================================================

// Re-export from types/token
export type TokenDetectionResult = _TokenDetectionResult;

/**
 * Automatically detect all ERC-20 tokens for a wallet
 *
 * This is the primary function for token detection. It:
 * 1. Uses API-based indexing to detect ALL tokens the user holds
 * 2. Falls back to featured tokens via RPC if API is unavailable
 * 3. Combines both sources, deduplicating by address
 *
 * This replaces the old approach of only checking "featured tokens"
 * and provides MetaMask-like automatic token detection.
 *
 * @param provider - Ethers.js provider
 * @param address - User's Ethereum address
 * @param networkId - Network identifier (e.g., 'ethereum-mainnet')
 * @returns Token detection result with all found tokens
 *
 * @example
 * ```typescript
 * const result = await detectAllTokens(provider, userAddress, 'ethereum-mainnet');
 * console.log(`Found ${result.allTokens.length} tokens`);
 * result.allTokens.forEach(token => {
 *   console.log(`${token.symbol}: ${token.uiAmount}`);
 * });
 * ```
 */
export async function detectAllTokens(
  provider: Provider,
  address: string,
  networkId: string = 'ethereum-mainnet',
  fetchTokenBalances: (address: string, networkId: string) => Promise<DetectedERC20Token[]> = () =>
    Promise.resolve([])
): Promise<TokenDetectionResult> {
  let detectedTokens: EthereumTokenBalance[] = [];
  let usedAutomaticDetection = false;

  // Step 1: Try automatic detection via API
  try {
    const apiTokens = await fetchTokenBalances(address, networkId);

    if (apiTokens.length > 0) {
      usedAutomaticDetection = true;
      detectedTokens = apiTokens.map((token) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        balance: BigInt(token.balance),
        uiAmount: formatUnits(BigInt(token.balance), token.decimals),
        logoUri: token.logoUri,
        coingeckoId: token.coingeckoId,
      }));
    }
  } catch (error) {
    console.warn('[tokens] Automatic token detection failed:', error);
  }

  // Step 2: Always fetch featured tokens via RPC as a fallback/supplement
  const featuredTokens = getFeaturedTokens(networkId);
  let featuredWithBalances: EthereumTokenBalance[] = [];

  if (featuredTokens.length > 0) {
    try {
      featuredWithBalances = await getTokensByOwner(provider, address, featuredTokens);
    } catch (error) {
      console.warn('[tokens] Featured token balance fetch failed:', error);
    }
  }

  // Step 3: Merge detected and featured tokens, preferring detected data
  const tokenMap = new Map<string, EthereumTokenBalance>();

  // Add detected tokens first (they have the most complete data)
  detectedTokens.forEach((token) => {
    tokenMap.set(token.address.toLowerCase(), token);
  });

  // Add featured tokens if not already present
  featuredWithBalances.forEach((token) => {
    const key = token.address.toLowerCase();
    if (!tokenMap.has(key)) {
      tokenMap.set(key, token);
    } else {
      // Merge metadata from featured token (may have better logo/coingeckoId)
      const existing = tokenMap.get(key)!;
      if (!existing.logoUri && token.logoUri) {
        existing.logoUri = token.logoUri;
      }
      if (!existing.coingeckoId && token.coingeckoId) {
        existing.coingeckoId = token.coingeckoId;
      }
    }
  });

  // Convert map to array and filter for non-zero balances
  const allTokens = Array.from(tokenMap.values()).filter((token) => token.balance > 0n);

  return {
    detectedTokens,
    featuredTokens: featuredWithBalances,
    allTokens,
    usedAutomaticDetection,
  };
}

/**
 * Get all tokens for an owner with automatic detection
 *
 * Convenience function that wraps detectAllTokens and returns
 * just the token array (for simpler use cases).
 *
 * @param provider - Ethers.js provider
 * @param address - User's Ethereum address
 * @param networkId - Network identifier
 * @returns Array of tokens with non-zero balances
 */
export async function getAllTokensForOwner(
  provider: Provider,
  address: string,
  networkId: string = 'ethereum-mainnet',
  fetchTokenBalances?: (address: string, networkId: string) => Promise<DetectedERC20Token[]>
): Promise<EthereumTokenBalance[]> {
  const result = await detectAllTokens(provider, address, networkId, fetchTokenBalances);
  return result.allTokens;
}

// Re-export the DetectedERC20Token type for external use
export type { DetectedERC20Token };
