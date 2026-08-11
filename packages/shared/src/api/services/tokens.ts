/**
 * Token List Service
 *
 * Thin wrapper around the salmon-api fungible-token catalog endpoints.
 * Provider selection (Jupiter primary, Solana Labs CDN fallback) lives
 * server-side; the client makes a single call per surface and trusts the
 * backend's curated list.
 *
 * API Endpoints:
 * - GET /v1/{networkId}/ft/verified         - Curated verified token list
 * - GET /v1/{networkId}/ft/batch?mints=...  - Token metadata for a mint set
 * - GET /v1/{networkId}/ft/search?query=... - Free-text search
 */

import { apiClient } from '../client';
import { SmartCache } from '../../utils/cache';
import type { SolanaNetworkId } from '../../types/blockchain';
import type { TokenMetadata } from '../../types/token';

/**
 * Canonical fungible-token shape emitted by salmon-api
 * (`solana-ft-batch-resource`).
 */
interface BackendToken {
  symbol: string;
  name: string;
  decimals: number;
  logo?: string | null;
  address?: string;
  chainId?: number;
  coingeckoId?: string | null;
  tags?: string[];
  // Defensive: legacy responses occasionally surfaced these fields. Accepted
  // here so the normalizer covers both paths without runtime branching.
  icon?: string;
  id?: string;
}


// ============================================================================
// In-memory cache
// ============================================================================

const tokenListCache = new SmartCache<TokenMetadata[]>({ maxSize: 5, ttl: 5 * 60 * 1000 });
const TOKEN_LIST_CACHE_KEY = 'default';

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize the canonical backend token payload to the FE TokenMetadata
 * shape.
 *
 * @internal Exported for testing.
 */
export function normalizeBackendTokens(tokens: BackendToken[]): TokenMetadata[] {
  return tokens.map((token) => ({
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    logo: token.logo ?? token.icon ?? undefined,
    address: token.address || token.id || '',
    chainId: token.chainId,
    coingeckoId: token.coingeckoId ?? undefined,
    tags: token.tags || [],
  }));
}

// ============================================================================
// Token list functions
// ============================================================================

/**
 * Get the deduplicated verified token list.
 *
 * Deduplication prioritizes verified > community > unknown when the
 * backend list contains multiple tokens with the same symbol.
 *
 * @param networkId - Network identifier
 */
export async function getTokenList(
  networkId: SolanaNetworkId = 'solana-mainnet'
): Promise<TokenMetadata[]> {
  const cached = tokenListCache.get(TOKEN_LIST_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const { data } = await apiClient.get<BackendToken[]>(`/v1/${networkId}/ft/verified`);
  const tokens = normalizeBackendTokens(data);

  const seenSymbols = new Map<string, TokenMetadata>();
  const deduplicatedTokens: TokenMetadata[] = [];

  tokens.forEach((token) => {
    const key = token.symbol;
    const existing = seenSymbols.get(key);

    const tokenTags = token.tags ?? [];
    const existingTags = existing?.tags ?? [];
    const isVerified = tokenTags.includes('verified') || tokenTags.includes('strict');
    const isCommunity = tokenTags.includes('community');
    const existingIsVerified =
      existingTags.includes('verified') || existingTags.includes('strict');
    const existingIsCommunity = existingTags.includes('community');

    if (!existing) {
      seenSymbols.set(key, token);
      deduplicatedTokens.push(token);
    } else if (isVerified && !existingIsVerified) {
      const index = deduplicatedTokens.findIndex((t) => t.symbol === key);
      if (index !== -1) {
        deduplicatedTokens[index] = token;
        seenSymbols.set(key, token);
      }
    } else if (isCommunity && !existingIsVerified && !existingIsCommunity) {
      const index = deduplicatedTokens.findIndex((t) => t.symbol === key);
      if (index !== -1) {
        deduplicatedTokens[index] = token;
        seenSymbols.set(key, token);
      }
    }
  });

  tokenListCache.set(TOKEN_LIST_CACHE_KEY, deduplicatedTokens);
  return deduplicatedTokens;
}

/**
 * Search tokens by query string. Backend handles search semantics.
 *
 * Endpoint: GET /v1/{networkId}/ft/search?query={query}
 */
export async function searchTokens(
  query: string,
  networkId: SolanaNetworkId = 'solana-mainnet'
): Promise<TokenMetadata[]> {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    const { data } = await apiClient.get<BackendToken[]>(
      `/v1/${networkId}/ft/search`,
      { params: { query } }
    );
    return normalizeBackendTokens(data);
  } catch (error) {
    console.warn('[TokenService] Search endpoint unavailable:', error);
    return [];
  }
}

/**
 * Clear the in-memory token list cache.
 */
export function clearTokenListCache(): void {
  tokenListCache.clear();
}
