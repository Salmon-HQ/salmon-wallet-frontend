import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../client';
import { getReachableBackendBaseUrl } from '../test-backend';

vi.mock('../client', async () => {
  const actual = await vi.importActual<typeof import('../client')>('../client');

  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
    },
  };
});

import { apiClient } from '../client';
import { getSolanaNfts } from './solana-nft';

const mockApiClientGet = vi.mocked(apiClient.get);

const backendBaseUrl = await getReachableBackendBaseUrl();

describe('solana-nft service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards the noCache flag to the backend owner NFT endpoint', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: {
        data: [
          {
            mint: 'Mint111',
            owner: 'Owner111',
            name: 'Alpha',
            symbol: 'ALPHA',
            media: 'https://example.com/alpha.png',
            collection: { name: 'Collection', key: 'collection-key', verified: true },
          },
        ],
      },
    });

    const result = await getSolanaNfts('solana-mainnet', 'Owner111', true);

    expect(mockApiClientGet).toHaveBeenCalledWith('/v1/solana-mainnet/nft', {
      params: { publicKey: 'Owner111', noCache: true, limit: 100, offset: 0 },
      timeout: 15000,
    });
    expect(result).toEqual([
      expect.objectContaining({
        mint: { address: 'Mint111' },
        owner: 'Owner111',
        name: 'Alpha',
        media: 'https://example.com/alpha.png',
      }),
    ]);
  });

  it('filters NFTs that have no usable media after normalization', async () => {
    mockApiClientGet.mockResolvedValueOnce({
      data: {
        data: [
          {
            mint: 'Mint111',
            owner: 'Owner111',
            name: 'Visible NFT',
            media: 'https://example.com/visible.png',
          },
          {
            mint: 'Mint222',
            owner: 'Owner111',
            name: 'Hidden NFT',
            media: null,
          },
        ],
      },
    });

    const result = await getSolanaNfts('solana-mainnet', 'Owner111', false);

    expect(result).toHaveLength(1);
    expect(result[0]?.mint.address).toBe('Mint111');
  });

  it('walks every page so wallets holding more than one page are not truncated', async () => {
    const page = (mints: string[], pagination: Record<string, unknown>) => ({
      data: {
        data: mints.map((mint) => ({
          mint,
          owner: 'Owner111',
          media: `https://example.com/${mint}.png`,
        })),
        pagination,
      },
    });

    mockApiClientGet
      .mockResolvedValueOnce(
        page(['Mint111'], { total: 2, limit: 100, offset: 0, hasMore: true, nextOffset: 100 })
      )
      .mockResolvedValueOnce(
        page(['Mint222'], { total: 2, limit: 100, offset: 100, hasMore: false, nextOffset: null })
      );

    const result = await getSolanaNfts('solana-mainnet', 'Owner111', false);

    expect(mockApiClientGet).toHaveBeenCalledTimes(2);
    expect(mockApiClientGet).toHaveBeenLastCalledWith('/v1/solana-mainnet/nft', {
      params: { publicKey: 'Owner111', noCache: false, limit: 100, offset: 100 },
      timeout: 15000,
    });
    expect(result.map((nft) => nft.mint.address)).toEqual(['Mint111', 'Mint222']);
  });
});

describe.skipIf(!backendBaseUrl)('solana-nft service integration', () => {
  const testOwner = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';

  it(
    'reads the live owner NFT endpoint contract from salmon-api and preserves normalization invariants',
    { timeout: 30000 },
    async () => {
      const client = createApiClient({
        baseUrl: backendBaseUrl!,
        timeout: 15000,
      });

      const response = await client.get('/v1/solana-mainnet/nft', {
        params: { publicKey: testOwner, noCache: true },
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          pagination: expect.any(Object),
        })
      );

      mockApiClientGet.mockImplementation(async (path, config) => {
        const url = new URL(`${backendBaseUrl!}${path as string}`);
        const params = config?.params as Record<string, string | boolean> | undefined;
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, String(value));
          }
        }

        const liveResponse = await fetch(url.toString(), {
          method: 'GET',
          signal: AbortSignal.timeout(15000),
        });

        return {
          data: await liveResponse.json(),
        } as { data: unknown };
      });

      const nfts = await getSolanaNfts('solana-mainnet', testOwner, true);

      expect(Array.isArray(nfts)).toBe(true);
      for (const nft of nfts) {
        expect(nft.owner).toBeTruthy();
        expect(nft.mint.address).toBeTruthy();
        expect(nft.media).toBeTruthy();
      }
    }
  );
});
