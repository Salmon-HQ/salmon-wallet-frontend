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

  it('opens on the token the host named, when a token detail sent the user here', async () => {
    const { result } = renderHook(() =>
      useSendFlowState({ ...params, initialTokenAddress: 'USDC' })
    );
    await waitFor(() => expect(result.current.token?.address).toBe('USDC'));
    expect(result.current.liveBalance).toBe(10);
  });

  it("falls back to the chain's own asset when the named token is not held", async () => {
    const { result } = renderHook(() =>
      useSendFlowState({ ...params, initialTokenAddress: 'NotHeld' })
    );
    await waitFor(() => expect(result.current.token?.address).toBe(SOL_CONSTANTS.ADDRESS));
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
      // The text as typed rides along: a mint with a display multiplier is
      // converted from it, not from its floating-point reading.
      amountText: '0.5',
    });
    expect(result.current.txId).toBe('sig-1');

    act(() => result.current.reset());
    expect(result.current.txId).toBeNull();
    expect(result.current.recipient).toBeNull();
    expect(result.current.amount).toBe('');
    expect(reset).toHaveBeenCalled();
  });

  describe('Max', () => {
    const ready = async () => {
      const hook = renderHook(() => useSendFlowState({ ...params, initialTokenAddress: 'USDC' }));
      await waitFor(() => expect(hook.result.current.token?.address).toBe('USDC'));
      act(() => hook.result.current.setRecipient({ address: 'dest' }));
      return hook.result;
    };

    it('tells the transfer the user asked for the whole balance', async () => {
      const result = await ready();
      act(() => result.current.setAmount('10', 'max'));
      await act(() => result.current.submit());
      expect(sendTransaction).toHaveBeenCalledWith(expect.objectContaining({ max: true }));
    });

    it('drops it once the user types over the fill', async () => {
      const result = await ready();
      act(() => result.current.setAmount('10', 'max'));
      act(() => result.current.setAmount('9'));
      await act(() => result.current.submit());
      expect(sendTransaction.mock.calls[0][0]).not.toHaveProperty('max');
    });

    it('does not carry over to another token', async () => {
      const result = await ready();
      act(() => result.current.setAmount('10', 'max'));
      act(() => result.current.setToken(sol));
      await act(() => result.current.submit());
      expect(sendTransaction.mock.calls[0][0]).not.toHaveProperty('max');
    });

    it('never applies to the amount a payment request fixed', async () => {
      const result = await ready();
      act(() => result.current.setAmount('10', 'max'));
      act(() => {
        result.current.startFromRequest(
          { recipient: 'dest', amount: '10', splToken: 'USDC', references: [] },
          params.tokens
        );
      });
      await act(() => result.current.submit());
      expect(sendTransaction.mock.calls[0][0]).not.toHaveProperty('max');
    });
  });

  describe('a Send started from a transfer request', () => {
    const request = {
      recipient: 'dest',
      amount: '2.5',
      splToken: 'USDC',
      references: ['ref-1', 'ref-2'],
      label: 'Cafe',
      message: 'Table 4',
      memo: 'pr_1',
    };

    it('locks recipient, token and amount, lands on the review, and the transfer carries the keys', async () => {
      const { result } = renderHook(() => useSendFlowState(params));
      await waitFor(() => expect(result.current.token).not.toBeNull());

      let started;
      act(() => {
        started = result.current.startFromRequest(request, params.tokens);
      });
      expect(started).toEqual({ ok: true, next: 'review' });
      // The label is not a name: it comes from the QR, and the "To" row holds
      // an address-book name everywhere else. It is shown as "Requested by".
      expect(result.current.recipient).toEqual({ address: 'dest' });
      expect(result.current.token).toBe(usdc);
      expect(result.current.amount).toBe('2.5');
      expect(result.current.request?.locked).toEqual({
        recipient: true,
        token: true,
        amount: true,
      });

      await act(() => result.current.submit());
      expect(sendTransaction).toHaveBeenCalledWith({
        token: { address: 'USDC', decimals: 6, symbol: 'USDC' },
        recipientAddress: 'dest',
        resolvedRecipientAddress: undefined,
        amount: 2.5,
        amountText: '2.5',
        memo: 'pr_1',
        references: ['ref-1', 'ref-2'],
      });
    });

    it('asks for the amount when the request names none, and pays SOL when it names no token', async () => {
      const { result } = renderHook(() => useSendFlowState(params));
      await waitFor(() => expect(result.current.token).not.toBeNull());

      let started;
      act(() => {
        started = result.current.startFromRequest(
          { recipient: 'dest', references: [] },
          params.tokens
        );
      });
      expect(started).toEqual({ ok: true, next: 'amount' });
      expect(result.current.token).toBe(sol);
      expect(result.current.request?.locked.amount).toBe(false);
    });

    it('refuses a token the account does not hold, and never substitutes another', async () => {
      const { result } = renderHook(() => useSendFlowState(params));
      await waitFor(() => expect(result.current.token).not.toBeNull());

      let started;
      act(() => {
        started = result.current.startFromRequest({ ...request, splToken: 'BONK' }, params.tokens);
      });
      expect(started).toEqual({ ok: false, reason: 'tokenNotHeld' });
      expect(result.current.request).toBeNull();
      expect(result.current.recipient).toBeNull();
    });

    it('reset and clearRequest both drop the request', async () => {
      const { result } = renderHook(() => useSendFlowState(params));
      await waitFor(() => expect(result.current.token).not.toBeNull());

      act(() => {
        result.current.startFromRequest(request, params.tokens);
      });
      act(() => result.current.clearRequest());
      expect(result.current.request).toBeNull();

      act(() => {
        result.current.startFromRequest(request, params.tokens);
      });
      act(() => result.current.reset());
      expect(result.current.request).toBeNull();
    });
  });
});

