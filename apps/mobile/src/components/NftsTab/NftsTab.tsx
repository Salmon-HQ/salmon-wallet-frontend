/**
 * NftsTab — the NFTs sub-tab of Home: a virtualised two-column grid of the
 * collectibles held on the network the wallet is standing on.
 *
 * One network, one grid. There used to be a mainnet section and a devnet
 * section side by side, gated on Developer Networks; the screen follows the
 * active network now (spec 026 D1), so devnet collectibles appear when — and
 * only when — the carousel is on the devnet page. The environment is said by
 * the chip in the balance block and the header, not by a banner here.
 *
 * It is built from the kit: `SubAccountSelector` in the grid's header block,
 * `StateBlock` for the empty and failed answers, `NftCard` /
 * `NftCardSkeleton` for the tiles. The blocks above the grid sit the component
 * gap (20) apart; inside the grid the tiles sit 12 apart, which is anatomy,
 * not a seam between components.
 */

import {
  canonicalNftToSolanaNftData,
  fontSize,
  spacing,
  getShortAddress,
  s,
  useAccountsContext,
  useSolanaNfts,
  vs,
  type Nft,
  type Semantic,
  type SolanaNetworkId,
} from '@salmon/shared';
import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { NftCard, type NftData } from '../NftCard';
import type { SubAccount } from '../SubAccountSelector';
import { useUnverifiedTokens } from '../../contexts/DeveloperModeContext';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { NftSectionHeader } from './NftSectionHeader';
import { NftsTabHeader } from './NftsTabHeader';
import type { NftsTabProps } from './types';

// ============================================================================
// Constants
// ============================================================================

/**
 * The gap between tiles. A tile's neighbour inside the grid is anatomy, not a
 * seam between components, so it takes the 12 step rather than the component
 * gap of 20 the blocks above the grid sit at (DESIGN.md §Layout).
 */
const GRID_GAP = spacing.md;

/**
 * Skeleton rows shown while the grid loads. Three rows overflow the fold on
 * the shortest supported device, so the placeholder never reads as a short,
 * finished grid.
 */
const SKELETON_ROWS = ['a', 'b', 'c'] as const;

// ============================================================================
// Main Component
// ============================================================================

