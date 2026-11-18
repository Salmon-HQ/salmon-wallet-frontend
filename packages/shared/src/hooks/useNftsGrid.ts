/**
 * What the collectibles grid shows, on both platforms: whose NFTs, the cards
 * built from them, and which of loading, failed, empty or partial it is in.
 *
 * Layout is the platform's own — a virtualized list of rows on mobile, a CSS
 * grid in the extension — and so is what a press on a card does.
 */
import { useCallback, useMemo, useState } from 'react';
import { useAccountsContext } from '../contexts/AccountsContext';
import type { SolanaNetworkId } from '../types/blockchain';
import type { Nft } from '../types/nft';
import { canonicalNftToSolanaNftData, type SolanaNftData } from '../utils/nft';
import { useSolanaNfts } from './useSolanaNfts';

export interface UseNftsGridParams {
  /** Also show what an airdrop left behind. */
  includeSpam?: boolean;
  /** Which derived account of the active network the grid shows. */
  subAccountIndex?: number;
}

export function useNftsGrid({ includeSpam = false, subAccountIndex = 0 }: UseNftsGridParams = {}) {
  const [{ ready, activeAccount, networkId }] = useAccountsContext();

  // A Solana network is the only one with a collectibles surface, and the
  // sub-tab is only offered on Solana, so this is the active network whenever
  // the grid is on screen.
  const activeNetworkId = (networkId ?? 'solana-mainnet') as SolanaNetworkId;

  const ownerAddress = useMemo(
    () =>
      activeAccount?.networksAccounts?.[activeNetworkId]?.[subAccountIndex]?.getReceiveAddress(),
    [activeAccount, activeNetworkId, subAccountIndex]
  );

  const { nfts, loading, error, partial, refresh } = useSolanaNfts({
    publicKey: ready ? ownerAddress : undefined,
    networkId: activeNetworkId,
    includeSpam,
  });

  const cards = useMemo<SolanaNftData[]>(
    () => (nfts as Nft[]).map(canonicalNftToSolanaNftData),
    [nfts]
  );

  // The NFT query only reports its first load, so a refresh the user asked
  // for keeps its own flag.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const loadError = error !== null;

  return {
    ready,
    activeAccount,
    activeNetworkId,
    nfts: nfts as Nft[],
    cards,
    loading,
    loadError,
    // A failed load is not "you have no collectibles": the error state owns
    // that render, so the empty state stays out of it.
    isEmpty: !loading && !loadError && cards.length === 0,
    partial: !!partial,
    refreshing,
    handleRefresh,
  };
}
