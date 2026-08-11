/**
 * useSendTransaction Hook
 *
 * Shared hook for multi-chain token transfers.
 * Delegates to the account's transfer() and estimateTransferFee() methods,
 * which internally route to the appropriate blockchain transfer service.
 *
 * Features:
 * - Multi-chain transfer execution
 * - Fee estimation
 * - Transaction status tracking
 * - Amount validation
 *
 * @example
 * ```tsx
 * const { estimateFee, sendTransaction, status, error, reset } = useSendTransaction({
 *   account: activeBlockchainAccount,
 *   blockchain: 'solana',
 * });
 *
 * const fee = await estimateFee({ token, recipientAddress, amount: 1.5 });
 * const result = await sendTransaction({ token, recipientAddress, amount: 1.5 });
 * ```
 */

import { useState, useCallback } from 'react';

import type { BlockchainType, BlockchainAccount } from '../types/blockchain';
import type {
  SendTransactionParams,
  FeeEstimateResult,
  SendTransactionStatus,
} from '../types/send';
import { useSettleUntilChanged } from '../query/invalidation';
import { trackEvent, trackFirstTime } from '../analytics';
import { STORAGE_KEYS } from '../storage';
import { classifyTransactionError } from '../utils/transaction-errors';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook parameters
 */
export interface UseSendTransactionParams {
  /** The blockchain account instance */
  account: BlockchainAccount | undefined;
  /** Blockchain type for routing */
  blockchain: BlockchainType;
}

/**
 * Hook return type
 */
export interface UseSendTransactionResult {
  /** Estimate the fee for a transaction */
  estimateFee: (params: SendTransactionParams) => Promise<FeeEstimateResult | null>;
  /** Execute the transaction */
  sendTransaction: (params: SendTransactionParams) => Promise<{ txId: string }>;
  /** Current transaction status */
  status: SendTransactionStatus;
  /**
   * True while the post-success settlement is still waiting for the indexer to
   * reflect the new balance. A success screen can gate its "Done" CTA on this
   * so the user returns to a fresh balance instead of a stale one.
   */
  settling: boolean;
  /** Error message if failed */
  error: string | null;
  /** Whether the hook is in an error state */
  isError: boolean;
  /** Reset the hook state */
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSendTransaction({
  account,
  blockchain: _blockchain,
}: UseSendTransactionParams): UseSendTransactionResult {
  const [status, setStatus] = useState<SendTransactionStatus>('idle');
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settleUntilChanged = useSettleUntilChanged();

  const reset = useCallback(() => {
    setStatus('idle');
    setSettling(false);
    setError(null);
  }, []);

  // ---- Fee Estimation ----

  const estimateFee = useCallback(
    async (params: SendTransactionParams): Promise<FeeEstimateResult | null> => {
      if (!account) return null;

      setStatus('estimating-fee');
      setError(null);

      try {
        const effectiveRecipientAddress =
          params.resolvedRecipientAddress ?? params.recipientAddress;

        const result = await account.estimateTransferFee(
          effectiveRecipientAddress,
          params.token.address,
          params.amount,
        );

        setStatus('idle');
        return result;
      } catch (err) {
        console.error('[useSendTransaction] Fee estimation failed:', err);
        setStatus('idle');
        // Don't treat fee estimation failure as a blocking error
        return null;
      }
    },
    [account],
  );

  // ---- Transaction Execution ----

  const sendTransaction = useCallback(
    async (params: SendTransactionParams): Promise<{ txId: string }> => {
      if (!account) {
        throw new Error('No account available');
      }

      setStatus('creating');
      setError(null);

      try {
        setStatus('sending');

        const effectiveRecipientAddress =
          params.resolvedRecipientAddress ?? params.recipientAddress;

        const result = await account.transfer(
          effectiveRecipientAddress,
          params.token.address,
          params.amount,
          // Pass token metadata for Ethereum ERC20/NFT transfers
          { decimals: params.token.decimals, symbol: params.token.symbol },
        );

        setStatus('success');
        // Anonymous funnel event: a transfer succeeded. Only a coarse chain
        // family — never the address, amount or token mint.
        trackEvent('send_completed', {
          chain: account.getNetworkId().split('-')[0] as 'solana' | 'bitcoin' | 'ethereum',
          success: true,
        });
        // First successful send is an activation milestone — reported once per install.
        void trackFirstTime('first_send_completed', STORAGE_KEYS.ANALYTICS_FIRST_SEND);
        // Return the txId immediately so the UI can show the success screen,
        // then settle in the background. `settling` stays true until the
        // indexer reflects the new balance (or the ceiling is hit), letting the
        // success screen dwell until the user can return to a fresh balance.
        const accountId = account.getReceiveAddress();
        const networkId = account.getNetworkId();
        setSettling(true);
        settleUntilChanged({
          accountId,
          networkId,
          kinds: ['balance', 'transactions'],
        })
          .catch((err) => {
            console.warn('[useSendTransaction] settleUntilChanged failed:', err);
          })
          .finally(() => {
            setSettling(false);
          });
        return result;
      } catch (err) {
        console.error('[useSendTransaction] Transaction failed:', err);
        // Anonymous funnel event: the transfer failed. This is what turns
        // `success` into a real completion-vs-failure rate instead of a
        // constant. Coarse chain family only — never the address, amount or
        // token mint. No `first_send_completed`: that milestone is success-only.
        trackEvent('send_completed', {
          chain: account.getNetworkId().split('-')[0] as 'solana' | 'bitcoin' | 'ethereum',
          success: false,
        });
        setError(classifyTransactionError(err));
        setStatus('failed');
        throw err;
      }
    },
    [account, settleUntilChanged],
  );

  return {
    estimateFee,
    sendTransaction,
    status,
    settling,
    error,
    isError: error !== null,
    reset,
  };
}
