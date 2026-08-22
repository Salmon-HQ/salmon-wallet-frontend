/**
 * Solana NFT API Service
 *
 * Provides API-based NFT fetching for Solana wallets via the Salmon backend.
 *
 * Runtime data sourcing — see `packages/shared/src/blockchain/solana/nft.ts`
 * (module header). Salmon-api routes DAS calls through Triton with a Helius
 * fallback; the `helius-` prefix here is shape-only (canonical mapper).
 */

import { apiClient } from '../client';
import type { Nft } from '../../types/nft';

// ============================================================================
// Backend response normalization
// ============================================================================

/**
 * The backend resource decorator returns a flat shape that differs from
 * the canonical Nft type used by the frontend (Helius DAS format).
 *
 * Key differences:
 *   - mint: string (backend) vs { address: string } (canonical)
 *   - media: may be absent when json.image is null
 *   - collection: raw json.collection object vs NftCollection
 *   - missing fields: owner, compressed, edition, tokenStandard, etc.
 */
interface BackendNft {
  mint: string;
  owner?: string;
  name?: string;
  symbol?: string;
  uri?: string;
  description?: string;
  media?: string | null;
  collection?: { name?: string; key?: string; verified?: boolean } | null;
  extras?: {
    creators?: Array<{ address: string; share: number; verified: boolean }>;
    attributes?: Array<{ trait_type: string; value: string | number }>;
    properties?: Record<string, unknown>;
  };
  extensions?: Array<{ extension: string; state: Record<string, unknown> }>;
  blacklisted?: boolean;
  spamScore?: number;
  spamReasons?: string[];
}

function normalizeBackendNft(raw: BackendNft, owner: string): Nft {
  return {
    mint: { address: raw.mint },
    owner: raw.owner ?? owner,
    name: raw.name ?? '',
    symbol: raw.symbol ?? '',
    uri: raw.uri ?? '',
    json: {},
    updateAuthorityAddress: null,
    sellerFeeBasisPoints: 0,
    collection: raw.collection?.name
      ? {
          key: raw.collection.key ?? '',
          verified: raw.collection.verified ?? false,
          name: raw.collection.name,
        }
      : null,
    edition: null,
    tokenStandard: null,
    media: raw.media ?? null,
    description: raw.description ?? '',
    compressed: false,
    extras: {
      attributes: raw.extras?.attributes ?? [],
      properties: raw.extras?.properties ?? {},
      creators: raw.extras?.creators ?? [],
    },
    extensions: raw.extensions ?? [],
    blacklisted: raw.blacklisted,
    spamScore: raw.spamScore,
    spamReasons: raw.spamReasons,
  };
}

// ============================================================================
// API Functions
// ============================================================================

interface BackendPagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
}

type BackendNftResponse = { data: BackendNft[]; pagination?: BackendPagination } | BackendNft[];

/**
 * The backend caps a page at 100 NFTs (`MAX_LIMIT`) and defaults to 50 when
 * no `limit` is sent. Requesting a single default page silently truncates
 * every wallet holding more than 50 assets, so this walks all pages.
 */
const PAGE_LIMIT = 100;

/** Safety stop so a misbehaving `hasMore` cannot spin forever. */
const MAX_PAGES = 25;

export async function getSolanaNfts(
  networkId: string,
  publicKey: string,
  noCache: boolean,
  opts: { includeSpam?: boolean } = {}
): Promise<Nft[]> {
  const raw: BackendNft[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params: Record<string, string | number | boolean> = {
      publicKey,
      noCache,
      limit: PAGE_LIMIT,
      offset,
    };
    if (opts.includeSpam) {
      params.includeSpam = 'true';
    }

    const { data } = await apiClient.get<BackendNftResponse>(`/v1/${networkId}/nft`, {
      params,
      timeout: 15000,
    });

    // Older/array-shaped responses carry no pagination envelope — one page is all there is.
    if (Array.isArray(data)) {
      raw.push(...data);
      break;
    }

    raw.push(...(data.data ?? []));

    // The spam filter runs after the page slice on the backend, so `pagination`
    // describes the unfiltered list and its offsets stay consistent across pages.
    const nextOffset = data.pagination?.nextOffset;
    if (!data.pagination?.hasMore || nextOffset == null) {
      break;
    }
    offset = nextOffset;
  }

  // Backend already drops blacklisted / spamScore>0 NFTs unless `?includeSpam=true`.
  const normalized = raw.map((nft) => normalizeBackendNft(nft, publicKey));
  return normalized.filter((nft) => nft.media);
}
