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

    const { nfts: result } = await getSolanaNfts('solana-mainnet', 'Owner111', true);

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

    const { nfts: result } = await getSolanaNfts('solana-mainnet', 'Owner111', false);

    expect(result).toHaveLength(1);
    expect(result[0]?.mint.address).toBe('Mint111');
  });

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

  it('walks every page so wallets holding more than one page are not truncated', async () => {
    mockApiClientGet
      .mockResolvedValueOnce(
        page(['Mint111'], { total: 2, limit: 100, offset: 0, hasMore: true, nextOffset: 100 })
      )
      .mockResolvedValueOnce(
        page(['Mint222'], { total: 2, limit: 100, offset: 100, hasMore: false, nextOffset: null })
      );

    const { nfts: result } = await getSolanaNfts('solana-mainnet', 'Owner111', false);

    expect(mockApiClientGet).toHaveBeenCalledTimes(2);
    expect(mockApiClientGet).toHaveBeenLastCalledWith('/v1/solana-mainnet/nft', {
      params: { publicKey: 'Owner111', noCache: false, limit: 100, offset: 100 },
      timeout: 15000,
    });
    expect(result.map((nft) => nft.mint.address)).toEqual(['Mint111', 'Mint222']);
  });

  it('keeps the pages that arrived when a later page fails', async () => {
    // The failure this pins: one 500 on page ten used to reject the whole walk,
    // so a wallet whose first nine pages loaded rendered zero NFTs.
    mockApiClientGet
      .mockResolvedValueOnce(
        page(['Mint111'], { total: 3, limit: 100, offset: 0, hasMore: true, nextOffset: 100 })
      )
      .mockResolvedValueOnce(
        page(['Mint222'], { total: 3, limit: 100, offset: 100, hasMore: true, nextOffset: 200 })
      )
      .mockRejectedValueOnce(new Error('server_error'));

    const { nfts, partial } = await getSolanaNfts('solana-mainnet', 'Owner111', false);

    expect(nfts.map((nft) => nft.mint.address)).toEqual(['Mint111', 'Mint222']);
    // Short, and it says so — a partial list must never pass for a complete one.
    expect(partial).toBe(true);
  });

  it('counts what the backend withheld and what this client dropped', async () => {
    // The arithmetic has to close against the screen. On the spam wallet the
    // backend withholds 940 of 1000 and sends 77, of which 51 carry no image —
    // so 26 render. Reporting only the backend's number strands the other 51.
    mockApiClientGet.mockResolvedValueOnce({
      data: {
        data: [
          { mint: 'Mint111', owner: 'Owner111', media: 'https://example.com/a.png' },
          { mint: 'Mint222', owner: 'Owner111', media: null },
        ],
        pagination: {
          total: 100,
          limit: 100,
          offset: 0,
          hasMore: false,
          nextOffset: null,
          hidden: { spam: 94, fungible: 3 },
        },
      },
    });

    const { nfts, hiddenSpam, hiddenWithoutMedia } = await getSolanaNfts(
      'solana-mainnet',
      'Owner111',
      false
    );

    expect(nfts).toHaveLength(1);
    expect(hiddenSpam).toBe(94);
    expect(hiddenWithoutMedia).toBe(1);
  });

  it('reports nothing hidden when the backend sends no hidden block', async () => {
    // Older backends, and the array-shaped response, carry no pagination at all.
    mockApiClientGet.mockResolvedValueOnce(
      page(['Mint111'], { total: 1, limit: 100, offset: 0, hasMore: false, nextOffset: null })
    );

    const { hiddenSpam, hiddenWithoutMedia } = await getSolanaNfts(
      'solana-mainnet',
      'Owner111',
      false
    );

    expect(hiddenSpam).toBe(0);
    expect(hiddenWithoutMedia).toBe(0);
  });

  it('throws when the very first page fails, instead of returning an empty list', async () => {
    // Nothing arrived, so there is nothing to show. An empty list here would
    // render as "you own no NFTs", which is the lie the error state exists to
    // prevent.
    mockApiClientGet.mockRejectedValueOnce(new Error('server_error'));

    await expect(getSolanaNfts('solana-mainnet', 'Owner111', false)).rejects.toThrow(
      'server_error'
    );
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

      const { nfts } = await getSolanaNfts('solana-mainnet', testOwner, true);

      expect(Array.isArray(nfts)).toBe(true);
      for (const nft of nfts) {
        expect(nft.owner).toBeTruthy();
        expect(nft.mint.address).toBeTruthy();
        expect(nft.media).toBeTruthy();
      }
    }
  );
});
