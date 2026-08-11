/**
 * Ethereum API Service
 *
 * Provides API-based token detection for Ethereum wallets.
 * Uses external indexing services to detect ALL ERC-20 tokens a user holds,
 * without needing to know token addresses in advance.
 *
 * Supported APIs (in order of preference):
 * 1. Alchemy Token API - Most reliable, requires API key
 * 2. Moralis - Good alternative, requires API key
 * 3. Public fallback - Uses Ethplorer (free, rate limited)
 *
 * This enables automatic token detection similar to MetaMask's behavior.
 */

import { get } from '../client';
import { lookupCoingeckoId } from '../../utils/tokens';
import { removeDecimals } from '../../utils/decimals';
import type { AlchemyTokenMetadata, DetectedERC20Token } from '../../types/token';

// Re-export types for backwards compatibility
export type { AlchemyTokenBalance, AlchemyTokenMetadata, DetectedERC20Token } from '../../types/token';

/**
 * Response from Ethplorer API (free public API)
 */
interface EthplorerTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: string | number;
  balance: number;
  rawBalance: string;
  image?: string;
}

interface EthplorerAddressInfo {
  address: string;
  ETH: {
    balance: number;
    rawBalance: string;
  };
  tokens?: EthplorerTokenInfo[];
}

/**
 * Response from Salmon API token balance endpoint
 */
interface SalmonTokenBalance {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  amount: string;
  logoURI?: string;
  logo?: string;
  coingeckoId?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Ethplorer public API base URL (free, 2 req/sec rate limit)
 */
const ETHPLORER_API_URL = 'https://api.ethplorer.io';

/**
 * Ethplorer free API key for public access
 */
const ETHPLORER_API_KEY = 'freekey';

// KNOWN_COINGECKO_IDS and lookupCoingeckoId have been moved to
// packages/shared/src/utils/tokens.ts

// ============================================================================
// Primary API Functions
// ============================================================================

/**
 * Get all ERC-20 token balances for an Ethereum wallet using Salmon API
 *
 * This is the primary method that calls the Salmon backend which proxies
 * to indexing services like Alchemy/Moralis.
 *
 * @param address - Wallet address to query
 * @param networkId - Network identifier (e.g., 'ethereum-mainnet', 'ethereum-sepolia')
 * @returns Array of detected tokens with balances
 */
export async function getERC20TokenBalances(
  address: string,
  networkId: string = 'ethereum-mainnet'
): Promise<DetectedERC20Token[]> {
  try {
    // Try Salmon API first (proxies to Alchemy/other indexers)
    const tokens = await getSalmonApiTokenBalances(address, networkId);
    if (tokens.length > 0) {
      return tokens;
    }

    // Fall back to Ethplorer for mainnet
    if (networkId === 'ethereum-mainnet') {
      return await getEthplorerTokenBalances(address);
    }

    return [];
  } catch (error) {
    console.warn('[ethereum-api] Failed to fetch token balances:', error);

    // Fall back to Ethplorer for mainnet on error
    if (networkId === 'ethereum-mainnet') {
      try {
        return await getEthplorerTokenBalances(address);
      } catch (fallbackError) {
        console.warn('[ethereum-api] Ethplorer fallback also failed:', fallbackError);
      }
    }

    return [];
  }
}

/**
 * Fetch token balances from Salmon API backend.
 *
 * Forward-compat: salmon-api does not expose
 * `/v1/<networkId>/account/<address>/tokens` yet (Ethereum is scaffolded but
 * inactive on the backend). This call is expected to 404 in production today;
 * the caller relies on the Ethplorer fallback. Once the BE ships the endpoint,
 * the fallback path becomes the secondary.
 *
 * @param address - Wallet address
 * @param networkId - Network identifier
 * @returns Array of detected tokens (empty on 404 — triggers fallback)
 */
async function getSalmonApiTokenBalances(
  address: string,
  networkId: string
): Promise<DetectedERC20Token[]> {
  try {
    // Forward-compat: BE endpoint not yet served. 404 is the expected path
    // today and is swallowed by the catch below to trigger Ethplorer.
    const response = await get<SalmonTokenBalance[]>(
      `/v1/${networkId}/account/${address}/tokens`,
      { params: { include: 'logo' } }
    );

    return response.map((token) => {
      const rawBalance = BigInt(token.amount);
      const uiAmount = removeDecimals(rawBalance, token.decimals);

      return {
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        balance: token.amount,
        uiAmount,
        logoUri: token.logoURI || token.logo,
        coingeckoId: token.coingeckoId || lookupCoingeckoId(token.address),
      };
    }).filter((token) => token.uiAmount > 0);
  } catch (error) {
    // API endpoint may not exist yet, return empty to trigger fallback
    console.debug('[ethereum-api] Salmon API token endpoint not available:', error);
    return [];
  }
}

/**
 * Fetch token balances from Ethplorer API (public fallback)
 *
 * Ethplorer is a free Ethereum blockchain explorer API that provides
 * token balances without requiring an API key (rate limited to 2 req/sec).
 *
 * @param address - Wallet address
 * @returns Array of detected tokens
 */
async function getEthplorerTokenBalances(
  address: string
): Promise<DetectedERC20Token[]> {
  try {
    const url = `${ETHPLORER_API_URL}/getAddressInfo/${address}?apiKey=${ETHPLORER_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Ethplorer API error: ${response.status}`);
    }

