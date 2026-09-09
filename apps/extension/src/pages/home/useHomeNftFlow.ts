/**
 * The NFT flow as Home drives it on the DOM: which collectible is open, the
 * burn review inside its detail page, and the collectible a Send was opened
 * for. The flow's own state (burn preview, receipt, settle) is the shared
 * `useNftFlowState`, the same hook mobile's `NftFlowProvider` wraps.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  useAccountsContext,
  useNftFlowState,
  type NftData,
  type SolanaNetworkId,
} from '@salmon/shared';
import { isSignableSolanaAccount } from '@salmon/shared/utils/account';

import type { PageView } from './pages';

type ActiveAccount = ReturnType<typeof useAccountsContext>[0]['activeAccount'];

interface UseHomeNftFlowOptions {
  activeAccount: ActiveAccount;
  /** Moves the stack to a page; Home's own `setCurrentPage`. */
  navigate: (page: PageView) => void;
}

export function useHomeNftFlow({ activeAccount, navigate }: UseHomeNftFlowOptions) {
  // The collectible being sent, when Send was opened from an NFT's detail:
  // the send flow becomes mobile's `nft/[id]/send` (spec 028 lot 4).
  const [sendNft, setSendNft] = useState<NftData | null>(null);
  // Mobile's `nft/[id]/burn` is a route; the DOM keeps the review inside the
  // detail page, so which step shows is the one local bit of state here.
  const [burnReviewOpen, setBurnReviewOpen] = useState(false);

  const [selectedNft, setSelectedNft] = useState<NftData | null>(null);
  const collectibleSolanaAccount = useMemo(() => {
    const networksAccounts = activeAccount?.networksAccounts;
    if (!networksAccounts) return undefined;

    const preferredNetworkIds = ['solana-mainnet', 'solana-devnet'] as const;
    for (const preferredNetworkId of preferredNetworkIds) {
      const account = networksAccounts[preferredNetworkId]?.[0];
      if (account && isSignableSolanaAccount(account)) {
        return account;
      }
    }

    for (const accounts of Object.values(networksAccounts)) {
      for (const account of accounts ?? []) {
        if (account && isSignableSolanaAccount(account)) {
          return account;
        }
      }
    }

    return undefined;
  }, [activeAccount]);

  // The NFT flow's state — the same hook mobile's `NftFlowProvider` wraps:
  // the burn preview and its confirmation, the receipt, the settle after a
  // transfer. The signing account and the network are the collectible's own.
  const nftFlow = useNftFlowState({
    nft: selectedNft,
    account: collectibleSolanaAccount,
    networkId: (collectibleSolanaAccount?.getNetworkId() ?? 'solana-mainnet') as SolanaNetworkId,
    activeAccountId: activeAccount?.id,
    flowKey: selectedNft?.mint,
  });
  const {
    prepareBurn: prepareNftBurn,
    resetBurn: resetNftBurn,
    acknowledgeSuccess: acknowledgeNftSuccess,
    settleAfterSend: settleAfterNftSend,
  } = nftFlow;

  const handleNftDetailPress = useCallback(
    (nft: NftData) => {
      setSelectedNft(nft);
      navigate('nftDetail');
    },
    [navigate]
  );

  const handleNftDetailBack = useCallback(() => {
    setBurnReviewOpen(false);
    resetNftBurn();
    navigate('home');
    setSelectedNft(null);
  }, [navigate, resetNftBurn]);

  // NFT action handlers
  const handleNftSendPress = useCallback(() => {
    if (!selectedNft) return;
    setSendNft(selectedNft);
    navigate('send');
  }, [navigate, selectedNft]);

  const handleNftBurnPress = useCallback(() => {
    setBurnReviewOpen(true);
    void prepareNftBurn();
  }, [prepareNftBurn]);

  const handleNftBurnBack = useCallback(() => {
    setBurnReviewOpen(false);
    resetNftBurn();
  }, [resetNftBurn]);

  const handleNftBurnSuccessContinue = useCallback(() => {
    acknowledgeNftSuccess();
    setBurnReviewOpen(false);
    navigate('home');
    setSelectedNft(null);
  }, [acknowledgeNftSuccess, navigate]);

  /** Backing out of Send: the collectible it was opened for is forgotten. */
  const clearSendNft = useCallback(() => setSendNft(null), []);

  /**
   * A send that succeeded. As mobile's `acknowledgeSuccess`: a collectible's
   * transfer settles the grid and the avatar too.
   */
  const settleAfterSend = useCallback(() => {
    if (sendNft) {
      settleAfterNftSend();
      setSendNft(null);
      setSelectedNft(null);
    }
  }, [sendNft, settleAfterNftSend]);

  return {
    selectedNft,
    sendNft,
    burnReviewOpen,
    collectibleSolanaAccount,
    nftFlow,
    handleNftDetailPress,
    handleNftDetailBack,
    handleNftSendPress,
    handleNftBurnPress,
    handleNftBurnBack,
    handleNftBurnSuccessContinue,
    clearSendNft,
    settleAfterSend,
  };
}
