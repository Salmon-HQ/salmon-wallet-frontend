/**
 * @vitest-environment jsdom
 *
 * The three Send derivations both twins render but neither computes:
 * the commit state, the recipient groups, the fiat line.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { sendReceiptRows } from '../utils/sendReceiptRows';
import { useDeferredFeeEstimate } from './useDeferredFeeEstimate';
import { useFiatLine } from './useFiatLine';
import { useRecipientOptions } from './useRecipientOptions';
import { useSendCommitState } from './useSendCommitState';

vi.mock('../contexts/CurrencyContext', () => ({
  useCurrencyContext: () => [
    { currency: 'usd' },
    { formatPrecise: (value: number) => value.toFixed(2) },
  ],
}));

const t = (key: string) => key;
type Hook = Parameters<typeof useSendCommitState>[0];
const idle: Hook = { status: 'idle', settling: false, error: null, errorDetail: null };

describe('useSendCommitState', () => {
  it('is committed while sending and while settling, and holds the wave past both', () => {
    const { result, rerender } = renderHook((hook) => useSendCommitState(hook, t), {
      initialProps: idle,
    });
    expect(result.current.isCommitted).toBe(false);
    expect(result.current.isWaveHeld).toBe(false);

    rerender({ ...idle, status: 'sending' });
    expect(result.current.isSending).toBe(true);
    expect(result.current.isCommitted).toBe(true);
    expect(result.current.isWaveHeld).toBe(true);

    rerender({ ...idle, status: 'success', settling: true });
    expect(result.current.isSending).toBe(false);
    expect(result.current.isCommitted).toBe(true);

    rerender({ ...idle, status: 'success' });
    expect(result.current.isCommitted).toBe(false);
    expect(result.current.isWaveHeld).toBe(true);
    act(() => result.current.onWaveGone());
    expect(result.current.isWaveHeld).toBe(false);
  });

  it('reports a failure in the chain’s own words', () => {
    const { result } = renderHook(() =>
      useSendCommitState(
        { ...idle, status: 'failed', error: 'transaction.errors.generic', errorDetail: 'boom' },
        t
      )
    );
    expect(result.current.sendFailed).toBe(true);
    expect(result.current.failure).toMatchObject({
      title: 'transaction.sendFailed',
      message: 'transaction.errors.generic',
      detail: 'boom',
    });
  });
});

describe('useRecipientOptions', () => {
  it('groups recents, contacts and own wallets, and names the typed address from the book', () => {
    const { result } = renderHook(() =>
      useRecipientOptions({
        transactions: [{ type: 'send', outputs: [{ destination: 'Bob1' }] }] as never,
        senderAddress: 'Me',
        contacts: [{ name: 'Bob', address: 'Bob1' }],
        ownWallets: [{ address: 'Mine2', accountName: 'Savings' }] as never,
      })
    );
    expect(result.current.recents.map((r) => r.name)).toEqual(['Bob']);
    expect(result.current.contactRows.map((r) => r.address)).toEqual(['Bob1']);
    expect(result.current.walletRows.map((r) => r.name)).toEqual(['Savings']);
    expect(result.current.contactsByAddress).toEqual({ Bob1: 'Bob' });
    expect(result.current.recipientFor(' Bob1 ', '')).toEqual({
      address: 'Bob1',
      resolvedAddress: undefined,
      name: 'Bob',
    });
  });
});

describe('useFiatLine', () => {
  it('converts at the token price in the display currency, and reads zero without one', () => {
    expect(renderHook(() => useFiatLine('2.5', 5)).result.current).toBe('≈ 12.50 USD');
    expect(renderHook(() => useFiatLine('2.5', undefined)).result.current).toBe('≈ 0.00 USD');
    expect(renderHook(() => useFiatLine('', 5)).result.current).toBe('≈ 0.00 USD');
  });
});

describe('useDeferredFeeEstimate', () => {
  it('asks for the fee once the amount is positive, after the debounce, and never for an empty amount', () => {
    vi.useFakeTimers();
    const estimateFee = vi.fn();
    const { rerender } = renderHook(({ amount }) => useDeferredFeeEstimate(estimateFee, amount), {
      initialProps: { amount: '' },
    });
    vi.runAllTimers();
    expect(estimateFee).not.toHaveBeenCalled();
    rerender({ amount: '1' });
    vi.runAllTimers();
    expect(estimateFee).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('sendReceiptRows', () => {
  it('names the amount, the recipient and the confirmed status', () => {
    expect(sendReceiptRows(t, '1 SOL', 'Bob').map((row) => [row.label, row.value])).toEqual([
      ['token.send.amountLabel', '1 SOL'],
      ['transactions.to', 'Bob'],
      ['send.screens.status', 'transactions.detail.confirmed'],
    ]);
  });
});
