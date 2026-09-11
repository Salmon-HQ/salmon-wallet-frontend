/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useTransactionItemDerived } from './useTransactionItemDerived';
import type { Transaction } from '../types/transaction';

const typeConfigTable = {
  send: { label: 'Sent' },
  swap: { label: 'Swapped' },
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
        typeConfigTable,
        2
      )
    );

    expect(result.current.config).toBe(typeConfigTable.unknown);
  });

  it('is complex only for a swap past the visible-amount ceiling', () => {
    const swapTx = tx({
      type: 'swap',
      inputs: [amount('A')],
      outputs: [amount('B'), amount('C')],
    });

    const { result: over } = renderHook(() =>
      useTransactionItemDerived(swapTx, undefined, t, typeConfigTable, 2)
    );
    expect(over.current.isComplex).toBe(true);
    expect(over.current.totalAmounts).toBe(3);

    const { result: notSwap } = renderHook(() =>
      useTransactionItemDerived(tx({ type: 'send' }), undefined, t, typeConfigTable, 0)
    );
    expect(notSwap.current.isComplex).toBe(false);
  });

  it('translates the type label with the config label as the default', () => {
    const { result } = renderHook(() =>
      useTransactionItemDerived(tx({ type: 'send' }), undefined, t, typeConfigTable, 2)
    );

    expect(result.current.typeLabel).toBe('Sent');
  });
});
