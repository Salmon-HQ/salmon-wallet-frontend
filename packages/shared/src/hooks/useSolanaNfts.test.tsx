/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('../api/services/solana-nft', () => ({
  getSolanaNfts: vi.fn(),
}));

import { useSolanaNfts } from './useSolanaNfts';
import { useInvalidateAfterTx } from '../query/invalidation';
import { getSolanaNfts } from '../api/services/solana-nft';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';

const mockGetSolanaNfts = vi.mocked(getSolanaNfts);

function makeWrapper() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  return { client, wrapper };
}

const sampleNft = {
  mint: { address: 'mint-1' },
  owner: 'wallet-1',
  name: 'Sample',
  symbol: 'S',
  uri: '',
  json: {},
  updateAuthorityAddress: null,
  sellerFeeBasisPoints: 0,
  collection: null,
  edition: null,
  tokenStandard: null,
  media: 'https://img/1.png',
  description: '',
  compressed: false,
  extras: { attributes: [], properties: {}, creators: [] },
  extensions: [],
} as any;

describe('useSolanaNfts (react-query)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches NFTs on mount and exposes them via `nfts`', async () => {
    mockGetSolanaNfts.mockResolvedValue({ nfts: [sampleNft], partial: false });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useSolanaNfts({ publicKey: 'wallet-1', networkId: 'solana-mainnet' as any }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.nfts).toHaveLength(1);
    });

    expect(mockGetSolanaNfts).toHaveBeenCalledWith('solana-mainnet', 'wallet-1', false, {
      includeSpam: false,
    });
  });

  it('does not fetch when publicKey is missing', async () => {
    mockGetSolanaNfts.mockResolvedValue({ nfts: [], partial: false });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useSolanaNfts({ publicKey: undefined, networkId: 'solana-mainnet' as any }),
      { wrapper }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetSolanaNfts).not.toHaveBeenCalled();
    expect(result.current.nfts).toEqual([]);
  });

  it('refresh() triggers a refetch', async () => {
    mockGetSolanaNfts
      .mockResolvedValueOnce({ nfts: [sampleNft], partial: false })
      .mockResolvedValueOnce({
        nfts: [sampleNft, { ...sampleNft, mint: { address: 'mint-2' } }],
        partial: false,
      });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useSolanaNfts({ publicKey: 'wallet-1', networkId: 'solana-mainnet' as any }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.nfts).toHaveLength(1);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.nfts).toHaveLength(2);
    });
    expect(mockGetSolanaNfts).toHaveBeenCalledTimes(2);
  });

  // Home's tab transition remounts the grid while it animates out; a remount
  // inside the 15 s window must reuse the list, not walk the pages again.
  it('reuses a list younger than 15s on a remount, and refetches once it is older', async () => {
    mockGetSolanaNfts.mockResolvedValue({ nfts: [sampleNft], partial: false });
    const params = { publicKey: 'wallet-stale', networkId: 'solana-mainnet' as any };

    const { client, wrapper } = makeWrapper();
    const first = renderHook(() => useSolanaNfts(params), { wrapper });
    await waitFor(() => expect(first.result.current.hasData).toBe(true));
    first.unmount();

    const second = renderHook(() => useSolanaNfts(params), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    expect(second.result.current.nfts).toHaveLength(1);
    expect(mockGetSolanaNfts).toHaveBeenCalledTimes(1);
    second.unmount();

    const [query] = client.getQueryCache().findAll({ queryKey: ['solana-nfts'] });
    query!.setState({ dataUpdatedAt: Date.now() - 16_000 });
    renderHook(() => useSolanaNfts(params), { wrapper });
    await waitFor(() => expect(mockGetSolanaNfts).toHaveBeenCalledTimes(2));
  });

  // The indexer can list a sent NFT for a minute more; a refetch in that window
  // must not put it back on screen.
  it('keeps an NFT that just left the wallet out of a refetched list', async () => {
    const heldMint = { ...sampleNft, mint: { address: 'held-mint' } };
    mockGetSolanaNfts.mockResolvedValue({ nfts: [sampleNft, heldMint], partial: false });
    const { wrapper } = makeWrapper();
    const { result: invalidate } = renderHook(() => useInvalidateAfterTx(), { wrapper });
    await act(() =>
      invalidate.current({
        accountId: 'wallet-held',
        kinds: [],
        removedNftMintAddresses: ['held-mint'],
      })
    );

    const { result } = renderHook(
      () => useSolanaNfts({ publicKey: 'wallet-held', networkId: 'solana-mainnet' as any }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.hasData).toBe(true));
    expect(result.current.nfts.map((n) => n.mint.address)).toEqual([sampleNft.mint.address]);
  });

  it('passes includeSpam through to the API', async () => {
    mockGetSolanaNfts.mockResolvedValue({ nfts: [], partial: false });

    const { wrapper } = makeWrapper();
    renderHook(
      () =>
        useSolanaNfts({
          publicKey: 'wallet-1',
          networkId: 'solana-devnet' as any,
          includeSpam: true,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockGetSolanaNfts).toHaveBeenCalledWith('solana-devnet', 'wallet-1', false, {
        includeSpam: true,
      });
    });
  });
});
