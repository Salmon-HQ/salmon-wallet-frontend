import { describe, expect, it } from 'vitest';
import type { Address } from '@solana/kit';
import { dappTransactionDisplay, dappTransactionGate } from './dapp-transaction-display';

// Echoes the key and its values, so assertions read the copy that was chosen.
const t = (key: string, values?: Record<string, unknown>) =>
  values ? `${key} ${JSON.stringify(values)}` : key;

const ACCOUNT = 'Acc1111111111111111111111111111111111111111' as Address;
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address;
const base = {
  origin: 'https://jup.ag',
  effects: null,
  effectsLoading: false,
  feeSol: '0.000005',
  transactionCount: 1,
  parsingError: null,
};

describe('dappTransactionDisplay', () => {
  it('names the site, each balance that moves, and the fee', () => {
    const display = dappTransactionDisplay(
      {
        ...base,
        effects: {
          kind: 'effects',
          account: ACCOUNT,
          sol: { lamports: -1_500_000_000n, feeLamports: 5000n },
          tokens: [
            { tokenAccount: ACCOUNT, mint: MINT, amount: 25_000_000n, decimals: 6, symbol: 'USDC' },
          ],
          approvals: [],
        },
      },
      t
    );

    expect(display.title).toBe('dapp.transaction_title');
    expect(display.rows).toEqual([
      { label: 'dapp.requesting_site', value: 'https://jup.ag' },
      { label: 'dapp.effects_out', value: '−1.5 SOL' },
      { label: 'dapp.effects_in', value: '+25 USDC' },
      { label: 'dapp.transaction_fee', value: '0.000005 SOL' },
    ]);
    expect(display.warning).toBeUndefined();
  });

  it('shows a token without a known ticker by its mint, never hides it', () => {
    const display = dappTransactionDisplay(
      {
        ...base,
        effects: {
          kind: 'effects',
          account: ACCOUNT,
          sol: { lamports: 0n, feeLamports: null },
          tokens: [{ tokenAccount: ACCOUNT, mint: MINT, amount: -1n, decimals: 0, symbol: null }],
          approvals: [],
        },
      },
      t
    );

    expect(display.rows).toContainEqual({ label: 'dapp.effects_out', value: `−1 ${MINT}` });
  });

  it('warns about a spending permission the transaction grants', () => {
    const display = dappTransactionDisplay(
      {
        ...base,
        effects: {
          kind: 'effects',
          account: ACCOUNT,
          sol: { lamports: 0n, feeLamports: null },
          tokens: [],
          approvals: [
            {
              tokenAccount: ACCOUNT,
              mint: MINT,
              spender: 'Spender1111111111111111111111111111111111111' as Address,
              amount: 2n ** 64n - 1n,
              decimals: 6,
              symbol: 'USDC',
              scope: 'unlimited',
            },
          ],
        },
      },
      t
    );

    expect(display.warning?.title).toBe('dapp.effects_approval_title');
    expect(display.warning?.body).toContain('dapp.effects_approval_unlimited');
  });

  it.each([
    [
      'would fail',
      { kind: 'transaction-would-fail', account: ACCOUNT, error: 'x', logs: [] },
      'dapp.effects_would_fail_title',
    ],
    [
      'undetermined',
      { kind: 'undetermined', account: ACCOUNT, reason: 'unavailable', detail: '' },
      'dapp.effects_undetermined_title',
    ],
    ['no change', { kind: 'no-effect', account: ACCOUNT }, 'dapp.effects_none_title'],
  ])('explains a simulation that %s', (_name, effects, title) => {
    const display = dappTransactionDisplay({ ...base, effects: effects as never }, t);
    expect(display.warning?.title).toBe(title);
  });

  it('marks the balance rows pending while the simulation runs', () => {
    const display = dappTransactionDisplay({ ...base, effectsLoading: true }, t);
    expect(display.rows).toContainEqual({
      label: 'dapp.effects_title',
      value: 'dapp.effects_loading',
      pending: true,
    });
  });

  it('refuses to look harmless when the transaction cannot be read', () => {
    const display = dappTransactionDisplay({ ...base, parsingError: 'bad bytes' }, t);
    expect(display.warning).toEqual({ title: 'dapp.transaction_unavailable', body: 'dapp.decode_error' });
  });

  it('says how many transactions a batch signs', () => {
    const display = dappTransactionDisplay({ ...base, transactionCount: 3 }, t);
    expect(display.advancedRows).toContainEqual({ label: 'dapp.batch_size', value: '3' });
  });
});

describe('every spending permission is shown', () => {
  it('lists each approval, not only the first', () => {
    const grant = (spender: string, scope: 'bounded' | 'unlimited') => ({
      tokenAccount: ACCOUNT,
      mint: MINT,
      spender: spender as Address,
      amount: 1n,
      decimals: 0,
      symbol: 'USDC',
      scope,
    });
    const display = dappTransactionDisplay(
      {
        ...base,
        effects: {
          kind: 'effects',
          account: ACCOUNT,
          sol: { lamports: 0n, feeLamports: null },
          tokens: [],
          approvals: [
            grant('Small11111111111111111111111111111111111111', 'bounded'),
            grant('Drain11111111111111111111111111111111111111', 'unlimited'),
          ],
        },
      },
      t
    );
    expect(display.warning?.body).toContain('Smal');
    expect(display.warning?.body).toContain('Drai');
    expect(display.warning?.body).toContain('dapp.effects_approval_unlimited');
  });
});

describe("dappTransactionGate (the extension's approval rules)", () => {
  const effects = (kind: string, extra: Record<string, unknown> = {}) =>
    ({ kind, account: ACCOUNT, ...extra }) as never;

  it('lets a plain, understood transaction through on a tap', () => {
    expect(
      dappTransactionGate({
        effects: effects('effects', { approvals: [] }),
        effectsLoading: false,
        parsingError: null,
      })
    ).toEqual({ canApprove: true, requiresHold: false });
  });

  it('refuses approval while the preview has not answered, or could not read the transaction', () => {
    expect(dappTransactionGate({ effects: null, effectsLoading: true, parsingError: null }).canApprove).toBe(false);
    expect(dappTransactionGate({ effects: null, effectsLoading: false, parsingError: 'x' }).canApprove).toBe(false);
  });

  it.each([
    ['a spending permission', effects('effects', { approvals: [{}] })],
    ['an undetermined preview', effects('undetermined')],
    ['a transaction that would fail', effects('transaction-would-fail')],
  ])('asks for a hold on %s', (_name, value) => {
    expect(dappTransactionGate({ effects: value, effectsLoading: false, parsingError: null })).toEqual({
      canApprove: true,
      requiresHold: true,
    });
  });
});
