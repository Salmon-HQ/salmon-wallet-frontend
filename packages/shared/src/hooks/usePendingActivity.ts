/**
 * usePendingActivity — the one list the pending banner renders.
 *
 * Two background workers keep money-moving work alive after the user leaves the
 * screen: `PendingTransactionsContext` (on-chain signatures) and
 * `BridgeSettlementContext` (StealthEX orders). They stay separate because
 * their lifecycles are unrelated (see the module doc on either one), but the
 * user does not care which worker owns their transaction — they care that
 * something of theirs is in flight. Merging here means every app renders one
 * component instead of composing two hooks three times, and it is what finally
 * makes the bridge poller visible: it has survived navigation and restarts
 * since it was written, with no surface anywhere that said so.
 *
 * @module hooks/usePendingActivity
 */

import { useContext, useMemo } from 'react';
import {
  usePendingTransactionsOptional,
  type PendingTransactionStatus,
} from '../contexts/PendingTransactionsContext';
import { BridgeSettlementContext } from '../contexts/BridgeSettlementContext';

export type PendingActivityKind = 'send' | 'swap' | 'bridge';

export interface PendingActivityItem {
  /** Stable identity: a signature, or a StealthEX exchange id. */
  id: string;
  kind: PendingActivityKind;
  status: PendingTransactionStatus;
  /**
   * Amounts, symbols or a reference id — never prose, so it can sit beside
   * translated copy without needing translation itself.
   */
  detail?: string;
  /** Whether the user may clear this row. Bridges resolve on their own. */
  dismissible: boolean;
}

export interface UsePendingActivityResult {
  items: PendingActivityItem[];
  dismiss: (id: string) => void;
}

export function usePendingActivity(): UsePendingActivityResult {
  const pendingTx = usePendingTransactionsOptional();
  const bridge = useContext(BridgeSettlementContext);

  const transactions = pendingTx?.pendingTransactions;
  const foregroundReported = pendingTx?.foregroundReported;
  const exchanges = bridge?.pendingExchanges;
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
      // A bridge is only ever listed while it is unresolved: the settlement
      // provider removes it the moment StealthEX reports an outcome, and drops
      // it once it has gone a day without reaching one — an order whose deposit
      // never left must not sit here claiming to be in flight. The exchange id
      // is the detail on purpose — it is the only reference number a user could
      // ever quote to support.
      ...(exchanges ?? []).map((ex) => ({
        id: ex.id,
        kind: 'bridge' as const,
        status: 'pending' as const,
        detail: ex.id,
        dismissible: false,
      })),
    ];

    return {
      items,
      dismiss: (id: string) => dismissPendingTransaction?.(id),
    };
  }, [transactions, exchanges, foregroundReported, dismissPendingTransaction]);
}
