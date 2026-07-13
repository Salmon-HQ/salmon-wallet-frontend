/**
 * useNftTransfer Hook
 *
 * Shared hook for multi-chain NFT transfers.
 * Delegates to the account's transfer() method, which internally routes
 * to the appropriate blockchain transfer service.
 *
 * - Solana: transfers SPL token with amount=1 via account.transfer()
 * - Bitcoin: not supported (ordinal transfers require special UTXO selection)
 */

import { useState, useCallback } from 'react';
import type { BlockchainAccount } from '../types/blockchain';
import type {
  NftData,
  SolanaNftData,
} from '../utils/nft';
import { useSettleUntilChanged } from '../query/invalidation';
import { trackEvent } from '../analytics';

export type NftTransferStatus = 'idle' | 'sending' | 'success' | 'failed';

export interface UseNftTransferParams {
  account: BlockchainAccount | undefined;
  /**
   * Optional callback fired after a transfer completes successfully. Consumers
   * should wire this to refetch the NFT list so the UI does not display the
   * sent NFT until the indexer (Helius DAS, ~10–30s) catches up. Without a
   * refetch, the list will look stale right after the user confirms the send.
   */
  onTransferSuccess?: (nft: NftData, txId: string) => void;
}

export interface UseNftTransferResult {
  sendNft: (nft: NftData, recipientAddress: string) => Promise<{ txId: string }>;
  status: NftTransferStatus;
  /** True while the post-success settlement waits for the indexer to catch up. */
  settling: boolean;
  error: string | null;
  isError: boolean;
  reset: () => void;
}

export function useNftTransfer({ account, onTransferSuccess }: UseNftTransferParams): UseNftTransferResult {
  const [status, setStatus] = useState<NftTransferStatus>('idle');
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settleUntilChanged = useSettleUntilChanged();

  const reset = useCallback(() => {
    setStatus('idle');
    setSettling(false);
    setError(null);
  }, []);

  const sendNft = useCallback(
    async (nft: NftData, recipientAddress: string): Promise<{ txId: string }> => {
      if (!account) {
        throw new Error('No account available');
      }

      setStatus('sending');
      setError(null);

      try {
        let result: { txId: string };

        if (nft.blockchain === 'solana') {
          const solanaNft = nft as SolanaNftData;
          result = await account.transfer(recipientAddress, solanaNft.mint, 1);
        } else {
          // TODO: Bitcoin ordinal transfers require inscription-aware UTXO selection.
          // QuickNode's Ordinals & Runes API provides ord_getOutput(txid:vout) which
          // returns the inscriptions[] in each UTXO — the missing piece to identify
          // which UTXOs are safe to spend for fees vs which carry the inscription.
          // Implementation path: bb_getUTXOs → ord_getOutput per UTXO → build PSBT
          // with bitcoinjs-lib → sign with BIP32 key → sendrawtransaction.
          // See: https://marketplace.quicknode.com/add-on/ordinals-json-rpc-api
          throw new Error('Ordinal transfers are not yet supported');
        }

        setStatus('success');
        // Anonymous funnel event: an NFT transfer succeeded. Only the coarse
        // chain family — never the recipient, mint or token id.
        trackEvent('nft_sent', {
          chain: account.getNetworkId().split('-')[0] as 'solana' | 'bitcoin' | 'ethereum',
        });
        const accountId = account.getReceiveAddress();
        const networkId = account.getNetworkId();
        const transferredMint =
          nft.blockchain === 'solana' ? (nft as SolanaNftData).mint : undefined;
        setSettling(true);
        settleUntilChanged({
          accountId,
          networkId,
          kinds: ['balance', 'transactions', 'nfts', 'avatar-nfts'],
          removedNftMintAddresses: transferredMint ? [transferredMint] : undefined,
        })
          .catch((err) => {
            console.warn('[useNftTransfer] settleUntilChanged failed:', err);
          })
          .finally(() => {
            setSettling(false);
          });
        onTransferSuccess?.(nft, result.txId);
        return result;
      } catch (err) {
        console.error('[useNftTransfer] Transfer failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'NFT transfer failed';
        setError(errorMessage);
        setStatus('failed');
        throw err;
      }
    },
    [account, onTransferSuccess, settleUntilChanged],
  );

  return { sendNft, status, settling, error, isError: error !== null, reset };
}
