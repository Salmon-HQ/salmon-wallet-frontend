/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useTransactionItemDerived } from './useTransactionItemDerived';
import type { Transaction } from '../types/transaction';

const typeConfigTable = {
  send: { label: 'Sent' },
  mint: { label: 'Minted' },
  unknown: { label: 'Unknown' },
};

const t = vi.fn((key: string, optionsOrDefault?: unknown) => {
  if (typeof optionsOrDefault === 'string') return optionsOrDefault;
  return key;
});

const amount = (symbol: string) =>
  ({ symbol, amount: '1', decimals: 0 }) as unknown as Transaction['inputs'][number];

const tx = (overrides: Partial<Transaction> = {}) =>
  ({
    id: 'tx-1',
    type: 'send',
    status: 'completed',
    inputs: [],
    outputs: [],
    ...overrides,
  }) as unknown as Transaction;

describe('useTransactionItemDerived', () => {
  it('picks the config matching the type, falling back to unknown', () => {
    const { result } = renderHook(() =>
      useTransactionItemDerived(
        tx({ type: 'stake' } as Partial<Transaction>),
        undefined,
        t,
        typeConfigTable
      )
    );

    expect(result.current.config).toBe(typeConfigTable.unknown);
  });

  it('counts the amounts on both sides', () => {
    const multiLeg = tx({
      type: 'unknown',
      inputs: [amount('A')],
      outputs: [amount('B'), amount('C')],
    });

    const { result } = renderHook(() =>
      useTransactionItemDerived(multiLeg, undefined, t, typeConfigTable)
    );
    expect(result.current.totalAmounts).toBe(3);
  });

  it('translates the type label with the config label as the default', () => {
    const { result } = renderHook(() =>
      useTransactionItemDerived(tx({ type: 'send' }), undefined, t, typeConfigTable)
    );

    expect(result.current.typeLabel).toBe('Sent');
  });
});
