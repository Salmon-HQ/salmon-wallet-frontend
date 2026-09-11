/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useTransactionDetailDerived } from './useTransactionDetailDerived';
import type { Transaction } from '../types/transaction';

const typeConfigTable = {
  send: { icon: 'send-icon' },
  unknown: { icon: 'unknown-icon' },
};

const statusConfigTable = {
  completed: { icon: 'completed-icon' },
  failed: { icon: 'failed-icon' },
};

const tx = (overrides: Partial<Transaction> = {}) =>
  ({
    id: 'tx-1',
    type: 'send',
    status: 'failed',
    inputs: [],
    outputs: [],
    ...overrides,
  }) as unknown as Transaction;

describe('useTransactionDetailDerived', () => {
  it('falls back to unknown/completed for no transaction', () => {
    const { result } = renderHook(() =>
      useTransactionDetailDerived(null, typeConfigTable, statusConfigTable)
    );

    expect(result.current.typeConfig).toBe(typeConfigTable.unknown);
    expect(result.current.statusConfig).toBe(statusConfigTable.completed);
    expect(result.current.conversionRate).toBeNull();
  });

  it('picks the config matching the transaction type and status', () => {
    const { result } = renderHook(() =>
      useTransactionDetailDerived(tx(), typeConfigTable, statusConfigTable)
    );

    expect(result.current.typeConfig).toBe(typeConfigTable.send);
    expect(result.current.statusConfig).toBe(statusConfigTable.failed);
  });

  it('falls back to unknown/completed for a type/status the table has no entry for', () => {
    const { result } = renderHook(() =>
      useTransactionDetailDerived(
        tx({ type: 'stake', status: 'pending' } as Partial<Transaction>),
        typeConfigTable,
        statusConfigTable
      )
    );

    expect(result.current.typeConfig).toBe(typeConfigTable.unknown);
    expect(result.current.statusConfig).toBe(statusConfigTable.completed);
  });
});
