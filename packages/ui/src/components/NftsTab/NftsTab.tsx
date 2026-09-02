/**
 * NftsTab — the NFTs sub-tab of Home: a two-column grid of the collectibles
 * held on the network the wallet is standing on, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/NftsTab/NftsTab.tsx`. One
 * network, one grid: there used to be a mainnet section and a devnet section
 * side by side, gated on Developer Networks; the screen follows the active
 * network now (spec 026 D1), so devnet collectibles appear when — and only
 * when — the balance block is on the devnet page. The environment is said by
 * the chip in the balance block and the header, not by a banner here.
 *
 * It is built from the kit: `StateBlock` for the empty and failed answers,
 * `NftCard` / `NftCardSkeleton` for the tiles. The blocks above the grid sit
 * the component gap (20) apart; inside the grid the tiles sit 12 apart, which
 * is anatomy, not a seam between components.
 *
 * Mobile virtualises with a `FlatList` because a 900-NFT wallet mounted every
 * `<Image>` at once and the low-memory killer took the app down. The side
 * panel has no equivalent knife hanging over it and no DOM list library is
 * installed, so the grid renders straight with `loading="lazy"` on the art
 * (which `NftCard` sets) — the browser decodes what is on screen.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  canonicalNftToSolanaNftData,
  spacing,
  useAccountsContext,
  useSolanaNfts,
  type Nft,
  type NftData,
  type SolanaNetworkId,
} from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { NftCard, NftCardSkeleton } from '../NftCard';
import { StateBlock } from '../StateBlock';
import { WarningNotice } from '../WarningNotice';
import { TextButton } from '../Button';
import type { NftsTabProps } from './types';

/**
 * The gap between tiles. A tile's neighbour inside the grid is anatomy, not a
 * seam between components, so it takes the 12 step rather than the component
 * gap of 20 the blocks above the grid sit at (DESIGN.md §Layout).
 */
const GRID_GAP = spacing.md;

/** The component gap a notice above the grid carries to whatever follows. */
const BLOCK_SEAM = spacing.screenGutter;

/**
 * Placeholder tiles shown while the grid loads. Six overflow the fold in a
 * side panel, so the placeholder never reads as a short, finished grid.
 */
const SKELETON_TILES = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

export function NftsTab({
  onNftPress,
  includeSpam = false,
  onScroll,
  contentStyle,
  style,
  className,
  testID = 'nfts-tab',
}: NftsTabProps) {
  const { t } = useTranslation();
  const [accountState] = useAccountsContext();
  const { ready, activeAccount, networkId } = accountState;

  // The grid follows the balance block. A Solana network is the only one with
  // a collectibles surface, and the sub-tab is only offered on Solana, so this
  // is the active network whenever the tab is on screen.
  const activeNetworkId = (networkId ?? 'solana-mainnet') as SolanaNetworkId;

  const ownerAddress = useMemo(
    () => activeAccount?.networksAccounts?.[activeNetworkId]?.[0]?.getReceiveAddress(),
    [activeAccount, activeNetworkId]
  );

  const { nfts, loading, error, partial, refresh } = useSolanaNfts({
    publicKey: ready ? ownerAddress : undefined,
    networkId: activeNetworkId,
    includeSpam,
  });

  const cards = useMemo<NftData[]>(() => (nfts as Nft[]).map(canonicalNftToSolanaNftData), [nfts]);

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
  // A failed load is not "you have no collectibles" — the error state owns
  // that render, so the empty state stays out of it.
  const isEmpty = !loading && !loadError && cards.length === 0;

  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: GRID_GAP,
  };

  return (
    <div
      data-testid={testID}
      className={className}
      onScroll={onScroll}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', ...style }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', ...contentStyle }}>
        {/* Load failure — explicit retry. */}
        {loadError && (
          <StateBlock
            tone="error"
            testID="collectibles-load-error"
            retryTestID="collectibles-retry-button"
            title={t('collectibles.load_error', "Your collectibles couldn't be loaded right now.")}
            onRetry={handleRefresh}
            retryLabel={t('actions.retry', 'Retry')}
            style={{ marginBottom: BLOCK_SEAM }}
          />
        )}

        {/* A short list, not a failed one: the grid below is real, it is just
            missing whatever the failed page held. A warning over live content,
            so it stays a notice rather than a state. */}
        {!loadError && !!partial && (
          <WarningNotice
            tone="warning"
            testID="collectibles-partial-load"
            style={{ marginBottom: BLOCK_SEAM }}
            title={t(
              'collectibles.partial_error',
              'Some of your collectibles could not be loaded. Pull to refresh to try again.'
            )}
            action={
              <TextButton
                onPress={handleRefresh}
                disabled={refreshing}
                testID="collectibles-partial-retry-button"
              >
                {t('actions.retry', 'Retry')}
              </TextButton>
            }
          />
        )}

        {isEmpty && (
          <StateBlock
            tone="empty"
            testID="collectibles-empty"
            title={t('nft.emptyTitle', 'No Collectibles')}
            body={t(
              'nft.emptySubtitle',
              'Your NFTs and Ordinals will appear here once you receive some'
            )}
          />
        )}

        {loading ? (
          // Four lonely tiles read as an empty grid that finished loading, and
          // the shimmer alone is too quiet against this palette to say
          // otherwise. The skeletons fill the fold so the screen looks like a
          // grid arriving rather than a grid that is over.
          <div data-testid="collectibles-loading" style={grid}>
            {SKELETON_TILES.map((key) => (
              <NftCardSkeleton key={key} />
            ))}
          </div>
        ) : (
          cards.length > 0 && (
            <div style={grid}>
              {cards.map((nft) => (
                <NftCard
                  key={nft.mint ?? nft.name}
                  nft={nft}
                  onPress={onNftPress ? () => onNftPress(nft) : undefined}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
