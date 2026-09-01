/**
 * NftFlowContext — the NFT detail screens' shared state.
 *
 * The NFT detail used to be one mounted sheet holding its own step, recipient
 * and burn state, with the burn state machine itself living one level further
 * out, on `NftsTab`. As stack screens each screen mounts and unmounts on its
 * own, so everything that must survive a back gesture — or a lock overlay
 * covering the flow mid-transaction — lives here, in a provider mounted once
 * at `app/(app)/nft/[id]/_layout`.
 *
 * The two transaction hooks live here for the same reason `SendFlowContext`
 * holds `useSendTransaction`: the screen that fires the transfer is replaced
 * by the receipt the instant it commits, and a hook owned there would take the
 * in-flight transaction's only observer with it. Nothing about either
 * transaction changed — the same `useNftTransfer`, the same `useNftBurn`, the
 * same `createBurnTransaction`, the same parameters, the same order.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  SECTION_TO_NETWORK,
  canonicalNftToSolanaNftData,
  classifyTransactionError,
  createBurnTransaction,
  getDefaultExplorer,
  getTransactionUrl,
  useAccountsContext,
  useNftBurn,
  useNftTransfer,
  useSettleAfterTx,
  useSolanaNfts,
  type Blockchain,
  type BlockchainAccount,
  type NetworkEnvironment,
  type Nft,
  type NftData,
  type PreparedNftTransactionResponse,
  type SolanaAccount,
  type SolanaNetworkId,
} from '@salmon/shared';

import { useDeveloperMode } from './DeveloperModeContext';

/** Which of the collectibles sections the NFT was opened from. */
export type NftSectionKey = keyof typeof SECTION_TO_NETWORK;

/** What the receipt is a receipt for. */
export type NftSuccessKind = 'send' | 'burn';

export interface NftFlowValue {
  /** The NFT the flow is about, or `null` while the list is still resolving. */
  nft: NftData | null;
  /** True only while there is no cached list to resolve the mint against. */
  nftLoading: boolean;
  /** The sub-account that owns the NFT — the one that will sign. */
  account: BlockchainAccount | undefined;

  /** Exactly what the user typed — an address, or a domain. */
  recipient: string;
  /** Setting it clears the verdict below: an edited string is unjudged. */
  setRecipient: (address: string) => void;
  /**
   * The recipient string `useAddressValidation` actually approved. Confirm is
   * gated on this equalling `recipient`, so a string edited after the verdict
   * — the 500ms debounce window, where the hook still reports the previous
   * `isValid` — can never be signed for.
   */
  validatedRecipient: string | null;
  /** The address a validated domain resolved to, when it was one. */
  resolvedRecipient: string | null;
  /** Record the verdict. The two values move together or not at all. */
  setValidatedRecipient: (address: string, resolvedAddress: string | null) => void;
  sending: boolean;
  sendError: string | null;
  /** Commit the transfer. The review screen fires it. */
  submitSend: () => Promise<void>;

  burnPreview: PreparedNftTransactionResponse | null;
  /** Preparing the preview or submitting the burn — one busy flag, as before. */
  burnPreparing: boolean;
  burnError: string | null;
  /** Build the burn preview. The detail screen fires it on the way to review. */
  prepareBurn: () => Promise<void>;
  /** Sign and send the prepared burn. */
  confirmBurn: () => Promise<void>;
  resetBurn: () => void;

  successKind: NftSuccessKind | null;
  successTxId: string | null;
  /** True while settlement waits for the indexer; gates the receipt's CTA. */
  successSettling: boolean;
  explorerUrl: string | null;
  /** The receipt's "Return home": settle what the sheet settled, then drop. */
  acknowledgeSuccess: () => void;
  reset: () => void;
}

const NftFlowContext = createContext<NftFlowValue | null>(null);

export interface NftFlowProviderProps {
  /** The NFT's mint address — the `[id]` route segment. */
  mint: string;
  /** Which collectibles section it was opened from. */
  sectionKey: NftSectionKey;
  /** Index of the sub-account inside that section's network. */
  subAccountIndex: number;
  children: React.ReactNode;
}

