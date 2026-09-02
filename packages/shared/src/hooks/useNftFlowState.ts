/**
 * The NFT flow's state — one implementation for the detail, send, burn and
 * receipt screens on every platform.
 *
 * Mobile mounts it in a provider above the `nft/[id]` routes
 * (`NftFlowProvider`), so the recipient, the burn preview and the receipt
 * survive a back gesture and the lock overlay; the DOM's Home drives
 * `NftDetailPage` and calls it directly. What it holds is the same on both:
 * the typed recipient and the verdict it was approved with, the transfer, the
 * burn preview and its confirmation, and the receipt with its explorer link.
 *
 * It owns no platform and no key: the NFT, the signing account and the network
 * come in as params; the transaction hooks it composes (`useNftTransfer`,
 * `useNftBurn`) are the same ones both platforms always called, with the same
 * arguments in the same order. Alerts, routing and haptics stay with the
 * caller (`onBurnUnsupported` is the one hand-back).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { createBurnTransaction } from '../api/services/nft-burn';
import { getDefaultExplorer, getTransactionUrl } from '../config/explorers';
import type { Blockchain, NetworkEnvironment } from '../config/explorers';
import { useSettleAfterTx } from '../query/invalidation';
import type { SolanaAccount } from '../blockchain/solana/SolanaAccount';
import type { BlockchainAccount, SolanaNetworkId } from '../types/blockchain';
import type { PreparedNftTransactionResponse } from '../types/nft';
import type { NftData } from '../utils/nft';
import { classifyTransactionError } from '../utils/transaction-errors';
import { useNftBurn } from './useNftBurn';
import { useNftTransfer } from './useNftTransfer';

/** What the receipt is a receipt for. */
export type NftSuccessKind = 'send' | 'burn';

export interface UseNftFlowStateParams {
  /** The NFT the flow is about, or `null` while the list is still resolving. */
  nft: NftData | null;
  /** The sub-account that owns the NFT — the one that will sign. */
  account: BlockchainAccount | undefined;
  /** The Solana network the NFT lives on — the one the session stands on. */
  networkId: SolanaNetworkId;
  /** The wallet's id, for the avatar settle after a transfer. */
  activeAccountId?: string;
  /**
   * The flow's identity. When it changes the whole state resets: a different
   * NFT is a different flow (mobile passes the route's mint).
   */
  flowKey?: string;
  /** Burn asked on a chain that cannot burn — the caller says so its own way. */
  onBurnUnsupported?: (blockchain: string) => void;
}

