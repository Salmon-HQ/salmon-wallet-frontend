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

vi.mock('../utils/account', () => ({
  getChainDisplayName: vi.fn((chain?: string | null) => {
    if (chain === 'solana') return 'Solana';
    if (chain === 'bitcoin') return 'Bitcoin';
    if (chain === 'ethereum') return 'Ethereum';
    return 'Unknown';
  }),
}));

vi.mock('../api/services/network', () => ({
  getEnabledNetworkIds: vi.fn().mockResolvedValue([]),
}));

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

const BRIDGE_ESTIMATE = {
  estimatedAmount: 0.000021,
  minAmount: 0.00001,
  symbolIn: 'SOL',
  symbolOut: 'BTC',
} as any;

const BRIDGE_AVAILABLE_TOKENS = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    network: null,
    logo: 'https://example.com/btc.png',
  },
] as any;

const BRIDGE_EXCHANGE = {
  id: 'bridge-1',
  depositAddress: 'bridge-deposit-address',
  amountIn: 1,
  amountOut: 0.000021,
  symbolIn: 'SOL',
  symbolOut: 'BTC',
  addressTo: 'btc-recipient',
  status: 'waiting',
} as any;

const BRIDGE_TRANSACTION = {
  status: 'confirming',
  payoutTxId: 'btc-payout-hash',
} as any;

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
    onGetAvailableTokens: undefined,
    onGetBridgeEstimate: vi.fn().mockResolvedValue(BRIDGE_ESTIMATE),
    onCreateBridgeExchange: vi.fn().mockResolvedValue(BRIDGE_EXCHANGE),
    onGetBridgeTransactionStatus: vi.fn().mockResolvedValue(BRIDGE_TRANSACTION),
    onBridgeSuccess: vi.fn(),
    onBridgeError: vi.fn(),
    onSendDeposit: vi.fn().mockResolvedValue({ txId: 'deposit-tx-1' }),
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

  it('requires a valid recipient address before moving from bridge recipient to review', async () => {
    vi.useFakeTimers();

    const props = createProps({
      initialInToken: SOL,
      tokens: [SOL],
      featuredTokens: [SOL],
      jupiterTokens: [SOL, USDC],
      onGetAvailableTokens: vi.fn().mockResolvedValue(BRIDGE_AVAILABLE_TOKENS),
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleOutTokenSelect(BTC);
    });

    act(() => {
      result.current.setInAmount('1');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(props.onGetBridgeEstimate).toHaveBeenCalledTimes(1);
    expect(result.current.bridgeEstimate).toBe(BRIDGE_ESTIMATE);
    expect(result.current.swapMode).toBe('stealthex');
    expect(result.current.canReview).toBe(true);

    act(() => {
      result.current.handleReview();
    });

    expect(result.current.step).toBe('recipient');

    act(() => {
      result.current.setRecipientAddress('bad');
    });

    act(() => {
      result.current.handleContinueToReview();
    });

    expect(result.current.step).toBe('recipient');
    expect(result.current.addressError).toBe('swap.errors.invalidBitcoinAddress');
  });

  describe('bridge maximum amount validation', () => {
    async function renderBridgeWithEstimate(estimate: unknown, inAmount: string) {
      const props = createProps({
        initialInToken: SOL,
        tokens: [SOL],
        featuredTokens: [SOL],
        jupiterTokens: [SOL, USDC],
        onGetAvailableTokens: vi.fn().mockResolvedValue(BRIDGE_AVAILABLE_TOKENS),
        onGetBridgeEstimate: vi.fn().mockResolvedValue(estimate),
      });

      const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
        initialProps: props,
        wrapper: makeWrapper(),
      });

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        result.current.handleOutTokenSelect(BTC);
      });

      act(() => {
        result.current.setInAmount(inAmount);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
        await Promise.resolve();
        await Promise.resolve();
      });

      return result;
    }

    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('blocks review and warns when the amount exceeds the pair maximum', async () => {
      const result = await renderBridgeWithEstimate({ ...BRIDGE_ESTIMATE, maxAmount: 0.5 }, '1');

      expect(result.current.canReview).toBe(false);
      expect(result.current.reviewWarning).toEqual({
        key: 'bridge.errors.aboveMaximumWithAmount',
        params: { max: '0.5 SOL' },
      });
    });

    it('allows review when the amount is within the pair maximum', async () => {
      const result = await renderBridgeWithEstimate({ ...BRIDGE_ESTIMATE, maxAmount: 1.5 }, '1');

      expect(result.current.canReview).toBe(true);
      expect(result.current.reviewWarning).toBeNull();
    });

    it('does not block when the pair has no maximum', async () => {
      const result = await renderBridgeWithEstimate({ ...BRIDGE_ESTIMATE, maxAmount: null }, '1');

      expect(result.current.canReview).toBe(true);
      expect(result.current.reviewWarning).toBeNull();
    });
  });

  it('confirms a bridge end-to-end: estimate → review → deposit → success + status tracking', async () => {
    vi.useFakeTimers();

    const props = createProps({
      initialInToken: SOL,
      tokens: [SOL],
      featuredTokens: [SOL],
      jupiterTokens: [SOL, USDC],
      onGetAvailableTokens: vi.fn().mockResolvedValue(BRIDGE_AVAILABLE_TOKENS),
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleOutTokenSelect(BTC);
      result.current.setInAmount('1');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(props.onGetBridgeEstimate).toHaveBeenCalledTimes(1);
    expect(result.current.bridgeEstimate).toBe(BRIDGE_ESTIMATE);

    act(() => {
      result.current.handleReview();
      result.current.setRecipientAddress('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    });

    act(() => {
      result.current.handleContinueToReview();
    });

    expect(result.current.step).toBe('review');

    await act(async () => {
      await result.current.handleConfirmBridge();
    });

    expect(props.onCreateBridgeExchange).toHaveBeenCalledWith(
      'SOL',
      'BTC',
      1,
      'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      'sol',
      'btc'
    );
    expect(props.onSendDeposit).toHaveBeenCalledWith('bridge-deposit-address', SOL.address, 1);
    expect(props.onBridgeSuccess).toHaveBeenCalledWith(BRIDGE_EXCHANGE);
    expect(props.onGetBridgeTransactionStatus).toHaveBeenCalledWith('bridge-1');
    expect(result.current.bridgeTransaction).toEqual(BRIDGE_TRANSACTION);
    expect(result.current.successExchange).toBe(BRIDGE_EXCHANGE);
    expect(result.current.depositTxId).toBe('deposit-tx-1');
    expect(result.current.step).toBe('success');
    expect(result.current.successSummary).toEqual({
      inAmount: '1',
      inSymbol: 'SOL',
      outAmount: '0.000021',
      outSymbol: 'BTC',
      chain: 'solana',
      networkId: 'solana-mainnet',
    });
  });

  it('surfaces the pair minimum from the estimate when the bridge rejects the amount', async () => {
    vi.useFakeTimers();

    const error = new Error('Bridge create exchange failed: amount is less than minimal');
    const props = createProps({
      initialInToken: SOL,
      tokens: [SOL],
      featuredTokens: [SOL],
      jupiterTokens: [SOL, USDC],
      onGetAvailableTokens: vi.fn().mockResolvedValue(BRIDGE_AVAILABLE_TOKENS),
      onCreateBridgeExchange: vi.fn().mockRejectedValue(error),
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleOutTokenSelect(BTC);
    });

    act(() => {
      result.current.setInAmount('1');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      result.current.handleReview();
    });

    act(() => {
      result.current.setRecipientAddress('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    });

    act(() => {
      result.current.handleContinueToReview();
    });

    await act(async () => {
      await result.current.handleConfirmBridge();
    });

    expect(result.current.swapError).toEqual({
      key: 'bridge.errors.belowMinimumWithAmount',
      params: { min: '0.00001 SOL' },
    });
  });

  it('returns to input after a bridge failure and reports the error callback', async () => {
    vi.useFakeTimers();

    const error = new Error('bridge unavailable');
    const props = createProps({
      initialInToken: SOL,
      tokens: [SOL],
      featuredTokens: [SOL],
      jupiterTokens: [SOL, USDC],
      onGetAvailableTokens: vi.fn().mockResolvedValue(BRIDGE_AVAILABLE_TOKENS),
      onCreateBridgeExchange: vi.fn().mockRejectedValue(error),
    });

    const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
      initialProps: props,
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleOutTokenSelect(BTC);
    });

    act(() => {
      result.current.setInAmount('1');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(props.onGetBridgeEstimate).toHaveBeenCalledTimes(1);
    expect(result.current.bridgeEstimate).toBe(BRIDGE_ESTIMATE);

    act(() => {
      result.current.handleReview();
    });

    act(() => {
      result.current.setRecipientAddress('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    });

    act(() => {
      result.current.handleContinueToReview();
    });

    await act(async () => {
      await result.current.handleConfirmBridge();
    });

    expect(result.current.step).toBe('input');
    expect(result.current.swapError).toBe('bridge.errors.unavailable');
    expect(props.onBridgeError).toHaveBeenCalledWith(error);
  });

  describe('bridge token filtering by enabled chain', () => {
    it('keeps native cross-chain tokens (network=null) when their chain is enabled', async () => {
      const networkModule = await import('../api/services/network');
      vi.mocked(networkModule.getEnabledNetworkIds).mockResolvedValueOnce([
        'solana-mainnet',
        'bitcoin-mainnet',
      ]);

      const props = createProps({
        initialInToken: SOL,
        tokens: [SOL],
        featuredTokens: [SOL],
        jupiterTokens: [SOL],
        onGetAvailableTokens: vi.fn().mockResolvedValue([
          { symbol: 'BTC', name: 'Bitcoin', network: null, chain: 'bitcoin', logo: 'btc.png' },
          { symbol: 'ETH', name: 'Ethereum', network: null, chain: 'ethereum', logo: 'eth.png' },
        ]),
      });

      const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
        initialProps: props,
        wrapper: makeWrapper(),
      });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      const symbols = result.current.outputTokens.map((t) => t.symbol);
      expect(symbols).toContain('BTC');
      expect(symbols).not.toContain('ETH');
    });

    it('falls back to symbol inference when backend omits the chain field', async () => {
      const networkModule = await import('../api/services/network');
      vi.mocked(networkModule.getEnabledNetworkIds).mockResolvedValueOnce([
        'solana-mainnet',
        'bitcoin-mainnet',
      ]);

      const props = createProps({
        initialInToken: SOL,
        tokens: [SOL],
        featuredTokens: [SOL],
        jupiterTokens: [SOL],
        onGetAvailableTokens: vi
          .fn()
          .mockResolvedValue([{ symbol: 'BTC', name: 'Bitcoin', network: null, logo: 'btc.png' }]),
      });

      const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
        initialProps: props,
        wrapper: makeWrapper(),
      });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.outputTokens.map((t) => t.symbol)).toContain('BTC');
    });

    it('drops tokens whose chain is not in the enabled set', async () => {
      const networkModule = await import('../api/services/network');
      vi.mocked(networkModule.getEnabledNetworkIds).mockResolvedValueOnce(['solana-mainnet']);

      const props = createProps({
        initialInToken: SOL,
        tokens: [SOL],
        featuredTokens: [SOL],
        jupiterTokens: [SOL],
        onGetAvailableTokens: vi
          .fn()
          .mockResolvedValue([
            { symbol: 'BTC', name: 'Bitcoin', network: null, chain: 'bitcoin', logo: 'btc.png' },
          ]),
      });

      const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
        initialProps: props,
        wrapper: makeWrapper(),
      });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.outputTokens.map((t) => t.symbol)).not.toContain('BTC');
    });

    it('keeps every token when no networks are enabled (catalog still loading)', async () => {
      const networkModule = await import('../api/services/network');
      vi.mocked(networkModule.getEnabledNetworkIds).mockResolvedValueOnce([]);

      const props = createProps({
        initialInToken: SOL,
        tokens: [SOL],
        featuredTokens: [SOL],
        jupiterTokens: [SOL],
        onGetAvailableTokens: vi
          .fn()
          .mockResolvedValue([
            { symbol: 'BTC', name: 'Bitcoin', network: null, chain: 'bitcoin', logo: 'btc.png' },
          ]),
      });

      const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
        initialProps: props,
        wrapper: makeWrapper(),
      });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.outputTokens.map((t) => t.symbol)).toContain('BTC');
    });

    it('keeps L2 tokens like USDC on Base when their parent chain is enabled', async () => {
      const networkModule = await import('../api/services/network');
      vi.mocked(networkModule.getEnabledNetworkIds).mockResolvedValueOnce([
        'solana-mainnet',
        'ethereum-mainnet',
      ]);

      const props = createProps({
        initialInToken: SOL,
        tokens: [SOL],
        featuredTokens: [SOL],
        jupiterTokens: [SOL],
        onGetAvailableTokens: vi
          .fn()
          .mockResolvedValue([
            {
              symbol: 'USDC',
              name: 'USD Coin (Base)',
              network: 'base',
              chain: 'ethereum',
              logo: 'usdc.png',
            },
          ]),
      });

      const { result } = renderHook((hookProps) => useSwapScreenLogic(hookProps), {
        initialProps: props,
        wrapper: makeWrapper(),
      });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      const usdc = result.current.outputTokens.find((t) => t.symbol === 'USDC');
      expect(usdc).toBeDefined();
      expect(usdc?.chain).toBe('ethereum');
      expect(usdc?.networkId).toBe('base');
    });
  });
});
