/**
 * useNftBurn - owns NFT burn execution + event-driven settlement.
 *
 * Mirrors useNftTransfer: it executes a prepared burn transaction, then settles
 * balance/NFT queries via useSettleUntilChanged and exposes a `settling` flag so
 * the burn success screen can dwell until the indexer reflects the change (the
 * burned NFT gone, rent reclaimed) instead of returning the user to a stale
 * list. Callers build the prepared burn (createBurnTransaction) during the
 * review step and hand it here on confirm.
 *
 * @module hooks/useNftBurn
 */

import { useCallback, useRef, useState } from 'react';
import type { SolanaAccount } from '../blockchain/solana/SolanaAccount';
import { SolanaOutcomeUnknownError } from '../blockchain/solana/confirm';
import { signAndSendPreparedSolanaTransactions } from '../blockchain/solana/prepared-transactions';
import { usePendingTransactionsOptional } from '../contexts/PendingTransactionsContext';
import { useSettleUntilChanged } from '../query/invalidation';
import { classifyTransactionError } from '../utils/transaction-errors';

type PreparedBurn = Parameters<typeof signAndSendPreparedSolanaTransactions>[1];

export type NftBurnStatus = 'idle' | 'burning' | 'success' | 'failed';

export interface UseNftBurnParams {
  account: SolanaAccount | null;
  /** Parent wallet account id, for avatar-nfts caches keyed by Account.id. */
  activeAccountId?: string;
  onBurnSuccess?: () => void;
}

export interface UseNftBurnResult {
  /** Execute a prepared burn of `mint` and settle, hiding the NFT optimistically. */
  burnNft: (prepared: PreparedBurn, mint: string, name?: string) => Promise<string[]>;
  status: NftBurnStatus;
  /** True while settlement waits for the indexer to drop the burned NFT. */
  settling: boolean;
  error: string | null;
  isError: boolean;
  reset: () => void;
}

export function useNftBurn({
  account,
  activeAccountId,
  onBurnSuccess,
}: UseNftBurnParams): UseNftBurnResult {
  const [status, setStatus] = useState<NftBurnStatus>('idle');
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settleUntilChanged = useSettleUntilChanged();
  const pendingTransactions = usePendingTransactionsOptional();
  // A burn whose outcome is unknown may have landed: no second burn until reset.
  const unresolvedRef = useRef(false);

  const reset = useCallback(() => {
    unresolvedRef.current = false;
    setStatus('idle');
    setSettling(false);
    setError(null);
  }, []);

  const burnNft = useCallback(
    async (prepared: PreparedBurn, mint: string, name?: string): Promise<string[]> => {
      if (!account) {
        throw new Error('No account available');
      }
      if (unresolvedRef.current) throw new Error('transaction.errors.broadcastUnknown');

      setStatus('burning');
      setError(null);

      try {
        // A burn destroys one asset and nothing else: the one the screen showed.
        const signatures = await signAndSendPreparedSolanaTransactions(account, prepared, {
          nftAction: { asset: mint },
        });

        setStatus('success');
        setSettling(true);
        settleUntilChanged({
          accountId: account.getReceiveAddress(),
          avatarAccountId: activeAccountId,
          networkId: account.getNetworkId(),
          kinds: ['balance', 'transactions', 'nfts', 'avatar-nfts'],
          removedNftMintAddresses: [mint],
        })
          .catch((err) => {
            console.warn('[useNftBurn] settleUntilChanged failed:', err);
          })
          .finally(() => {
            setSettling(false);
          });

        onBurnSuccess?.();
        return signatures;
      } catch (err) {
        console.error('[useNftBurn] Burn failed:', err);
        if (err instanceof SolanaOutcomeUnknownError) {
          unresolvedRef.current = true;
          pendingTransactions?.trackPendingTransaction({
            signature: String(err.signature),
            kind: 'send',
            networkId: account.getNetworkId(),
            accountId: account.getReceiveAddress(),
            submittedAt: Date.now(),
            summary: name ?? mint,
          });
        }
        setError(classifyTransactionError(err));
        setStatus('failed');
        throw err;
      }
    },
    [account, activeAccountId, onBurnSuccess, settleUntilChanged, pendingTransactions]
  );

  return { burnNft, status, settling, error, isError: error !== null, reset };
}
