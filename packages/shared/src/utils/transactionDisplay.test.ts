import { describe, expect, it } from 'vitest';
import { createSemantic } from '../theme/semantic';
import { chainMarks } from '../theme/brand';
import type { Transaction } from '../types/transaction';
import {
  CONFIRMATION_CONFIG,
  TYPE_LABEL_KEYS,
  conversionRateFor,
  describeTransactionRow,
  transactionCounterparty,
  transactionStatusDisplayFor,
  transactionTypeDisplayFor,
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
      expect(display.swap.color).toBe(chainMarks.purple);
      expect(transactionStatusDisplayFor(t).failed.color).toBe(t.status.danger);
    }
    expect(CONFIRMATION_CONFIG.finalized.tone).toBe('success');
  });

  it('rates a swap from the route, else from a one-in/one-out pair, else not at all', () => {
    expect(conversionRateFor(null)).toBeNull();
    expect(
      conversionRateFor(
        tx({
          swapRoute: { conversionRate: { fromSymbol: 'A', toSymbol: 'B', rate: '2' } },
        } as never)
      )
    ).toEqual({ fromSymbol: 'A', toSymbol: 'B', rate: '2' });
    expect(
      conversionRateFor(
        tx({ outputs: [amount('SOL', '1000000000', 9)], inputs: [amount('USDC', '150000000', 6)] })
      )
    ).toEqual({ fromSymbol: 'SOL', toSymbol: 'USDC', rate: '150.000000' });
    expect(
      conversionRateFor(tx({ outputs: [amount('SOL', '0', 9)], inputs: [amount('USDC', '1', 6)] }))
    ).toBeNull();
    expect(
      conversionRateFor(
        tx({ outputs: [amount('A', '1', 0), amount('B', '1', 0)], inputs: [amount('C', '1', 0)] })
      )
    ).toBeNull();
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
    expect(transactionCounterparty(tx({ type: 'swap' }))).toBeUndefined();
  });

  it('says "To <name>" from the address book, the short address without it, and defers otherwise', () => {
    const sent = tx({ type: 'send', outputs: [amount('SOL', '1', 9, { destination: ALICE })] });
    expect(describeTransactionRow(sent, { [ALICE]: 'Alice' })).toEqual({
      key: 'transactions.description.sendTo',
      values: { address: 'Alice' },
    });
    const short = describeTransactionRow(sent).values?.address as string;
    expect(short.length).toBeLessThan(ALICE.length);
    expect(describeTransactionRow(tx({ type: 'swap' })).key).not.toContain('sendTo');
  });
});
