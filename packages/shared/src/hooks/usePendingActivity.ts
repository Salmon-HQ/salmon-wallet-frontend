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
  const foregroundReported = pendingTx?.foregroundReported;
  const dismissPendingTransaction = pendingTx?.dismissPendingTransaction;

  return useMemo(() => {
    const items: PendingActivityItem[] = [
      // The coherence guard, and the only place it exists. A signature a
      // foreground screen is currently reporting is withheld here, so the app
      // can never say "processing" on the screen and "confirmed" in the banner
      // about the same transaction. See PendingTransactionsContext's module doc
      // for which of the two signals is the verdict and which is a stage. This
      // guard sits in the merge rather than in any screen's hook because the
      // same split produced the same bug on swap, send and NFT send.
      ...(transactions ?? [])
        .filter((tx) => !(foregroundReported ?? []).includes(tx.signature))
        .map((tx) => ({
          id: tx.signature,
          kind: tx.kind as PendingActivityKind,
          status: tx.status,
          detail: tx.summary,
          dismissible: true,
        })),
    ];

    return {
      items,
      dismiss: (id: string) => dismissPendingTransaction?.(id),
    };
  }, [transactions, foregroundReported, dismissPendingTransaction]);
}
