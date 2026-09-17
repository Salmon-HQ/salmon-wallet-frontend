/**
 * @vitest-environment jsdom
 *
 * What matters: a created request opens as a readable transfer request, the
 * open pending request polls and flips to paid on a settlement, expiry is
 * judged on read, and removing drops it from the device's list.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCallback, useState } from 'react';

const accounts = vi.hoisted(() => ({ activeBlockchainAccount: null as unknown }));
vi.mock('../../contexts/AccountsContext', () => ({
  useAccountsContext: () => [
    {
      accountId: 'acc-1',
      activeAccount: { name: 'Main' },
      activeBlockchainAccount: accounts.activeBlockchainAccount,
    },
    {},
  ],
}));
vi.mock('../../contexts/CurrencyContext', () => ({
  useCurrencyContext: () => [
    { currency: 'usd' },
    { formatPrecise: (value: number | null | undefined) => (value ?? 0).toFixed(2) },
  ],
}));
vi.mock('../../hooks/useBalance', () => ({
  useBalance: () => ({ tokens: [] }),
}));
vi.mock('../../hooks/usePowerupState', () => ({
  usePowerupState: <T>(_id: string, initial: T) => {
    const [state, setState] = useState<T>(initial);
    // Stable like the real seam's setter; a fresh function per render would
    // be a different hook than the one shipped.
    const set = useCallback(
      (update: T | ((previous: T) => T)) =>
        setState((previous) =>
          typeof update === 'function' ? (update as (p: T) => T)(previous) : update
        ),
      []
    );
    return [state, set];
  },
}));
vi.mock('../../blockchain/solana/networks', () => ({ solanaRpcFor: () => ({}) }));

import { parseTransferRequest } from '../../blockchain/solana/transfer-request';
import { PAYMENTS_STATUS_POLL_MS } from './constants';
import { usePaymentsScreenLogic } from './usePaymentsScreenLogic';

const REFERENCE = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const RECIPIENT = 'mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN';

function setup(
  findSettlement = vi.fn().mockResolvedValue(null),
  start = 1_000_000,
  onPay?: () => void
) {
  let now = start;
  const hook = renderHook(() =>
    usePaymentsScreenLogic({
      publicKey: RECIPIENT,
      networkId: 'solana-devnet',
      onPay,
      findSettlement,
      newReference: async () => REFERENCE,
      now: () => now,
    })
  );
  return { hook, findSettlement, advance: (ms: number) => (now += ms) };
}

// Only the intervals are faked: `act` flushes through real microtasks.
beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
afterEach(() => {
  vi.useRealTimers();
  accounts.activeBlockchainAccount = null;
});

describe('usePaymentsScreenLogic', () => {
  it('opens the ask sheet from its action, and a dismiss cancels what was typed', () => {
    const { hook } = setup();
    expect(hook.result.current.ask.visible).toBe(false);
    act(() => hook.result.current.actions.ask.onPress());
    expect(hook.result.current.ask.visible).toBe(true);
    act(() => {
      hook.result.current.ask.form.amountCard.onChangeValue('3');
      hook.result.current.ask.form.noteField.onChangeText('Coffee');
      hook.result.current.ask.form.expiryChips.onChange('h1');
    });
    act(() => hook.result.current.ask.onClose());
    expect(hook.result.current.ask.visible).toBe(false);
    expect(hook.result.current.ask.form.amountCard.value).toBe('');
    expect(hook.result.current.ask.form.noteField.value).toBe('');
    expect(hook.result.current.ask.form.expiryChips.value).toBe('h24');
    expect(hook.result.current.requests).toHaveLength(0);
  });

  it('a create closes the ask sheet and opens the request sheet, never both', async () => {
    const { hook } = setup();
    act(() => hook.result.current.actions.ask.onPress());
    act(() => hook.result.current.ask.form.amountCard.onChangeValue('5'));
    await act(() => hook.result.current.create());
    expect(hook.result.current.ask.visible).toBe(false);
    expect(hook.result.current.sheet.visible).toBe(true);
    expect(hook.result.current.sheet.nested).toBe(true);
    expect(hook.result.current.ask.form.amountCard.value).toBe('');
  });

  it('offers Pay only to an account that can sign, and only when the platform wired it', () => {
    expect(setup().hook.result.current.actions.pay).toBeNull();
    const onPay = vi.fn();
    accounts.activeBlockchainAccount = { getRpc: () => ({}) };
    expect(setup(undefined, undefined, onPay).hook.result.current.actions.pay).toBeNull();
    accounts.activeBlockchainAccount = { getRpc: () => ({}), canSign: true };
    const { hook } = setup(undefined, undefined, onPay);
    act(() => hook.result.current.actions.pay?.onPress());
    expect(onPay).toHaveBeenCalled();
  });

  it('creates a request the standard reads back, and opens it', async () => {
    const { hook } = setup();
    act(() => {
      hook.result.current.ask.form.amountCard.onChangeValue('12,5');
      hook.result.current.ask.form.noteField.onChangeText('Table 4');
    });
    expect(hook.result.current.ask.form.createButton.disabled).toBe(false);
    expect(hook.result.current.ask.form.amountCard.subtext).toBe('≈ 12.50 USD');
    await act(() => hook.result.current.create());
    const { open, openUri, requests } = hook.result.current;
    const openAmountLabel = hook.result.current.sheet.amountLabel;
    expect(open?.id).toBe('pr_EPjFWdd5Aufq');
    expect(openAmountLabel).toBe('12.50 USDC');
    expect(requests.map((row) => [row.state, row.listRow.title, row.listRow.subtitle])).toEqual([
      ['pending', '12.50 USDC', 'Table 4'],
    ]);
    const parsed = parseTransferRequest(openUri);
    expect(parsed.ok && parsed.request).toMatchObject({
      recipient: RECIPIENT,
      amount: '12.50',
      splToken: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      references: [REFERENCE],
      label: 'Main',
      message: 'Table 4',
      memo: 'pr_EPjFWdd5Aufq',
    });
  });

  it('refuses a bad amount with the reason, and zero', () => {
    const { hook } = setup();
    act(() => hook.result.current.ask.form.amountCard.onChangeValue('0.0000001'));
    expect(hook.result.current.ask.form.noteField.error).toBe(
      'payments.errors.amountTooManyDecimals'
    );
    act(() => hook.result.current.ask.form.amountCard.onChangeValue('0'));
    expect(hook.result.current.ask.form.noteField.error).toBe('payments.errors.amountInvalid');
    expect(hook.result.current.ask.form.createButton.disabled).toBe(true);
  });

  it('polls the open pending request and flips it to paid on a settlement', async () => {
    const settlement = {
      signature: 'sig',
      payer: 'mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN',
      blockTime: 1_700_000_000,
    };
    const findSettlement = vi.fn().mockResolvedValueOnce(null).mockResolvedValue(settlement);
    const { hook } = setup(findSettlement);
    act(() => hook.result.current.ask.form.amountCard.onChangeValue('1'));
    await act(() => hook.result.current.create());
    // Mount check ran once for the new pending request; the poll ticks next.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PAYMENTS_STATUS_POLL_MS + 1);
    });
    expect(findSettlement).toHaveBeenCalled();
    expect(hook.result.current.open?.status).toBe('paid');
    expect(hook.result.current.openStatus?.state).toBe('paid');
    expect(hook.result.current.openStatus?.signature).toBe('sig');
    expect(hook.result.current.openStatus?.rows.map((row) => row.key)).toEqual([
      'status',
      'paidBy',
      'paidAt',
    ]);
  });

  it('keeps the last state when a check throws, and judges expiry on read', async () => {
    const findSettlement = vi.fn().mockRejectedValue(new Error('rpc down'));
    const { hook, advance } = setup(findSettlement);
    act(() => {
      hook.result.current.ask.form.amountCard.onChangeValue('1');
      hook.result.current.ask.form.expiryChips.onChange('h1');
    });
    await act(() => hook.result.current.create());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(hook.result.current.openStatus?.state).toBe('pending');
    expect(hook.result.current.openStatus?.checkFailed).toBe(true);
    advance(2 * 60 * 60 * 1000);
    act(() => hook.result.current.closeRequest());
    expect(hook.result.current.requests[0].state).toBe('expired');
  });

  it('removes a request from the list and closes it if open', async () => {
    const { hook } = setup();
    act(() => hook.result.current.ask.form.amountCard.onChangeValue('1'));
    await act(() => hook.result.current.create());
    const id = hook.result.current.open!.id;
    act(() => hook.result.current.remove(id));
    expect(hook.result.current.open).toBeNull();
    expect(hook.result.current.requests).toEqual([]);
  });
});
