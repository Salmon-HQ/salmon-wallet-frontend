/**
 * usePendingActivity — the one list the pending banner renders.
 *
 * `PendingTransactionsContext` keeps on-chain signatures alive in the
 * background after the user leaves the screen. This hook exists so every app
 * renders one component instead of composing that context three times.
 *
 * @module hooks/usePendingActivity
 */

import { useMemo } from 'react';
import {
  usePendingTransactionsOptional,
  type PendingTransactionStatus,
} from '../contexts/PendingTransactionsContext';

export type PendingActivityKind = 'send' | 'swap';

export interface PendingActivityItem {
  /** Stable identity: a signature. */
  id: string;
  kind: PendingActivityKind;
  status: PendingTransactionStatus;
  /**
   * Amounts, symbols or a reference id — never prose, so it can sit beside
   * translated copy without needing translation itself.
   */
  detail?: string;
  /** Whether the user may clear this row. */
  dismissible: boolean;
}

export interface UsePendingActivityResult {
  items: PendingActivityItem[];
  dismiss: (id: string) => void;
}

export function usePendingActivity(): UsePendingActivityResult {
  const pendingTx = usePendingTransactionsOptional();

  const transactions = pendingTx?.pendingTransactions;
  const dismissPendingTransaction = pendingTx?.dismissPendingTransaction;

  return useMemo(() => {
    const items: PendingActivityItem[] = (transactions ?? []).map((tx) => ({
      id: tx.signature,
      kind: tx.kind as PendingActivityKind,
      status: tx.status,
      detail: tx.summary,
      dismissible: true,
    }));

    return {
      items,
      dismiss: (id: string) => dismissPendingTransaction?.(id),
    };
  }, [transactions, dismissPendingTransaction]);
}