describe('a request whose amount the token cannot hold', () => {
  it('refuses more decimals than the token has, rather than rounding at pay time', async () => {
    const { result } = renderHook(() => useSendFlowState(params));
    await waitFor(() => expect(result.current.token).not.toBeNull());

    let started;
    act(() => {
      started = result.current.startFromRequest(
        { recipient: 'dest', amount: '1.2345678', splToken: 'USDC', references: [] },
        params.tokens
      );
    });
    expect(started).toEqual({ ok: false, reason: 'amountDecimals' });
    expect(result.current.request).toBeNull();
    expect(result.current.recipient).toBeNull();
  });

  it('accepts exactly as many decimals as the token has', async () => {
    const { result } = renderHook(() => useSendFlowState(params));
    await waitFor(() => expect(result.current.token).not.toBeNull());

    let started;
    act(() => {
      started = result.current.startFromRequest(
        { recipient: 'dest', amount: '1.234567', splToken: 'USDC', references: [] },
        params.tokens
      );
    });
    expect(started).toEqual({ ok: true, next: 'review' });
  });
});

/**
 * An off-curve address has no private key behind it. Typed, picked, scanned or
 * pasted as a payment request, the recipient reaches the review through this
 * state, so the review's warning is judged here once for every way in.
 */
describe('the warning about a recipient no key controls', () => {
  // An associated token account: derived from a program, so off the curve.
  const OFF_CURVE = 'HXkHFMCRQP6pw66QEGBqVsduqUQdSyrrrq82S7Rffsms';
  const WALLET = '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY';
  const validateDestinationAccount = vi.fn(async (address: string) =>
    address === OFF_CURVE
      ? { type: 'SUCCESS', code: 'off_curve_no_funds', addressType: 'PUBLIC_KEY' }
      : { type: 'SUCCESS', code: 'valid', addressType: 'PUBLIC_KEY' }
  );
  const withValidation = { ...params, account: { validateDestinationAccount } as never };

  it('warns about an off-curve recipient that arrived in a payment request', async () => {
    const { result } = renderHook(() => useSendFlowState(withValidation));
    await waitFor(() => expect(result.current.token).not.toBeNull());

    act(() => {
      result.current.startFromRequest(
        { recipient: OFF_CURVE, amount: '1', references: [] },
        params.tokens
      );
    });

    await waitFor(() =>
      expect(result.current.recipientWarning).toBe('send.validation.off_curve_no_funds')
    );
    expect(validateDestinationAccount).toHaveBeenCalledWith(OFF_CURVE);
  });

  it('judges the resolved address of a typed name, and says nothing for an ordinary one', async () => {
    const { result } = renderHook(() => useSendFlowState(withValidation));
    await waitFor(() => expect(result.current.token).not.toBeNull());

    act(() => result.current.setRecipient({ address: 'alice.sol', resolvedAddress: OFF_CURVE }));
    await waitFor(() =>
      expect(result.current.recipientWarning).toBe('send.validation.off_curve_no_funds')
    );

    act(() => result.current.setRecipient({ address: WALLET }));
    expect(result.current.recipientWarning).toBeNull();
  });

  // Off the curve is a property of the address itself: a failed lookup only
  // loses whether the account holds funds, never the warning.
  it('still warns when the network check fails', async () => {
    const failing = {
      ...params,
      account: { validateDestinationAccount: vi.fn().mockRejectedValue(new Error('fetch failed')) },
    } as never;
    const offline = {
      ...params,
      account: {
        validateDestinationAccount: vi.fn(async () => ({ type: 'ERROR', code: 'network_error' })),
      },
    } as never;

    for (const flowParams of [failing, offline]) {
      const { result } = renderHook(() => useSendFlowState(flowParams));
      await waitFor(() => expect(result.current.token).not.toBeNull());
      act(() => result.current.setRecipient({ address: OFF_CURVE }));
      await act(async () => {});
      expect(result.current.recipientWarning).toBe('send.validation.off_curve_has_funds');
    }
  });

  // The transfer pays `resolvedAddress ?? address`; the warning judges the same.
  it('judges exactly the address the transfer pays', async () => {
    const { result } = renderHook(() => useSendFlowState(withValidation));
    await waitFor(() => expect(result.current.token).not.toBeNull());

    act(() => result.current.setRecipient({ address: OFF_CURVE, resolvedAddress: '' }));
    await act(async () => {});

    expect(validateDestinationAccount).not.toHaveBeenCalledWith(OFF_CURVE);
    expect(result.current.recipientWarning).toBeNull();
  });
});
