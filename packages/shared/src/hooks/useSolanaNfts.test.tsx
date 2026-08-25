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
    mockGetSolanaNfts.mockResolvedValue({
      nfts: [sampleNft],
      partial: false,
      hiddenSpam: 0,
      hiddenWithoutMedia: 0,
    });

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
    mockGetSolanaNfts.mockResolvedValue({
      nfts: [],
      partial: false,
      hiddenSpam: 0,
      hiddenWithoutMedia: 0,
    });

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
      .mockResolvedValueOnce({
        nfts: [sampleNft],
        partial: false,
        hiddenSpam: 0,
        hiddenWithoutMedia: 0,
      })
      .mockResolvedValueOnce({
        nfts: [sampleNft, { ...sampleNft, mint: { address: 'mint-2' } }],
        partial: false,
        hiddenSpam: 0,
        hiddenWithoutMedia: 0,
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

  it('configures staleTime to 60s on the underlying RQ query', async () => {
    mockGetSolanaNfts.mockResolvedValue({
      nfts: [sampleNft],
      partial: false,
      hiddenSpam: 0,
      hiddenWithoutMedia: 0,
    });

    const { client, wrapper } = makeWrapper();
    renderHook(
      () => useSolanaNfts({ publicKey: 'wallet-stale', networkId: 'solana-mainnet' as any }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockGetSolanaNfts).toHaveBeenCalled();
    });

    const queries = client.getQueryCache().findAll({ queryKey: ['solana-nfts'] });
    expect(queries.length).toBeGreaterThan(0);
    expect((queries[0]!.options as { staleTime?: number }).staleTime).toBe(60_000);
  });

  it('passes includeSpam through to the API', async () => {
    mockGetSolanaNfts.mockResolvedValue({
      nfts: [],
      partial: false,
      hiddenSpam: 0,
      hiddenWithoutMedia: 0,
    });

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
