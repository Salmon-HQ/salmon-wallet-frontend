import { describe, expect, it } from 'vitest';
import { createSemantic } from '../theme/semantic';
import type { Transaction } from '../types/transaction';
import {
  CONFIRMATION_CONFIG,
  TYPE_LABEL_KEYS,
  describeTransactionRow,
  transactionCounterparty,
  transactionStatusDisplayFor,
  transactionTypeDisplayFor,
  withPlatformGlyphs,
  transactionVerbKey,
} from './transactionDisplay';

const amount = (
  symbol: string,
  amt: string,
  decimals: number,
  extra: Record<string, unknown> = {}
) => ({ symbol, amount: amt, decimals, ...extra }) as unknown as Transaction['inputs'][number];

const tx = (over: Partial<Transaction>): Transaction =>
  ({ type: 'unknown', inputs: [], outputs: [], ...over }) as unknown as Transaction;

const ALICE = 'A1iceA1iceA1iceA1iceA1iceA1iceA1iceA1ice1111';

describe('transactionDisplay', () => {
  it('names every type once, with a verb key and a glyph, in both modes', () => {
    for (const mode of ['dark', 'light'] as const) {
      const t = createSemantic(mode);
      const display = transactionTypeDisplayFor(t);
      for (const type of Object.keys(TYPE_LABEL_KEYS) as (keyof typeof TYPE_LABEL_KEYS)[]) {
        expect(display[type].glyph).toBeTruthy();
        expect(display[type].color).toBeTruthy();
      }
      expect(display.send.color).toBe(t.change.negative);
      expect(display.receive.color).toBe(t.change.positive);
      expect(transactionStatusDisplayFor(t).failed.color).toBe(t.status.danger);
    }
    expect(CONFIRMATION_CONFIG.finalized.tone).toBe('success');
  });

  it('finds the other side of a transfer, and nothing for anything else', () => {
    expect(
      transactionCounterparty(
        tx({ type: 'send', outputs: [amount('SOL', '1', 9, { destination: ALICE })] })
      )
    ).toBe(ALICE);
    expect(
      transactionCounterparty(
        tx({ type: 'receive', inputs: [amount('SOL', '1', 9, { source: ALICE })] })
      )
    ).toBe(ALICE);
    expect(transactionCounterparty(tx({ type: 'stake' }))).toBeUndefined();
  });

  it('says the note itself under a memo, and the generic sentence when the note is missing', () => {
    expect(describeTransactionRow(tx({ type: 'memo', memo: 'gm' }))).toEqual({
      key: 'transactions.description.memoNote',
      values: { note: 'gm' },
    });
    expect(describeTransactionRow(tx({ type: 'memo', memo: null }))).toEqual({
      key: 'transactions.description.memo',
      values: undefined,
    });
  });

  it('says "To <name>" from the address book, the short address without it, and defers otherwise', () => {
    const sent = tx({ type: 'send', outputs: [amount('SOL', '1', 9, { destination: ALICE })] });
    expect(describeTransactionRow(sent, { [ALICE]: 'Alice' })).toEqual({
      key: 'transactions.description.sendTo',
      values: { address: 'Alice' },
    });
    const short = describeTransactionRow(sent).values?.address as string;
    expect(short.length).toBeLessThan(ALICE.length);
    expect(describeTransactionRow(tx({ type: 'stake' })).key).not.toContain('sendTo');
  });
});

describe('withPlatformGlyphs', () => {
  it("resolves each entry's glyph name to the platform icon for that name", () => {
    const semantic = createSemantic('light');
    const glyphs = { checkCircle: 'CheckCircleIcon', xCircle: 'XCircleIcon', clock: 'ClockIcon' };

    const resolved = withPlatformGlyphs(transactionStatusDisplayFor(semantic), glyphs);

    expect(resolved.completed).toEqual({
      label: 'Completed',
      color: semantic.status.success,
      icon: 'CheckCircleIcon',
    });
    expect(resolved.failed.icon).toBe('XCircleIcon');
    expect(resolved.pending.icon).toBe('ClockIcon');
  });

  describe('the verb inside an interaction (backend 017)', () => {
    const base = { type: 'interaction' as const, inputs: [], outputs: [], source: 'AGGREGATOR' };
    it('reads the action as the verb, and the type when the action has no verb of its own', () => {
      expect(transactionVerbKey({ ...base, action: 'swap' })).toBe('transactions.action.swap');
      expect(transactionVerbKey({ ...base, action: 'program_call' })).toBe(
        'transactions.detail.interaction'
      );
      expect(transactionVerbKey({ type: 'send' })).toBe('transactions.detail.sent');
    });
    it('a swap says what went for what', () => {
      const said = describeTransactionRow({
        ...base,
        action: 'swap',
        outputs: [{ amount: '1', decimals: 6, symbol: 'USDC', contract: 'a' }],
        inputs: [{ amount: '1', decimals: 9, symbol: 'SOL', contract: 'b' }],
      });
      expect(said).toEqual({
        key: 'transactions.description.swap',
        values: { from: 'USDC', to: 'SOL' },
      });
    });
  });
});