export function NftsTab({
  contentContainerStyle,
  onScroll,
  scrollEventThrottle,
}: NftsTabProps = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useThemedStyles(stylesFor);
  const { text, accent } = useSemantic();
  const { scrollBottomPadding } = useTabChrome();

  // Which derived account of the active network the grid is showing.
  const [subAccountIndex, setSubAccountIndex] = useState(0);

  const [accountState] = useAccountsContext();
  const { ready, activeAccount, networkId } = accountState;

  // The grid follows the carousel. A Solana network is the only one with a
  // collectibles surface, and the sub-tab is only offered on Solana, so this
  // is the active network whenever the tab is on screen.
  const activeNetworkId = (networkId ?? 'solana-mainnet') as SolanaNetworkId;

  // Spam is its own setting now (spec 026 D4): showing what an airdrop left
  // behind is not the same choice as putting devnet in the carousel.
  const includeSpam = useUnverifiedTokens();

  const subAccounts = useMemo<SubAccount[]>(() => {
    const accounts = activeAccount?.networksAccounts?.[activeNetworkId] ?? [];
    return accounts
      .map((acc, index) =>
        acc ? { index, address: getShortAddress(acc.getReceiveAddress(), 4) ?? '' } : null
      )
      .filter((item): item is SubAccount => item !== null);
  }, [activeAccount, activeNetworkId]);

  const ownerAddress = useMemo(() => {
    const acc = activeAccount?.networksAccounts?.[activeNetworkId]?.[subAccountIndex];
    return acc?.getReceiveAddress();
  }, [activeAccount, activeNetworkId, subAccountIndex]);

  const { nfts, loading, error, partial, refresh } = useSolanaNfts({
    publicKey: ready ? ownerAddress : undefined,
    networkId: activeNetworkId,
    includeSpam,
  });

  const cards = useMemo<NftData[]>(() => (nfts as Nft[]).map(canonicalNftToSolanaNftData), [nfts]);

  // Pull-to-refresh. The local boolean drives the RefreshControl spinner since
  // the hook only exposes initial-load state.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  // Handle NFT press — push the detail screen (spec 019 D7).
  //
  // The route carries the sub-account the card was opened from, because it
  // decides which key would sign a send or a burn; the network is the active
  // one and the detail screen derives it the same way this grid does.
  const handleNftPress = useCallback(
    (nftData: NftData) => {
      const rawNft = (nfts as Nft[]).find((n) => n.mint.address === nftData.mint);
      if (!rawNft) return;
      router.push(`/nft/${rawNft.mint.address}?sub=${subAccountIndex}`);
    },
    [nfts, router, subAccountIndex]
  );

  // The grid is virtualized, so its unit of data is a ROW of two cards rather
  // than a card: the list mounts and unmounts whole items, and a row is what
  // lines up with the two-column layout.
  //
  // This is the whole point of the screen's rewrite. It used to render every
  // NFT inside a plain ScrollView, so a wallet with hundreds of them mounted
  // hundreds of <Image> at once and never unmounted the ones off screen. Each
  // decoded bitmap lives in the Java heap's large-object space, so the heap
  // grew until Android's low-memory killer took the app down mid-scroll — on a
  // 900-NFT wallet, ~145 MB of bitmaps in 200 objects, killed while the user
  // was scrolling. Virtualizing keeps only the visible rows alive.
  const rows = useMemo(() => {
    const built: NftData[][] = [];
    cards.forEach((nft, i) => {
      if (i % 2 === 0) built.push([nft]);
      else built[built.length - 1].push(nft);
    });
    return built;
  }, [cards]);

  const loadError = error !== null;
  // A failed load is not "you have no collectibles" — the error state owns
  // that render, so the empty state stays out of it.
  const isEmpty = !loading && !loadError && cards.length === 0;

  // Loading state - wait for account to be ready
  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accent.ink} />
        <Text style={styles.loadingText}>{t('wallet.loading_wallet', 'Loading wallet...')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={loading ? [] : rows}
        keyExtractor={(row, index) => row[0]?.mint ?? `row-${index}`}
        style={styles.scrollView}
        contentContainerStyle={[
          { paddingBottom: scrollBottomPadding },
          // The Home shell's gutter arrives here, applied last so it wins: the
          // grid rows rendered flush to the left edge because every block
          // inside drew its own padding and the rows drew none (owner, first
          // device run).
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        // The window is what bounds memory: only rows within it stay mounted,
        // so the number of decoded bitmaps alive at once is bounded too.
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={text.primary}
            colors={[accent.ink]}
          />
        }
        ListHeaderComponent={
          <>
            <NftsTabHeader
              loadError={loadError}
              partialLoad={!!partial}
              isEmpty={isEmpty}
              onRetry={handleRefresh}
            />
            <NftSectionHeader
              loading={loading}
              subAccounts={subAccounts}
              activeIndex={subAccountIndex}
              onSelectSubAccount={setSubAccountIndex}
              skeletonRows={SKELETON_ROWS}
              rowStyle={styles.gridRow}
              cardStyle={styles.gridCard}
            />
          </>
        }
        renderItem={({ item: row }) => (
          <View style={styles.gridRow}>
            {row.map((nft) => (
              <NftCard
                key={nft.mint}
                nft={nft}
                onPress={() => handleNftPress(nft)}
                style={styles.gridCard}
              />
            ))}
          </View>
        )}
      />
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: t.text.secondary,
      fontSize: s(fontSize.bodyLg),
      marginTop: vs(spacing.screenGutter),
    },
    scrollView: {
      flex: 1,
      position: 'relative',
      zIndex: 0,
    },
    gridRow: {
      flexDirection: 'row',
      gap: s(GRID_GAP),
      marginBottom: s(GRID_GAP),
    },
    gridCard: {
      flex: 1,
    },
  });