export function useNftFlowState({
  nft,
  account,
  networkId,
  activeAccountId,
  flowKey,
  onBurnUnsupported,
}: UseNftFlowStateParams) {
  // ---------------------------------------------------------------- send ---

  const [recipient, setRecipientState] = useState('');
  const [validatedRecipient, setValidatedRecipientState] = useState<string | null>(null);
  const [resolvedRecipient, setResolvedRecipient] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Editing the field drops the verdict here rather than on the screen: a
  // screen that forgets to clear it would leave a signable stale approval.
  const setRecipient = useCallback((address: string) => {
    setRecipientState(address);
    setValidatedRecipientState(null);
    setResolvedRecipient(null);
  }, []);

  /** Record the verdict. The two values move together or not at all. */
  const setValidatedRecipient = useCallback((address: string, resolvedAddress: string | null) => {
    setRecipientState(address);
    setValidatedRecipientState(address);
    setResolvedRecipient(resolvedAddress);
  }, []);

  const { sendNft, settling: sendSettling } = useNftTransfer({ account });

  // ---------------------------------------------------------------- burn ---

  const [burnPreview, setBurnPreview] = useState<PreparedNftTransactionResponse | null>(null);
  const [burnPreparing, setBurnPreparing] = useState(false);
  const [burnExecuting, setBurnExecuting] = useState(false);
  const [burnError, setBurnError] = useState<string | null>(null);

  const settleAfterTx = useSettleAfterTx();
  const nftBurn = useNftBurn({
    account: (account as SolanaAccount | undefined) ?? null,
    activeAccountId,
  });

  // -------------------------------------------------------------- receipt ---

  const [successKind, setSuccessKind] = useState<NftSuccessKind | null>(null);
  const [successTxId, setSuccessTxId] = useState<string | null>(null);

  const resetBurn = useCallback(() => {
    setBurnPreview(null);
    setBurnPreparing(false);
    setBurnExecuting(false);
    setBurnError(null);
  }, []);

  const reset = useCallback(() => {
    setRecipientState('');
    setValidatedRecipientState(null);
    setResolvedRecipient(null);
    setSending(false);
    setSendError(null);
    setSuccessKind(null);
    setSuccessTxId(null);
    resetBurn();
  }, [resetBurn]);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the flow's identity
  }, [flowKey]);

  /** Commit the transfer to the recipient the review screen showed. */
  const submitSend = useCallback(async () => {
    if (!nft || sending) return;

    setSending(true);
    setSendError(null);

    try {
      // The resolved address is what is paid — the review screen displays
      // both, so nothing is signed that the user did not see.
      const result = await sendNft(nft, resolvedRecipient ?? recipient);
      setSuccessKind('send');
      setSuccessTxId(result.txId);
    } catch (err) {
      setSendError(classifyTransactionError(err));
    } finally {
      setSending(false);
    }
  }, [nft, recipient, resolvedRecipient, sendNft, sending]);

  /** Build the burn preview. The detail screen fires it on the way to review. */
  const prepareBurn = useCallback(async () => {
    if (!nft) return;

    if (nft.blockchain !== 'solana') {
      onBurnUnsupported?.(nft.blockchain);
      return;
    }

    if (!account) {
      setBurnError('collectibles.no_account_for_network');
      return;
    }

    setBurnPreparing(true);
    setBurnError(null);
    setBurnPreview(null);

    try {
      const ownerAddress = account.getReceiveAddress();
      const txResponse = await createBurnTransaction(
        { mintAddress: nft.mint, ownerAddress },
        networkId
      );
      setBurnPreview(txResponse);

      if (txResponse.lookupTable) {
        const balance = await (account as SolanaAccount).getCredit();
        if (balance < txResponse.lookupTable.estimatedRentLamports) {
          setBurnError('nft.burn.insufficientFeeSol');
        }
      }
    } catch (err) {
      setBurnError(classifyTransactionError(err));
    } finally {
      setBurnPreparing(false);
    }
  }, [account, networkId, nft, onBurnUnsupported]);

  /** Sign and send the prepared burn. */
  const confirmBurn = useCallback(async () => {
    if (!nft || !account || !burnPreview) return;

    setBurnExecuting(true);
    setBurnError(null);

    try {
      const signatures = await nftBurn.burnNft(burnPreview, nft.mint ?? undefined);
      setSuccessKind('burn');
      setSuccessTxId(signatures[signatures.length - 1] ?? '');
    } catch (err) {
      setBurnError(classifyTransactionError(err));
    } finally {
      setBurnExecuting(false);
    }
  }, [account, burnPreview, nft, nftBurn]);

  const explorerUrl = useMemo(() => {
    if (!successTxId || !nft || !account) return null;

    const accountNetworkId = account.getNetworkId();
    if (!accountNetworkId) return null;

    const blockchain = nft.blockchain.toUpperCase() as Blockchain;
    return (
      getTransactionUrl(
        blockchain,
        accountNetworkId as NetworkEnvironment,
        getDefaultExplorer(blockchain),
        successTxId
      ) ?? null
    );
  }, [account, nft, successTxId]);

  /**
   * The second settle after a transfer, carrying the avatar account id: the
   * grid and the avatar picker both drop the NFT. A burn settles inside
   * `useNftBurn` and has no second pass.
   */
  const settleAfterSend = useCallback(() => {
    if (!account) return;
    settleAfterTx({
      accountId: account.getReceiveAddress(),
      avatarAccountId: activeAccountId,
      networkId: account.getNetworkId(),
      kinds: ['balance', 'transactions', 'nfts', 'avatar-nfts'],
      removedNftMintAddresses: nft?.mint ? [nft.mint] : undefined,
    }).catch((err) => {
      console.warn('[NftFlow] settleAfterTx failed:', err);
    });
  }, [account, activeAccountId, nft?.mint, settleAfterTx]);

  /** The receipt's "Return home": settle what the receipt settled, then drop. */
  const acknowledgeSuccess = useCallback(() => {
    if (successKind === 'send') settleAfterSend();
    reset();
  }, [reset, settleAfterSend, successKind]);

  return {
    recipient,
    setRecipient,
    validatedRecipient,
    resolvedRecipient,
    setValidatedRecipient,
    sending,
    sendError,
    submitSend,
    burnPreview,
    /** One busy flag for both halves, exactly as the screens were handed it. */
    burnPreparing: burnPreparing || burnExecuting,
    burnError,
    prepareBurn,
    confirmBurn,
    resetBurn,
    successKind,
    successTxId,
    /** True while settlement waits for the indexer; gates the receipt's CTA. */
    successSettling: successKind === 'burn' ? nftBurn.settling : sendSettling,
    explorerUrl,
    settleAfterSend,
    acknowledgeSuccess,
    reset,
  };
}

export type NftFlowState = ReturnType<typeof useNftFlowState>;
