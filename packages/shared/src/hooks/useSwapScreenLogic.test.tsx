/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import type { SwapToken } from '../types/swap';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';
import { queryKeys } from '../query/keys';

function makeWrapper() {
  const client = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

function makeWrapperWithClient() {
  const client = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  Wrapper.displayName = 'TestWrapperWithClient';
  return { client, wrapper: Wrapper };
}

import { useSwapScreenLogic } from './useSwapScreenLogic';

const SOL: SwapToken = {
  address: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  balance: 2,
  usdPrice: 150,
  chain: 'solana',
  networkId: 'solana-mainnet',
  logo: 'https://example.com/sol.png',
};

const USDC: SwapToken = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  balance: 10,
  usdPrice: 1,
  chain: 'solana',
  networkId: 'solana-mainnet',
  logo: 'https://example.com/usdc.png',
};

const BTC: SwapToken = {
  address: 'BTC',
  symbol: 'BTC',
  name: 'Bitcoin',
  decimals: 8,
  balance: 0.25,
  usdPrice: 70_000,
  chain: 'bitcoin',
  networkId: 'bitcoin',
  logo: 'https://example.com/btc.png',
};

const QUOTE = {
  output: {
    amount: '2500000',
    decimals: 6,
  },
  custom: {
    priceImpact: 0.5,
  },
} as any;

function createProps(overrides: Record<string, unknown> = {}) {
  return {
    tokens: [SOL, USDC],
    featuredTokens: [SOL, USDC],
    jupiterTokens: [SOL, USDC],
    loading: false,
    onGetQuote: vi.fn().mockResolvedValue(QUOTE),
    onSwap: vi.fn().mockResolvedValue({ txId: 'swap-tx-1' }),
    onSuccess: vi.fn(),
    onError: vi.fn(),
    onNavigateHome: vi.fn(),
    ...overrides,
  } as any;
}

