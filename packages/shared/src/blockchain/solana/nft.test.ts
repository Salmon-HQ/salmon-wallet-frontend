/**
 * Solana NFT Service Tests (post-Triton-cutover).
 *
 * The shared `nft.ts` no longer talks to any RPC directly — everything flows
 * through dependency-injected backend fetchers. These tests stub those
 * fetchers and assert the public surface still composes the way apps expect:
 *   - getAll(network, publicKey, noCache, fetchNftsFromBackend)
 *   - getAllPaginated(network, publicKey, options, fetchNftsFromBackendPaginated)
 *   - getAllGroupedByCollection(network, owner, fetchNftsFromBackend)
 *   - getNftByAddress(network, mint, fetchNftByAddress)
 *   - getCollections / getNftsByCollection / getNftsWithoutCollection /
 *     isCollection / isMoreThanOne / isBlacklisted (pure helpers)
 *
 * Helius DAS-direct tests have been removed because the path no longer
 * exists in the client bundle (see `getSolanaNfts*` in api/services).
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getAll,
  getAllPaginated,
  getAllGroupedByCollection,
  getNftByAddress,
  isBlacklisted,
  getCollections,
  getNftsByCollection,
  getNftsWithoutCollection,
  isCollection,
  isMoreThanOne,
} from './nft';
import type {
  Nft,
  NftCollectionGroup,
  FetchNftsFromBackendFn,
  FetchNftsFromBackendPaginatedFn,
  FetchNftByAddressFn,
} from '../../types/nft';
import { SOLANA_NETWORKS } from './factory';

// ============================================================================
// Mock data
// ============================================================================

const network = SOLANA_NETWORKS['solana-mainnet'];
const owner = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';

const buildMockNft = (overrides: Partial<Nft> = {}): Nft => ({
  mint: { address: 'mint-1' },
  owner,
  name: 'Test NFT #1',
  symbol: 'TEST',
  uri: 'https://arweave.net/test',
  json: {},
  updateAuthorityAddress: null,
  sellerFeeBasisPoints: 500,
  collection: { key: 'c1', verified: true, name: 'Test Collection' },
  edition: { isOriginal: true },
  tokenStandard: 'NonFungible',
  media: 'https://arweave.net/image',
  description: 'A test NFT',
  compressed: false,
  extras: { attributes: [], properties: {}, creators: [] },
  extensions: [],
  ...overrides,
});

// ============================================================================
// getAll
// ============================================================================

describe('getAll', () => {
  it('forwards networkId, publicKey and noCache to the backend fetcher', async () => {
    const fetcher = vi.fn(async (_id, _pk, _noCache) => [
      buildMockNft({ name: 'A' }),
    ]) as unknown as FetchNftsFromBackendFn;

    const result = await getAll(network, owner, true, fetcher);

    expect(fetcher).toHaveBeenCalledWith(network.id, owner, true, {});
    expect(result[0].name).toBe('A');
  });

  it('returns [] when no fetcher is provided (degraded fallback)', async () => {
    const result = await getAll(network, owner);
    expect(result).toEqual([]);
  });
});

// ============================================================================
// getAllPaginated
// ============================================================================

describe('getAllPaginated', () => {
  it('forwards options to the paginated backend fetcher', async () => {
    const fetcher = vi.fn(async () => ({
      data: [buildMockNft({ name: 'A' })],
      pagination: { total: 1, limit: 10, offset: 0, hasMore: false, nextOffset: null },
    })) as unknown as FetchNftsFromBackendPaginatedFn;

    const result = await getAllPaginated(network, owner, { limit: 10, offset: 0 }, fetcher);

    expect(fetcher).toHaveBeenCalledWith(network.id, owner, { limit: 10, offset: 0 });
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('returns an empty paginated response when no fetcher is provided', async () => {
    const result = await getAllPaginated(network, owner, { limit: 5 });
    expect(result.data).toEqual([]);
    expect(result.pagination.limit).toBe(5);
    expect(result.pagination.hasMore).toBe(false);
  });
});

// ============================================================================
// getAllGroupedByCollection
// ============================================================================

describe('getAllGroupedByCollection', () => {
  it('groups NFTs by collection name and lists collectionless NFTs separately', async () => {
    const a1 = buildMockNft({
      mint: { address: 'a1' },
      collection: { key: 'A', verified: true, name: 'Alpha' },
    });
    const a2 = buildMockNft({
      mint: { address: 'a2' },
      collection: { key: 'A', verified: true, name: 'Alpha' },
    });
    const b1 = buildMockNft({
      mint: { address: 'b1' },
      collection: { key: 'B', verified: true, name: 'Beta' },
    });
    const standalone = buildMockNft({
      mint: { address: 'standalone' },
      collection: null,
    });

    const fetcher = vi.fn(async () => [
      a1,
      a2,
      b1,
      standalone,
    ]) as unknown as FetchNftsFromBackendFn;
    const result = await getAllGroupedByCollection(network, owner, fetcher);

    // Sorted descending by length: Alpha (2), Beta (1), then standalone NFT
    expect(result).toHaveLength(3);

    const alpha = result[0] as NftCollectionGroup;
    expect(alpha.collection).toBe('Alpha');
    expect(alpha.length).toBe(2);

    const beta = result[1] as NftCollectionGroup;
    expect(beta.collection).toBe('Beta');
    expect(beta.length).toBe(1);

    const lone = result[2] as Nft;
    expect((lone as Nft).mint.address).toBe('standalone');
  });
});

// ============================================================================
// getNftByAddress
// ============================================================================

describe('getNftByAddress', () => {
  it('returns the NFT when fetcher resolves with a collection-bearing NFT', async () => {
    const fetcher = vi.fn(async () => buildMockNft()) as unknown as FetchNftByAddressFn;
    const result = await getNftByAddress(network, 'mint-1', fetcher);
    expect(result?.name).toBe('Test NFT #1');
  });

  it('returns null when fetcher resolves with an NFT lacking a collection', async () => {
    const fetcher = vi.fn(async () =>
      buildMockNft({ collection: null })
    ) as unknown as FetchNftByAddressFn;
    const result = await getNftByAddress(network, 'mint-1', fetcher);
    expect(result).toBeNull();
  });

  it('swallows fetcher errors and returns null', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('network');
    }) as unknown as FetchNftByAddressFn;
    const result = await getNftByAddress(network, 'mint-1', fetcher);
    expect(result).toBeNull();
  });

  it('returns null when no fetcher is provided', async () => {
    const result = await getNftByAddress(network, 'mint-1');
    expect(result).toBeNull();
  });
});

// ============================================================================
// Pure helpers
// ============================================================================

describe('getCollections', () => {
  it('returns unique collection names', () => {
    const nfts = [
      buildMockNft({ collection: { key: 'A', verified: true, name: 'Alpha' } }),
      buildMockNft({ collection: { key: 'A', verified: true, name: 'Alpha' } }),
      buildMockNft({ collection: { key: 'B', verified: true, name: 'Beta' } }),
      buildMockNft({ collection: null }),
    ];
    expect(getCollections(nfts).sort()).toEqual(['Alpha', 'Beta']);
  });
});

describe('getNftsByCollection', () => {
  it('groups + sorts by length descending', () => {
    const a = buildMockNft({ collection: { key: 'A', verified: true, name: 'Alpha' } });
    const b = buildMockNft({ collection: { key: 'B', verified: true, name: 'Beta' } });
    const groups = getNftsByCollection([a, a, b]);
    expect(groups[0].collection).toBe('Alpha');
    expect(groups[0].length).toBe(2);
    expect(groups[1].collection).toBe('Beta');
  });
});

describe('getNftsWithoutCollection', () => {
  it('keeps only NFTs whose collection.name is empty', () => {
    const a = buildMockNft({ collection: { key: 'A', verified: true, name: 'Alpha' } });
    const standalone = buildMockNft({ collection: null });
    const result = getNftsWithoutCollection([a, standalone]);
    expect(result).toEqual([standalone]);
  });
});

describe('isCollection / isMoreThanOne', () => {
  it('detects collection groups', () => {
    const group: NftCollectionGroup = {
      collection: 'A',
      length: 2,
      items: [buildMockNft(), buildMockNft()],
      thumb: null,
    };
    expect(isCollection(group)).toBe(true);
    expect(isCollection(buildMockNft())).toBe(false);
    expect(isMoreThanOne(group)).toBe(true);
  });
});

describe('isBlacklisted', () => {
  it('reads blacklisted from the first item of a group', () => {
    const group: NftCollectionGroup = {
      collection: 'A',
      length: 1,
      items: [buildMockNft({ blacklisted: true })],
      thumb: null,
    };
    expect(isBlacklisted(group)).toBe(true);
  });

  it('reads blacklisted from a standalone NFT', () => {
    expect(isBlacklisted(buildMockNft({ blacklisted: true }))).toBe(true);
    expect(isBlacklisted(buildMockNft())).toBe(false);
  });
});