export function NftFlowProvider({
  mint,
  sectionKey,
  subAccountIndex,
  children,
}: NftFlowProviderProps) {
  const { t } = useTranslation();
  const [accountState] = useAccountsContext();
  const { ready, activeAccount } = accountState;
  const developerNetworks = useDeveloperMode();

  const networkId = SECTION_TO_NETWORK[sectionKey] as SolanaNetworkId;

  const account: BlockchainAccount | undefined =
    activeAccount?.networksAccounts?.[networkId]?.[subAccountIndex] ?? undefined;

  // The same query `NftsTab` already ran, with the same key: React Query hands
  // back the cached list rather than firing a second request for the grid the
  // user was just looking at. `includeSpam` has to match the grid's, or the
  // key differs and the cache misses.
  const { nfts, loading } = useSolanaNfts({
    publicKey: ready ? account?.getReceiveAddress() : undefined,
    networkId,
    includeSpam: !!developerNetworks,
  });

  const nft = useMemo<NftData | null>(() => {
    const raw = (nfts as Nft[]).find((candidate) => candidate.mint.address === mint);
    return raw ? canonicalNftToSolanaNftData(raw) : null;
  }, [nfts, mint]);

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
    activeAccountId: activeAccount?.id,
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

  // A different NFT means a different flow. The sheet reset on `nft?.mint`
  // changing; the route does the same on the mint it was opened with.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the mint is the flow's identity
  }, [mint]);

  const submitSend = useCallback(async () => {
    if (!nft || sending) return;

    setSending(true);
    setSendError(null);

    try {
      // The one transaction-input change in this move, and it needs human
      // sign-off: the sheet passed the raw typed string, so a `bob.sol`
      // recipient was signed for verbatim. This mirrors
      // `SendFlowContext.submit`, which has always paid the resolved address —
      // and the review screen displays both, so nothing is signed that the
      // user did not see. Everything else about the call is unchanged: same
      // hook, same NFT object.
      const result = await sendNft(nft, resolvedRecipient ?? recipient);
      setSuccessKind('send');
      setSuccessTxId(result.txId);
    } catch (err) {
      setSendError(classifyTransactionError(err));
    } finally {
      setSending(false);
    }
  }, [nft, recipient, resolvedRecipient, sendNft, sending]);

  const prepareBurn = useCallback(async () => {
    if (!nft) return;
    const blockchain = nft.blockchain;

    if (blockchain !== 'solana') {
      Alert.alert(
        t('general.not_supported', 'Not Supported'),
        t('nft.burn.notSupported', 'Burning {{blockchain}} NFTs is not yet supported.', {
          blockchain,
        })
      );
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
        const solAccount = account as SolanaAccount;
        const balance = await solAccount.getCredit();
        if (balance < txResponse.lookupTable.estimatedRentLamports) {
          setBurnError('nft.burn.insufficientFeeSol');
        }
      }
    } catch (err) {
      setBurnError(classifyTransactionError(err));
    } finally {
      setBurnPreparing(false);
    }
  }, [account, networkId, nft, t]);

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

  // The sheet's `handleSendSuccess`, unchanged: a second settle carrying the
  // avatar account id, fired when the user acknowledges the receipt. A burn
  // settles inside `useNftBurn` and had no second pass.
  const acknowledgeSuccess = useCallback(() => {
    if (successKind === 'send' && account) {
      settleAfterTx({
        accountId: account.getReceiveAddress(),
        avatarAccountId: activeAccount?.id,
        networkId: account.getNetworkId(),
        kinds: ['balance', 'transactions', 'nfts', 'avatar-nfts'],
        removedNftMintAddresses: nft?.mint ? [nft.mint] : undefined,
      }).catch((err) => {
        console.warn('[NftFlow] settleAfterTx failed:', err);
      });
    }
    reset();
  }, [account, activeAccount?.id, nft?.mint, reset, settleAfterTx, successKind]);

  const value = useMemo<NftFlowValue>(
    () => ({
      nft,
      nftLoading: loading,
      account,
      recipient,
      setRecipient,
      validatedRecipient,
      resolvedRecipient,
      setValidatedRecipient,
      sending,
      sendError,
      submitSend,
      burnPreview,
      // One busy flag for both halves, exactly as the sheet was handed it.
      burnPreparing: burnPreparing || burnExecuting,
      burnError,
      prepareBurn,
      confirmBurn,
      resetBurn,
      successKind,
      successTxId,
      successSettling: successKind === 'burn' ? nftBurn.settling : sendSettling,
      explorerUrl,
      acknowledgeSuccess,
      reset,
    }),
    [
      nft,
      loading,
      account,
      recipient,
      setRecipient,
      validatedRecipient,
      resolvedRecipient,
      setValidatedRecipient,
      sending,
      sendError,
      submitSend,
      burnPreview,
      burnPreparing,
      burnExecuting,
      burnError,
      prepareBurn,
      confirmBurn,
      resetBurn,
      successKind,
      successTxId,
      nftBurn.settling,
      sendSettling,
      explorerUrl,
      acknowledgeSuccess,
      reset,
    ]
  );

  return <NftFlowContext.Provider value={value}>{children}</NftFlowContext.Provider>;
}

/**
 * The flow's state, from any of the five NFT screens.
 *
 * Throws outside the provider rather than handing back a null-ish default: an
 * NFT screen with no flow behind it has no NFT to show.
 */
export function useNftFlow(): NftFlowValue {
  const value = useContext(NftFlowContext);
  if (!value) throw new Error('useNftFlow must be used inside NftFlowProvider');
  return value;
}

export default NftFlowContext;
