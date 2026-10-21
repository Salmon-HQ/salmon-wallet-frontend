import { describe, expect, it } from 'vitest';
import type { Address } from '@solana/kit';
import {
  dappTransactionDisplay,
  dappTransactionGate,
  simulatedMovementLine,
} from './dapp-transaction-display';

// Echoes the key and its values, so assertions read the copy that was chosen.
const t = (key: string, values?: Record<string, unknown>) =>
  values ? `${key} ${JSON.stringify(values)}` : key;

const ACCOUNT = 'Acc1111111111111111111111111111111111111111' as Address;
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address;
const base = {
  origin: 'https://jup.ag',
  signingAccount: { name: 'Savings', address: 'Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf' },
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
      { label: 'dapp.wallet_address', value: 'Savings · Fg6P...KzXf' },
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

  // The extension's card names the reason; mobile showed only the generic
  // line, so a transaction held for running programs Salmon cannot read
  // looked the same as a network hiccup.
  it('says why a preview is undetermined before the generic caution', () => {
    const display = dappTransactionDisplay(
      {
        ...base,
        effects: {
          kind: 'undetermined',
          account: ACCOUNT,
          reason: 'unanalysed-program',
          detail: '',
        },
      },
      t
    );
    expect(display.warning?.body).toBe(
      'dapp.effects_reason_unanalysed\n\ndapp.effects_undetermined_body'
    );
  });

  it('names the account that signs, after the site', () => {
    const display = dappTransactionDisplay(base, t);

    expect(display.rows.slice(0, 2)).toEqual([
      { label: 'dapp.requesting_site', value: 'https://jup.ag' },
      { label: 'dapp.wallet_address', value: 'Savings · Fg6P...KzXf' },
    ]);
  });

  // A swap through a router: what the wallet gives and gets, then the reason,
  // instead of a bare "could not determine".
  const held = (
    reason: 'unanalysed-program' | 'unanalysed-account',
    approvals: unknown[] = []
  ) => ({
    ...base,
    effects: {
      kind: 'undetermined' as const,
      account: ACCOUNT,
      reason,
      detail: '',
      known: {
        sol: { lamports: 50_000_000n, feeLamports: 5000n },
        tokens: [
          { tokenAccount: ACCOUNT, mint: MINT, amount: -10_000_000n, decimals: 6, symbol: 'USDC' },
        ],
        approvals: approvals as never[],
      },
    },
  });

  // A program Salmon cannot read can make its simulation show anything, so
  // the numbers are shown as a simulation, without in/out labels.
  it('shows what a program it cannot read simulated as a simulation, then the reason', () => {
    const display = dappTransactionDisplay(held('unanalysed-program'), t);

    expect(display.rows).toEqual([
      { label: 'dapp.requesting_site', value: 'https://jup.ag' },
      { label: 'dapp.wallet_address', value: 'Savings · Fg6P...KzXf' },
      { label: 'dapp.effects_simulated_label', value: '10 USDC → 0.05 SOL' },
      { label: 'dapp.transaction_fee', value: '0.000005 SOL' },
    ]);
    expect(display.warning).toEqual({ title: 'dapp.effects_reason_unanalysed' });
  });

  // Every program is readable here: the rows are what will move, short of the
  // account change the preview cannot show.
  it('lists the movements of a held account change as usual, with its own reason', () => {
    const display = dappTransactionDisplay(held('unanalysed-account'), t);

    expect(display.rows).toContainEqual({ label: 'dapp.effects_in', value: '+0.05 SOL' });
    expect(display.rows).toContainEqual({ label: 'dapp.effects_out', value: '−10 USDC' });
    expect(display.warning).toEqual({ title: 'dapp.effects_reason_unanalysed_account' });
  });

  it('keeps the spending permission title on a held preview that grants one', () => {
    const grant = {
      tokenAccount: ACCOUNT,
      mint: MINT,
      spender: ACCOUNT,
      amount: 1n,
      decimals: 6,
      symbol: 'USDC',
      scope: 'bounded',
    };
    const display = dappTransactionDisplay(held('unanalysed-program', [grant]), t);

    expect(display.warning?.title).toBe('dapp.effects_approval_title');
    expect(display.warning?.body).toMatch(
      /dapp\.effects_approval_body.*\n\ndapp\.effects_reason_unanalysed$/s
    );
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
    expect(display.warning).toEqual({
      title: 'dapp.transaction_unavailable',
      body: 'dapp.decode_error',
    });
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
    expect(
      dappTransactionGate({ effects: null, effectsLoading: true, parsingError: null }).canApprove
    ).toBe(false);
    expect(
      dappTransactionGate({ effects: null, effectsLoading: false, parsingError: 'x' }).canApprove
    ).toBe(false);
  });

  // A preview that settled without an answer is not an absence of warnings.
  it('asks for a hold when the preview settled with no answer', () => {
    expect(
      dappTransactionGate({ effects: null, effectsLoading: false, parsingError: null })
    ).toEqual({ canApprove: true, requiresHold: true });
  });

  it.each([
    ['a spending permission', effects('effects', { approvals: [{}] })],
    ['an undetermined preview', effects('undetermined')],
    ['a transaction that would fail', effects('transaction-would-fail')],
  ])('asks for a hold on %s', (_name, value) => {
    expect(
      dappTransactionGate({ effects: value, effectsLoading: false, parsingError: null })
    ).toEqual({
      canApprove: true,
      requiresHold: true,
    });
  });
});

describe('simulatedMovementLine', () => {
  const details = (sol: bigint, tokens: bigint[]) => ({
    sol: { lamports: sol, feeLamports: null },
    tokens: tokens.map((amount) => ({
      tokenAccount: ACCOUNT,
      mint: MINT,
      amount,
      decimals: 6,
      symbol: 'USDC',
    })),
    approvals: [],
  });

  it('puts what leaves before the arrow and what arrives after it', () => {
    expect(simulatedMovementLine(details(50_000_000n, [-10_000_000n]))).toBe('10 USDC → 0.05 SOL');
  });

  it('keeps the arrow when only one side moves', () => {
    expect(simulatedMovementLine(details(0n, [-10_000_000n]))).toBe('10 USDC →');
    expect(simulatedMovementLine(details(50_000_000n, []))).toBe('→ 0.05 SOL');
  });

  it('has nothing to say when nothing moves', () => {
    expect(simulatedMovementLine(details(0n, []))).toBeNull();
  });
});
