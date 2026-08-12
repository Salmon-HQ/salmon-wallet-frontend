/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('../utils/account', () => ({
  isSolanaAccount: vi.fn(),
}));

import { useAvatarNfts } from './useAvatarNfts';
import { isSolanaAccount } from '../utils/account';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';

const mockIsSolanaAccount = vi.mocked(isSolanaAccount);

function makeWrapper() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  return { client, wrapper };
}

function makeAccount(id: string, getAllNfts: ReturnType<typeof vi.fn>) {
  return {
    id,
    networksAccounts: {
      'solana-mainnet': [
        {
          getAllNfts,
        },
      ],
    },
  } as any;
}

describe('useAvatarNfts (react-query)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSolanaAccount.mockReturnValue(true);
  });

  it('fetches NFTs on mount when enabled', async () => {
    const getAllNfts = vi
      .fn()
      .mockResolvedValue([
        { mint: { address: 'mint-1' }, name: 'Cool', media: 'https://img/1.png' },
      ]);
    const account = makeAccount('a-1', getAllNfts);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAvatarNfts({ account, enabled: true }), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.nfts).toHaveLength(1);
    });

    expect(getAllNfts).toHaveBeenCalledTimes(1);
    expect(result.current.nfts[0]).toEqual({
      mint: 'mint-1',
      name: 'Cool',
      image: 'https://img/1.png',
    });
  });

  it('does not fetch when enabled is false', async () => {
    const getAllNfts = vi.fn().mockResolvedValue([]);
    const account = makeAccount('a-2', getAllNfts);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAvatarNfts({ account, enabled: false }), { wrapper });

    // Give react-query a tick — query should remain idle
    await act(async () => {
      await Promise.resolve();
    });

    expect(getAllNfts).not.toHaveBeenCalled();
    expect(result.current.nfts).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('refresh() triggers a refetch', async () => {
    const getAllNfts = vi
      .fn()
      .mockResolvedValueOnce([
        { mint: { address: 'mint-1' }, name: 'A', media: 'https://img/a.png' },
      ])
      .mockResolvedValueOnce([
        { mint: { address: 'mint-1' }, name: 'A', media: 'https://img/a.png' },
        { mint: { address: 'mint-2' }, name: 'B', media: 'https://img/b.png' },
      ]);
    const account = makeAccount('a-3', getAllNfts);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAvatarNfts({ account, enabled: true }), { wrapper });

    await waitFor(() => {
      expect(result.current.nfts).toHaveLength(1);
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.nfts).toHaveLength(2);
    });
    expect(getAllNfts).toHaveBeenCalledTimes(2);
  });

  it('filters out NFTs without an image (preserves spam-filter policy)', async () => {
    const getAllNfts = vi.fn().mockResolvedValue([
      { mint: { address: 'with-img' }, name: 'Visible', media: 'https://img/x.png' },
      { mint: { address: 'no-img' }, name: 'Hidden', media: null },
      { mint: { address: 'no-img-2' }, name: 'Hidden 2' },
    ]);
    const account = makeAccount('a-4', getAllNfts);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAvatarNfts({ account, enabled: true }), { wrapper });

    await waitFor(() => {
      expect(result.current.nfts).toHaveLength(1);
    });
    expect(result.current.nfts[0]?.mint).toBe('with-img');
  });

  it('returns empty list when there is no Solana account', async () => {
    mockIsSolanaAccount.mockReturnValue(false);
    const getAllNfts = vi.fn();
    const account = makeAccount('a-5', getAllNfts);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAvatarNfts({ account, enabled: true }), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.nfts).toEqual([]);
    expect(getAllNfts).not.toHaveBeenCalled();
  });
});
