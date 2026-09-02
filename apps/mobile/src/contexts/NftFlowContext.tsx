/**
 * NftFlowContext — the NFT detail screens' shared state, on mobile.
 *
 * The flow itself is `useNftFlowState` in `@salmon/shared` (recipient, transfer,
 * burn preview, receipt — the same on the DOM). This provider is the mobile
 * seam around it: as stack screens each NFT route mounts and unmounts on its
 * own, so the state that must survive a back gesture — or the lock overlay
 * covering the flow mid-transaction — lives here, mounted once at
 * `app/(app)/nft/[id]/_layout`. It resolves the NFT from the list the grid
 * already loaded, picks the sub-account that will sign, and hands the flow the
 * route's mint as its identity.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  canonicalNftToSolanaNftData,
  useAccountsContext,
  useNftFlowState,
  useSolanaNfts,
  type BlockchainAccount,
  type Nft,
  type NftData,
  type NftFlowState,
  type SolanaNetworkId,
} from '@salmon/shared';

import { useUnverifiedTokens } from './DeveloperModeContext';

export type { NftSuccessKind } from '@salmon/shared';

export interface NftFlowValue extends Omit<NftFlowState, 'settleAfterSend'> {
  /** The NFT the flow is about, or `null` while the list is still resolving. */
  nft: NftData | null;
  /** True only while there is no cached list to resolve the mint against. */
  nftLoading: boolean;
  /** The sub-account that owns the NFT — the one that will sign. */
  account: BlockchainAccount | undefined;
}

const NftFlowContext = createContext<NftFlowValue | null>(null);

export interface NftFlowProviderProps {
  /** The NFT's mint address — the `[id]` route segment. */
  mint: string;
  /** The Solana network the NFT lives on — the one the session stands on. */
  networkId: SolanaNetworkId;
  /** Index of the sub-account inside that network. */
  subAccountIndex: number;
  children: React.ReactNode;
}

export function NftFlowProvider({
  mint,
  networkId,
  subAccountIndex,
  children,
}: NftFlowProviderProps) {
  const { t } = useTranslation();
  const [accountState] = useAccountsContext();
  const { ready, activeAccount } = accountState;
  const showUnverifiedTokens = useUnverifiedTokens();

  const account: BlockchainAccount | undefined =
    activeAccount?.networksAccounts?.[networkId]?.[subAccountIndex] ?? undefined;

  // The same query `NftsTab` already ran, with the same key: React Query hands
  // back the cached list rather than firing a second request for the grid the
  // user was just looking at. `includeSpam` has to match the grid's, or the
  // key differs and the cache misses.
  const { nfts, loading } = useSolanaNfts({
    publicKey: ready ? account?.getReceiveAddress() : undefined,
    networkId,
    includeSpam: showUnverifiedTokens,
  });

  const nft = useMemo<NftData | null>(() => {
    const raw = (nfts as Nft[]).find((candidate) => candidate.mint.address === mint);
    return raw ? canonicalNftToSolanaNftData(raw) : null;
  }, [nfts, mint]);

  const { settleAfterSend: _settleAfterSend, ...flow } = useNftFlowState({
    nft,
    account,
    networkId,
    activeAccountId: activeAccount?.id,
    flowKey: mint,
    onBurnUnsupported: (blockchain) =>
      Alert.alert(
        t('general.not_supported', 'Not Supported'),
        t('nft.burn.notSupported', 'Burning {{blockchain}} NFTs is not yet supported.', {
          blockchain,
        })
      ),
  });

  const value = useMemo<NftFlowValue>(
    () => ({ nft, nftLoading: loading, account, ...flow }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `flow` is a fresh object each render; its fields are the deps
    [nft, loading, account, ...Object.values(flow)]
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
