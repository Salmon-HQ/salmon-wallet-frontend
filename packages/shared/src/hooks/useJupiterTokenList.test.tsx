/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';

vi.mock('../api/services', () => ({
  getTokenList: vi.fn(),
}));
vi.mock('../utils/swap', async () => {
  const actual: any = await vi.importActual('../utils/swap');
  return {
    ...actual,
    mapToSwapToken: (t: any) => ({ address: t.address, symbol: t.symbol, name: t.name }) as any,
  };
});

import { getTokenList } from '../api/services';
import { useJupiterTokenList } from './useJupiterTokenList';

const mockGetTokenList = vi.mocked(getTokenList);

describe('useJupiterTokenList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches and maps token list', async () => {
    mockGetTokenList.mockResolvedValue([
      { address: 'A', symbol: 'A', name: 'A' } as any,
      { address: 'B', symbol: 'B', name: 'B' } as any,
    ]);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useJupiterTokenList({ networkId: 'solana-mainnet' }), {
      wrapper: ({ children }) => <QueryWrapper client={client}>{children}</QueryWrapper>,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetTokenList).toHaveBeenCalledWith('solana-mainnet');
    expect(result.current.tokens).toHaveLength(2);
  });

  it('skips when networkId is undefined', () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useJupiterTokenList({ networkId: undefined }), {
      wrapper: ({ children }) => <QueryWrapper client={client}>{children}</QueryWrapper>,
    });
    expect(mockGetTokenList).not.toHaveBeenCalled();
    expect(result.current.tokens).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