    const data: EthplorerAddressInfo = await response.json();

    if (!data.tokens || data.tokens.length === 0) {
      return [];
    }

    return data.tokens
      .filter((token) => {
        // Filter out tokens with zero or invalid balance
        const balance = BigInt(token.rawBalance || '0');
        return balance > 0n;
      })
      .map((token) => {
        const decimals = typeof token.decimals === 'string'
          ? parseInt(token.decimals, 10)
          : token.decimals;
        const rawBalance = token.rawBalance || '0';
        const uiAmount = removeDecimals(BigInt(rawBalance), decimals);

        return {
          address: token.address,
          name: token.name || 'Unknown Token',
          symbol: token.symbol || 'UNKNOWN',
          decimals,
          balance: rawBalance,
          uiAmount,
          logoUri: token.image ? `https://ethplorer.io${token.image}` : undefined,
          coingeckoId: lookupCoingeckoId(token.address),
        };
      })
      .filter((token) => token.uiAmount > 0);
  } catch (error) {
    console.warn('[ethereum-api] Ethplorer API error:', error);
    return [];
  }
}

// ============================================================================
// DI Adapter (account)
// ============================================================================

import type {
  EthereumBalanceItem,
  EthereumAccountApiFunctions,
  AccountTransactionListResponse,
} from '../../types/transfer';

export const fetchEthereumAccountBalance: EthereumAccountApiFunctions['fetchBalance'] = async (
  networkId,
  address
) => {
  const data = await get<EthereumBalanceItem[]>(
    `/v1/${networkId}/account/${address}/balance`,
    { params: { include: 'logo' } },
  );

  return data.map((token) => ({
    ...token,
    uiAmount: removeDecimals(token.amount, token.decimals),
  }));
};

export const fetchEthereumAccountRecentTransactions: EthereumAccountApiFunctions['fetchRecentTransactions'] = async (
  networkId,
  address,
  paging?
) => {
  const { nextPageToken, pageSize } = paging || {};
  const params: Record<string, string | number> = {};
  if (nextPageToken) params.pageToken = nextPageToken;
  if (pageSize) params.pageSize = pageSize;

  return get<AccountTransactionListResponse>(
    `/v1/${networkId}/account/${address}/transactions`,
    { params },
  );
};

export const ethereumApiFunctions: EthereumAccountApiFunctions = {
  fetchBalance: fetchEthereumAccountBalance,
  fetchRecentTransactions: fetchEthereumAccountRecentTransactions,
};

// ============================================================================
// Token Metadata Functions
// ============================================================================

/**
 * Get token metadata for multiple addresses
 *
 * Fetches token name, symbol, decimals, and logo for multiple tokens.
 * Uses batch requests when possible for efficiency.
 *
 * @param addresses - Array of token contract addresses
 * @param networkId - Network identifier
 * @returns Map of address to metadata
 */
export async function getTokenMetadataBatch(
  addresses: string[],
  networkId: string = 'ethereum-mainnet'
): Promise<Map<string, AlchemyTokenMetadata>> {
  const metadataMap = new Map<string, AlchemyTokenMetadata>();

  if (addresses.length === 0) {
    return metadataMap;
  }

  try {
    // Forward-compat: salmon-api does not yet serve
    // `/v1/<networkId>/tokens/metadata`. Until it does, this call 404s and the
    // catch returns the empty map, letting callers fall back to on-chain reads.
    const response = await get<Array<{ address: string } & AlchemyTokenMetadata>>(
      `/v1/${networkId}/tokens/metadata`,
      { params: { addresses: addresses.join(',') } }
    );

    response.forEach((token) => {
      metadataMap.set(token.address.toLowerCase(), {
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logo: token.logo,
      });
    });
  } catch {
    // Metadata endpoint not available, tokens will use on-chain fallback
    console.debug('[ethereum-api] Token metadata batch endpoint not available');
  }

  return metadataMap;
}

