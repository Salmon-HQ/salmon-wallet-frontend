/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTokenSearch } from './useTokenSearch';

const TOKENS = [
  { address: 'sol', symbol: 'SOL', name: 'Solana', uiAmount: 2 },
  { address: 'usdc', symbol: 'USDC', name: 'USD Coin', uiAmount: 10 },
  { address: 'jup', symbol: 'JUP', name: 'Jupiter', uiAmount: 1 },
];

describe('useTokenSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters locally for short queries and paginates results', () => {
    const { result } = renderHook(() => useTokenSearch(TOKENS));

    expect(result.current.displayTokens).toHaveLength(3);
    expect(result.current.paginatedTokens).toHaveLength(3);
    expect(result.current.hasMore).toBe(false);
  });

  it('debounces external search and exposes async results', async () => {
    const onSearch = vi.fn().mockResolvedValue([{ address: 'ray', symbol: 'RAY', name: 'Raydium' }]);
    const { result } = renderHook(() => useTokenSearch(TOKENS, onSearch));

    act(() => {
      result.current.setSearchQuery('ray');
    });

    expect(result.current.isSearching).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(onSearch).toHaveBeenCalledWith('ray');
    expect(result.current.displayTokens).toEqual([
      { address: 'ray', symbol: 'RAY', name: 'Raydium' },
    ]);
    expect(result.current.isSearching).toBe(false);
  });

  it('ignores stale async results from older queries', async () => {
    let resolveFirst: ((value: any) => void) | undefined;
    let resolveSecond: ((value: any) => void) | undefined;
    const onSearch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

    const { result } = renderHook(() => useTokenSearch(TOKENS, onSearch));

    act(() => {
      result.current.setSearchQuery('ray');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    act(() => {
      result.current.setSearchQuery('bonk');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await act(async () => {
      resolveFirst?.([{ address: 'ray', symbol: 'RAY', name: 'Raydium' }]);
      await Promise.resolve();
      resolveSecond?.([{ address: 'bonk', symbol: 'BONK', name: 'Bonk' }]);
      await Promise.resolve();
    });

    expect(result.current.displayTokens).toEqual([
      { address: 'bonk', symbol: 'BONK', name: 'Bonk' },
    ]);
  });

  it('captures search errors and reset clears state', async () => {
    const onSearch = vi.fn().mockRejectedValue(new Error('search backend down'));
    const { result } = renderHook(() => useTokenSearch(TOKENS, onSearch));

    act(() => {
      result.current.setSearchQuery('ray');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.error).toBe('search backend down');
    expect(result.current.isError).toBe(true);
    expect(result.current.displayTokens).toEqual([]);

    act(() => {
      result.current.reset();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.displayTokens).toHaveLength(3);
  });

  it('retry re-runs the current query after a failure', async () => {
    const onSearch = vi
      .fn()
      .mockRejectedValueOnce(new Error('search backend down'))
      .mockResolvedValueOnce([{ address: 'ray', symbol: 'RAY', name: 'Raydium' }]);
    const { result } = renderHook(() => useTokenSearch(TOKENS, onSearch));

    act(() => {
      result.current.setSearchQuery('ray');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.isError).toBe(true);

    act(() => {
      result.current.retry();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(onSearch).toHaveBeenCalledTimes(2);
    expect(onSearch).toHaveBeenLastCalledWith('ray');
    expect(result.current.isError).toBe(false);
    expect(result.current.displayTokens).toEqual([
      { address: 'ray', symbol: 'RAY', name: 'Raydium' },
    ]);
  });

  it('clears a stale error when the query drops below the search threshold', async () => {
    const onSearch = vi.fn().mockRejectedValue(new Error('search backend down'));
    const { result } = renderHook(() => useTokenSearch(TOKENS, onSearch));

    act(() => {
      result.current.setSearchQuery('ray');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.isError).toBe(true);

    act(() => {
      result.current.setSearchQuery('');
    });

    // The local token list must render again — an old search error must not
    // keep blocking it.
    expect(result.current.isError).toBe(false);
    expect(result.current.displayTokens).toHaveLength(3);
  });
});
