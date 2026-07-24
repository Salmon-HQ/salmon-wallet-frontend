/**
 * useNftTransfer Hook
 *
 * Shared hook for multi-chain NFT transfers.
 *
 * - Solana: asks the backend for an unsigned transaction built with Metaplex
 *   (`transferV1`, or Bubblegum for compressed assets) and signs it locally.
 *   A plain SPL transfer is NOT usable here: programmable NFTs keep their token
 *   account frozen and reject it with `Account is frozen` (error 0x11).
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
import { createNftTransferTransaction } from '../api/services/nft-transfer';
import { signAndSendPreparedSolanaTransactions } from '../blockchain/solana/prepared-transactions';
import type { SolanaAccount } from '../blockchain/solana';
import type { SolanaNetworkId } from '../types/blockchain';

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
          // Do NOT use a plain SPL transfer here. A programmable NFT (pNFT)
          // keeps its token account permanently frozen, so an SPL transfer
          // fails with `Account is frozen` (custom program error 0x11). The
          // backend builds the transaction with Metaplex `transferV1` (or
          // Bubblegum for compressed assets), which covers every variant the
          // wallet can hold; the client only signs and sends it.
          const prepared = await createNftTransferTransaction(
            {
              mintAddress: solanaNft.mint,
              ownerAddress: account.getReceiveAddress(),
              destinationAddress: recipientAddress,
            },
            account.getNetworkId() as SolanaNetworkId
          );

          const signatures = await signAndSendPreparedSolanaTransactions(
            account as SolanaAccount,
            prepared
          );

          const txId = signatures[signatures.length - 1];
          if (!txId) {
            throw new Error('NFT transfer did not return a transaction signature');
          }
          result = { txId };
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
        // chain family and a boolean — never the recipient, mint or token id.
        trackEvent('nft_sent', {
          chain: account.getNetworkId().split('-')[0] as 'solana' | 'bitcoin' | 'ethereum',
          success: true,
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
        // Failed NFT transfer — the same event with success:false, so the NFT
        // send has a real completion-vs-failure rate too (this path is exactly
        // where the frozen-pNFT failures used to surface). Solana only.
        trackEvent('nft_sent', {
          chain: account.getNetworkId().split('-')[0] as 'solana' | 'bitcoin' | 'ethereum',
          success: false,
        });
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