describe('useSwapScreenLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces Solana quotes and enables review when quote arrives', async () => {
    vi.useFakeTimers();

    const props = createProps({
      initialInToken: SOL,
      initialOutToken: USDC,
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setInAmount('1');
    });

    expect(result.current.isLoadingQuote).toBe(true);
    expect(props.onGetQuote).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(props.onGetQuote).toHaveBeenCalledWith(SOL, USDC, '1');
    expect(result.current.quote).toBe(QUOTE);
    expect(result.current.outAmount).toBe('2.5');
    expect(result.current.swapMode).toBe('jupiter');
    expect(result.current.canReview).toBe(true);
    expect(result.current.reviewWarning).toBeNull();
  });

  it('does not fetch a quote for a non-Solana pair', async () => {
    vi.useFakeTimers();

    const props = createProps({
      initialInToken: SOL,
      tokens: [SOL, BTC],
      featuredTokens: [SOL, BTC],
      jupiterTokens: [SOL],
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.handleOutTokenSelect(BTC);
    });
    act(() => {
      result.current.setInAmount('1');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(props.onGetQuote).not.toHaveBeenCalled();
    expect(result.current.swapMode).toBeNull();
    expect(result.current.canReview).toBe(false);
  });

  it('discards a stale quote response that resolves after the inputs changed', async () => {
    vi.useFakeTimers();

    const NEW_QUOTE = {
      output: { amount: '5000000', decimals: 6 },
      custom: { priceImpact: 0.4 },
    } as any;

    let resolveStale!: (q: unknown) => void;
    const staleQuotePromise = new Promise((resolve) => {
      resolveStale = resolve;
    });

    const onGetQuote = vi
      .fn()
      // First request (amount '1') hangs until we resolve it manually.
      .mockReturnValueOnce(staleQuotePromise)
      // Second request (amount '2') resolves immediately.
      .mockResolvedValueOnce(NEW_QUOTE);

    const props = createProps({
      initialInToken: SOL,
      initialOutToken: USDC,
      onGetQuote,
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setInAmount('1');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onGetQuote).toHaveBeenCalledTimes(1);

    // User edits the amount while the first request is still in flight.
    act(() => {
      result.current.setInAmount('2');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onGetQuote).toHaveBeenCalledTimes(2);
    expect(result.current.quote).toBe(NEW_QUOTE);
    expect(result.current.outAmount).toBe('5');

    // The slow first response lands late: it must NOT overwrite the newer quote.
    await act(async () => {
      resolveStale(QUOTE);
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.quote).toBe(NEW_QUOTE);
    expect(result.current.outAmount).toBe('5');
    expect(result.current.isLoadingQuote).toBe(false);
  }, 10_000);

  it('clears the quote loading flag when the amount is cleared mid-debounce', async () => {
    vi.useFakeTimers();

    const props = createProps({
      initialInToken: SOL,
      initialOutToken: USDC,
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setInAmount('1');
    });
    expect(result.current.isLoadingQuote).toBe(true);

    // Clearing the amount cancels the debounced request — nothing will ever
    // resolve to clear the flag, so the effect itself must reset it.
    act(() => {
      result.current.setInAmount('');
    });
    expect(result.current.isLoadingQuote).toBe(false);
  });

  it('refreshes instead of executing when the quote countdown has expired on confirm', async () => {
    vi.useFakeTimers();

    const props = createProps({
      initialInToken: SOL,
      initialOutToken: USDC,
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setInAmount('1');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    act(() => {
      result.current.handleReview();
    });
    expect(result.current.step).toBe('review');
    expect(props.onGetQuote).toHaveBeenCalledTimes(1);

    // Let the 15s quote countdown run out on the review screen.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    await act(async () => {
      await result.current.handleConfirmOrRefresh();
    });

    // Expired quote must not be executed — it must be re-quoted.
    expect(props.onSwap).not.toHaveBeenCalled();
    expect(props.onGetQuote).toHaveBeenCalledTimes(2);
    expect(result.current.step).toBe('review');

    // With a fresh quote and a running countdown, confirm now executes.
    await act(async () => {
      await result.current.handleConfirmOrRefresh();
    });
    expect(props.onSwap).toHaveBeenCalledWith(QUOTE);
  }, 10_000);

  it('surfaces minimum USD guardrails before review', () => {
    const lowPriceSol = { ...SOL, usdPrice: 0.5 };
    const props = createProps({
      initialInToken: lowPriceSol,
      initialOutToken: USDC,
      tokens: [lowPriceSol, USDC],
      featuredTokens: [lowPriceSol, USDC],
      jupiterTokens: [lowPriceSol, USDC],
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setInAmount('1');
    });

    expect(result.current.canReview).toBe(false);
    expect(result.current.reviewWarning).toEqual({
      key: 'swap.errors.minimumAmount',
      params: { amount: '1.00' },
    });
  });

  it('refreshes in-token balance when tokens prop changes', async () => {
    const props = createProps({
      initialInToken: SOL,
      initialOutToken: USDC,
    });

    const { result, rerender } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    expect(result.current.inToken?.balance).toBe(2);

    await act(async () => {
      rerender({
        ...props,
        tokens: [{ ...SOL, balance: 5 }, USDC],
        featuredTokens: [{ ...SOL, balance: 5 }, USDC],
        jupiterTokens: [{ ...SOL, balance: 5 }, USDC],
      });
    });

    expect(result.current.inToken?.balance).toBe(5);
  });

  it('uses live in-token balance for validation when tokens prop updates mid-flow', async () => {
    vi.useFakeTimers();

    // Snapshot at mount: SOL balance = 2. User wants to swap 3 SOL — must fail.
    const props = createProps({
      initialInToken: SOL,
      initialOutToken: USDC,
    });

    const { result, rerender } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setInAmount('3');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(result.current.reviewWarning).toBe('swap.errors.insufficientBalance');
    expect(result.current.canReview).toBe(false);

    // Inbound transfer: tokens prop updates to balance = 5 while user is on the
    // swap screen. Validation must accept 3 immediately on this render — not
    // wait for the inToken-sync effect to re-run.
    await act(async () => {
      rerender({
        ...props,
        tokens: [{ ...SOL, balance: 5 }, USDC],
        featuredTokens: [{ ...SOL, balance: 5 }, USDC],
        jupiterTokens: [{ ...SOL, balance: 5 }, USDC],
      });
    });

    expect(result.current.reviewWarning).toBeNull();
  });

  it('confirms a Solana swap and triggers balance refresh callbacks', async () => {
    vi.useFakeTimers();

    const props = createProps({
      initialInToken: SOL,
      initialOutToken: USDC,
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setInAmount('1');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    act(() => {
      result.current.handleReview();
    });
    expect(result.current.step).toBe('review');

    await act(async () => {
      await result.current.handleConfirmSwap();
    });

    expect(props.onSwap).toHaveBeenCalledWith(QUOTE);
    expect(props.onSuccess).toHaveBeenCalledWith('swap-tx-1');
    expect(result.current.step).toBe('success');
    expect(result.current.successTxId).toBe('swap-tx-1');
  });

  it('keeps the confirmed pair in successSummary when the spent token drops out of the list', async () => {
    vi.useFakeTimers();

    const props = createProps({
      initialInToken: SOL,
      initialOutToken: USDC,
    });

    const { result, rerender } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setInAmount('1');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    act(() => {
      result.current.handleReview();
    });

    await act(async () => {
      await result.current.handleConfirmSwap();
    });

    expect(result.current.step).toBe('success');
    expect(result.current.successSummary).toEqual({
      inAmount: '1',
      inSymbol: 'SOL',
      outAmount: '2.5',
      outSymbol: 'USDC',
      chain: 'solana',
      networkId: 'solana-mainnet',
      inLogo: 'https://example.com/sol.png',
      outLogo: 'https://example.com/usdc.png',
      feePercent: undefined,
    });

    // Post-swap settling refreshes balances: the fully-spent input token drops
    // out of the tokens list, so the reselection effect falls back to another
    // token and clears the amounts. The mounted success screen must keep
    // showing the pair the user actually swapped.
    await act(async () => {
      rerender({
        ...props,
        tokens: [USDC, BTC],
        featuredTokens: [USDC, BTC],
        jupiterTokens: [USDC, BTC],
      });
    });

    expect(result.current.inToken?.symbol).not.toBe('SOL');
    expect(result.current.inAmount).toBe('');
    expect(result.current.step).toBe('success');
    expect(result.current.successSummary).toEqual({
      inAmount: '1',
      inSymbol: 'SOL',
      outAmount: '2.5',
      outSymbol: 'USDC',
      chain: 'solana',
      networkId: 'solana-mainnet',
      inLogo: 'https://example.com/sol.png',
      outLogo: 'https://example.com/usdc.png',
      feePercent: undefined,
    });

    act(() => {
      result.current.handleSuccessContinue();
    });

    expect(result.current.successSummary).toBeNull();
  });

  it('returns to the form with a classified error when a swap fails', async () => {
    vi.useFakeTimers();

    const error = new Error('Transaction simulation failed: Slippage tolerance exceeded');
    const props = createProps({
      initialInToken: SOL,
      initialOutToken: USDC,
      onSwap: vi.fn().mockRejectedValue(error),
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setInAmount('1');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    act(() => {
      result.current.handleReview();
    });

    await act(async () => {
      await result.current.handleConfirmSwap();
    });

    expect(result.current.step).toBe('input');
    expect(result.current.swapError).toBe('transaction.errors.slippage');
    expect(result.current.inAmount).toBe('1');
    expect(props.onError).toHaveBeenCalledWith(error);

    act(() => {
      result.current.setInAmount('2');
    });

    expect(result.current.swapError).toBeNull();
  });

  it('classifies a swap failure with no SOL for the fee like the send path', async () => {
    vi.useFakeTimers();

    const props = createProps({
      initialInToken: SOL,
      initialOutToken: USDC,
      onSwap: vi
        .fn()
        .mockRejectedValue(
          new Error('Attempt to debit an account but found no record of a prior credit.')
        ),
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setInAmount('1');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    act(() => {
      result.current.handleReview();
    });

    await act(async () => {
      await result.current.handleConfirmSwap();
    });

    expect(result.current.swapError).toBe('transaction.errors.insufficientFeeSol');
  });

  it('settles after a Jupiter swap by polling until the indexer reflects the new balance', async () => {
    // Event-driven settlement (useSettleUntilChanged): keep `settling` true and
    // keep refetching until the on-chain balance signature actually changes.
    const amounts = { current: '1000000000' };
    const fetchBalance = vi.fn(async () => ({
      items: [{ address: 'So11111111111111111111111111111111111111112', amount: amounts.current }],
    }));

    const props = createProps({
      initialInToken: SOL,
      initialOutToken: USDC,
    });
    const balanceKey = queryKeys.balance({
      accountId: 'wallet-1',
      networkId: 'solana-mainnet' as never,
    });
    const { wrapper, client } = makeWrapperWithClient();

    const { result } = renderHook(
      (hookProps) => {
        const balanceQuery = useQuery({
          queryKey: balanceKey,
          queryFn: fetchBalance,
          staleTime: 15_000,
        });
        const swapLogic = useSwapScreenLogic(hookProps);
        return { balanceQuery, swapLogic };
      },
      {
        initialProps: props,
        wrapper,
      }
    );

    await waitFor(() => {
      expect(result.current.balanceQuery.data?.items?.[0]?.amount).toBe('1000000000');
    });

    vi.useFakeTimers();

    act(() => {
      result.current.swapLogic.setInAmount('1');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    act(() => {
      result.current.swapLogic.handleReview();
    });

    await act(async () => {
      await result.current.swapLogic.handleConfirmSwap();
    });

    // Success is shown immediately; settlement is still pending because the
    // indexer has not reflected the swap yet.
    expect(result.current.swapLogic.step).toBe('success');
    expect(result.current.swapLogic.settling).toBe(true);

    // One poll later the provider is still stale -> keep waiting.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });
    expect(result.current.swapLogic.settling).toBe(true);

    // Indexer catches up; the next poll observes the changed signature, settles
    // the remaining kinds, and releases the screen.
    amounts.current = '990000000';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(result.current.swapLogic.settling).toBe(false);
    });
    expect(
      (client.getQueryData(balanceKey) as { items: Array<{ amount: string }> }).items[0].amount
    ).toBe('990000000');
  });

  it('resets state after success and refreshes balances again on continue', async () => {
    vi.useFakeTimers();

    const props = createProps({
      initialInToken: SOL,
      initialOutToken: USDC,
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setInAmount('1');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    act(() => {
      result.current.handleReview();
    });

    await act(async () => {
      await result.current.handleConfirmSwap();
    });

    act(() => {
      result.current.handleSuccessContinue();
    });

    expect(props.onNavigateHome).toHaveBeenCalledTimes(1);
    expect(result.current.step).toBe('input');
    expect(result.current.inAmount).toBe('');
    expect(result.current.outAmount).toBe('');
    expect(result.current.quote).toBeNull();
    expect(result.current.successTxId).toBeNull();
  });
});
