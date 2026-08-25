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
  /**
   * What the backend dropped from THIS page. `spam` counts only while the spam
   * filter is on — asking for spam explicitly makes it zero. `total` above is
   * the provider's raw count and is not comparable to what arrives.
   */
  hidden?: { spam: number; fungible: number };
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

/**
 * A page walk that ran out of pages, and whether it finished the walk.
 *
 * `partial` is true when a page failed after at least one had succeeded. It is
 * derived from the HTTP failure, never from the payload: the backend's listing
 * contract is a flat shape with no `partial` or `errors[]` field, and by its
 * own rule it never answers 200 with a degraded body. So a short answer is
 * indistinguishable from a complete one — the status code is the only signal.
 */
export interface SolanaNftPageWalk {
  nfts: Nft[];
  partial: boolean;
  /**
   * NFTs the backend judged spam and withheld, summed over the pages that were
   * actually walked. Zero when the caller asked for spam.
   */
  hiddenSpam: number;
  /**
   * NFTs this client dropped because they carry no image. Counted here because
   * nothing else does, and without it the arithmetic on screen cannot close:
   * on a 1000-NFT spam wallet the backend withholds 940 and sends 77, of which
   * 51 have no media — so 26 render. Reporting only the backend's number would
   * leave 51 unaccounted for.
   */
  hiddenWithoutMedia: number;
}

export async function getSolanaNfts(
  networkId: string,
  publicKey: string,
  noCache: boolean,
  opts: { includeSpam?: boolean } = {}
): Promise<SolanaNftPageWalk> {
  const raw: BackendNft[] = [];
  let partial = false;
  let hiddenSpam = 0;
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

    let data: BackendNftResponse;
    try {
      ({ data } = await apiClient.get<BackendNftResponse>(`/v1/${networkId}/nft`, {
        params,
        timeout: 15000,
      }));
    } catch (err) {
      // Nothing yet means nothing to show: let the error state own the screen
      // rather than rendering an empty grid that looks like an empty wallet.
      if (raw.length === 0) throw err;
      // Otherwise keep the pages that did arrive. One bad page used to reject
      // the whole walk, so a wallet with nine good pages and a tenth that
      // 500s rendered zero NFTs.
      partial = true;
      break;
    }

    // Older/array-shaped responses carry no pagination envelope — one page is all there is.
    if (Array.isArray(data)) {
      raw.push(...data);
      break;
    }

    raw.push(...(data.data ?? []));
    hiddenSpam += data.pagination?.hidden?.spam ?? 0;

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
  const withMedia = normalized.filter((nft) => nft.media);
  return {
    nfts: withMedia,
    partial,
    hiddenSpam,
    hiddenWithoutMedia: normalized.length - withMedia.length,
  };
}
