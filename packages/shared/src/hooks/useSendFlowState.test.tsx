/**
 * @vitest-environment jsdom
 *
 * The send flow's state is one hook for both platforms; what is pinned here
 * is the behaviour both used to carry separately: the chain's own asset is
 * the default token, the fee is estimated once per (token, recipient) pair
 * and never without an amount, submit hands the transfer's id to the
 * receipt, and reset drops everything including the transfer hook.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const estimateFee = vi.fn();
const sendTransaction = vi.fn();
const reset = vi.fn();

vi.mock('./useSendTransaction', () => ({
  useSendTransaction: () => ({ estimateFee, sendTransaction, reset, status: 'idle' }),
}));

import { SOL_CONSTANTS } from '../utils/balance';
import { useSendFlowState } from './useSendFlowState';
import type { SendToken } from '../types/ui/send-sheet';

const sol = { address: SOL_CONSTANTS.ADDRESS, symbol: 'SOL', uiAmount: '2.5' } as SendToken;
const usdc = { address: 'USDC', symbol: 'USDC', uiAmount: 10, decimals: 6 } as SendToken;

const params = { account: {} as never, blockchain: 'solana' as const, tokens: [usdc, sol] };

beforeEach(() => {
  vi.clearAllMocks();
  estimateFee.mockResolvedValue({ fee: '0.000005' });
  sendTransaction.mockResolvedValue({ txId: 'sig-1' });
});

describe('useSendFlowState', () => {
  it("opens on the chain's own asset and reads its balance from the live list", async () => {
    const { result } = renderHook(() => useSendFlowState(params));
    await waitFor(() => expect(result.current.token?.address).toBe(SOL_CONSTANTS.ADDRESS));
    expect(result.current.liveBalance).toBe(2.5);
    expect(result.current.nativeBalance).toBe(2.5);
  });

  it('estimates the fee once per (token, recipient) pair, and never without an amount', async () => {
    const { result } = renderHook(() => useSendFlowState(params));
    await waitFor(() => expect(result.current.token).not.toBeNull());

    act(() => result.current.setRecipient({ address: 'dest' }));
    act(() => result.current.estimateFee());
    expect(estimateFee).not.toHaveBeenCalled();

    act(() => result.current.setAmount('1'));
    act(() => result.current.estimateFee());
    act(() => result.current.estimateFee());
    await waitFor(() => expect(result.current.estimatedFee).toBe('0.000005'));
    expect(estimateFee).toHaveBeenCalledTimes(1);

    // A new token drops the estimate rather than showing the old pair's.
    act(() => result.current.setToken(usdc));
    expect(result.current.estimatedFee).toBeNull();
  });

  it('submit pays the resolved address and hands the id to the receipt; reset drops it all', async () => {
    const { result } = renderHook(() => useSendFlowState(params));
    await waitFor(() => expect(result.current.token).not.toBeNull());

    act(() => result.current.setRecipient({ address: 'alice.sol', resolvedAddress: 'dest' }));
    act(() => result.current.setAmount('0.5'));
    await act(() => result.current.submit());

    expect(sendTransaction).toHaveBeenCalledWith({
      token: { address: SOL_CONSTANTS.ADDRESS, decimals: 9, symbol: 'SOL' },
      recipientAddress: 'alice.sol',
      resolvedRecipientAddress: 'dest',
      amount: 0.5,
    });
    expect(result.current.txId).toBe('sig-1');

    act(() => result.current.reset());
    expect(result.current.txId).toBeNull();
    expect(result.current.recipient).toBeNull();
    expect(result.current.amount).toBe('');
    expect(reset).toHaveBeenCalled();
  });
});
