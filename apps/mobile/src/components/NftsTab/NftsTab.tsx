/**
 * NftsTab — the NFTs sub-tab of Home: a virtualised two-column grid of
 * collectibles, grouped by chain section (mainnet, plus devnet when Developer
 * Networks is on).
 *
 * It is built from the kit: `Card` for the developer banner, `SectionLabel`
 * for the chain headings, `StateBlock` for the empty and failed answers,
 * `NftCard` / `NftCardSkeleton` for the tiles. The blocks above the grid sit
 * the component gap (20) apart; inside the grid the tiles sit 12 apart,
 * which is anatomy, not a seam between components.
 */

import {
  SECTION_TO_NETWORK as SHARED_SECTION_TO_NETWORK,
  canonicalNftToSolanaNftData,
  fontSize,
  spacing,
  getNftSectionTitle,
  getShortAddress,
  s,
  useAccountsContext,
  useSolanaNfts,
  vs,
  type Nft,
  semantic,
} from '@salmon/shared';
import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { NftCard, type NftBlockchain, type NftData } from '../NftCard';
import type { SubAccount } from '../SubAccountSelector';
import { useDeveloperMode } from '../../contexts/DeveloperModeContext';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { NftSectionHeader } from './NftSectionHeader';
import { NftsTabHeader } from './NftsTabHeader';
import type { NftSectionKey, NftSection, NftsTabProps } from './types';

// ============================================================================
// Constants
// ============================================================================

const SECTION_TO_NETWORK = SHARED_SECTION_TO_NETWORK;

const INITIAL_SECTION_INDEXES: Record<NftSectionKey, number> = {
  solana: 0,
  'solana-devnet': 0,
};

const SECTION_META: Record<
  NftSectionKey,
  { blockchain: NftBlockchain; isTestnet: boolean; networkLabel?: string }
> = {
  solana: { blockchain: 'solana', isTestnet: false },
  'solana-devnet': { blockchain: 'solana', isTestnet: true },
};

/**
 * The gap between tiles. A tile's neighbour inside the grid is anatomy, not a
 * seam between components, so it takes the 12 step rather than the component
 * gap of 20 the blocks above the grid sit at (DESIGN.md §Layout).
 */
const GRID_GAP = spacing.md;

/**
 * Skeleton rows shown while a section loads. Three rows overflow the fold on
 * the shortest supported device, so the placeholder never reads as a short,
 * finished grid.
 */
const SKELETON_ROWS = ['a', 'b', 'c'] as const;

// ============================================================================
// Main Component
// ============================================================================

export function NftsTab({
  listHeader,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle,
}: NftsTabProps = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { scrollBottomPadding } = useTabChrome();

  // Per-section sub-account index (each blockchain section can pick its own derived account)
  const [sectionIndexes, setSectionIndexes] =
    useState<Record<NftSectionKey, number>>(INITIAL_SECTION_INDEXES);

  const [accountState] = useAccountsContext();
  const { ready, activeAccount } = accountState;

  // Developer mode — shared via context from _layout.tsx (single source of truth)
  const developerNetworks = useDeveloperMode();

  // Build sub-account lists per section for the SubAccountSelector
  const sectionSubAccounts = useMemo(() => {
    if (!activeAccount) return {} as Record<NftSectionKey, SubAccount[]>;

    const result = {} as Record<NftSectionKey, SubAccount[]>;
    for (const [sectionKey, networkId] of Object.entries(SECTION_TO_NETWORK)) {
      const accounts = activeAccount.networksAccounts?.[networkId] ?? [];
      result[sectionKey as NftSectionKey] = accounts
        .map((acc, idx) =>
          acc
            ? {
                index: idx,
                address: getShortAddress(acc.getReceiveAddress(), 4) ?? '',
              }
            : null
        )
        .filter((item): item is SubAccount => item !== null);
    }
    return result;
  }, [activeAccount]);

  // Handle sub-account change per section → triggers refetch
  const handleSectionIndexChange = useCallback((sectionKey: NftSectionKey, index: number) => {
    setSectionIndexes((prev) => ({ ...prev, [sectionKey]: index }));
  }, []);

  // Resolve owner addresses per section (subject to subaccount selection)
  const solanaMainnetAddress = useMemo(() => {
    const acc = activeAccount?.networksAccounts?.['solana-mainnet']?.[sectionIndexes['solana']];
    return acc?.getReceiveAddress();
  }, [activeAccount, sectionIndexes]);

  const solanaDevnetAddress = useMemo(() => {
    const acc =
      activeAccount?.networksAccounts?.['solana-devnet']?.[sectionIndexes['solana-devnet']];
    return acc?.getReceiveAddress();
  }, [activeAccount, sectionIndexes]);

  const includeSpam = !!developerNetworks;

  // Per-section NFT queries — each section has its own subaccount + network.
  // Developer mode opts the BE out of its blacklisted / spamScore>0 filter
  // via ?includeSpam=true.
  const mainnetQuery = useSolanaNfts({
    publicKey: ready ? solanaMainnetAddress : undefined,
    networkId: 'solana-mainnet',
    includeSpam,
  });

  const devnetQuery = useSolanaNfts({
    publicKey: ready && developerNetworks ? solanaDevnetAddress : undefined,
    networkId: 'solana-devnet',
    includeSpam,
    enabled: developerNetworks,
  });

  // Build sections from queries
  const nftsBySections = useMemo<Record<NftSectionKey, NftSection>>(() => {
    return {
      solana: {
        nfts: mainnetQuery.nfts.map(canonicalNftToSolanaNftData),
        raw: mainnetQuery.nfts,
        loading: mainnetQuery.loading,
        blockchain: SECTION_META.solana.blockchain,
        isTestnet: SECTION_META.solana.isTestnet,
      },
      'solana-devnet': {
        nfts: developerNetworks ? devnetQuery.nfts.map(canonicalNftToSolanaNftData) : [],
        raw: developerNetworks ? devnetQuery.nfts : [],
        loading: developerNetworks ? devnetQuery.loading : false,
        blockchain: SECTION_META['solana-devnet'].blockchain,
        isTestnet: SECTION_META['solana-devnet'].isTestnet,
        networkLabel: t('general.network_devnet', 'Devnet'),
      },
    };
  }, [
    mainnetQuery.nfts,
    mainnetQuery.loading,
    devnetQuery.nfts,
    devnetQuery.loading,
    developerNetworks,
    t,
  ]);

  // Pull-to-refresh — refetches both queries. Local boolean drives the
  // RefreshControl spinner since the hook only exposes initial-load state.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        mainnetQuery.refresh(),
        developerNetworks ? devnetQuery.refresh() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [mainnetQuery, devnetQuery, developerNetworks]);

  // Handle NFT press — push the detail screen (spec 019 D7).
  //
  // The route carries the section and the sub-account the card was opened
  // from, because those two decide which account owns the NFT and therefore
  // which key would sign a send or a burn. The screen's provider resolves the
  // mint against the very query this grid already populated.
  const handleNftPress = useCallback(
    (nftData: NftData, sectionKey: NftSectionKey) => {
      const section = nftsBySections[sectionKey];
      if (section.blockchain !== 'solana') return;
      const rawNft = (section.raw as Nft[]).find((n) => n.mint.address === nftData.mint);
      if (!rawNft) return;

      router.push(
        `/nft/${rawNft.mint.address}?section=${sectionKey}&sub=${sectionIndexes[sectionKey] ?? 0}`
      );
    },
    [nftsBySections, router, sectionIndexes]
  );

  // Get ordered section keys to display (Solana only)
  const visibleSectionKeys = useMemo<NftSectionKey[]>(
    () => (developerNetworks ? ['solana', 'solana-devnet'] : ['solana']),
    [developerNetworks]
  );

  // Sections that actually paint. Mainnet and devnet count as two distinct
  // chains: same base chain, different networks and different assets, and a
  // devnet NFT is worthless — collapsing the label there would present the
  // two as interchangeable, which is the confusion the label exists to
  // prevent. Devnet only appears once Developer Networks is on, so that user
  // has already opted into the distinction.
  const renderedSectionKeys = useMemo(
    () =>
      visibleSectionKeys.filter(
        (key) => nftsBySections[key].loading || nftsBySections[key].nfts.length > 0
      ),
    [visibleSectionKeys, nftsBySections]
  );
  const showChainLabel = renderedSectionKeys.length > 1;

  // The grid is virtualized, so its unit of data is a ROW of two cards rather
  // than a card: SectionList mounts and unmounts whole items, and a row is what
  // lines up with the two-column layout.
  //
  // This is the whole point of the screen's rewrite. It used to render every
  // NFT inside a plain ScrollView, so a wallet with hundreds of them mounted
  // hundreds of <Image> at once and never unmounted the ones off screen. Each
  // decoded bitmap lives in the Java heap's large-object space, so the heap
  // grew until Android's low-memory killer took the app down mid-scroll — on a
  // 900-NFT wallet, ~145 MB of bitmaps in 200 objects, killed while the user
  // was scrolling. Virtualizing keeps only the visible rows alive.
  const listSections = useMemo(
    () =>
      renderedSectionKeys.map((sectionKey) => {
        const section = nftsBySections[sectionKey];
        const rows: NftData[][] = [];
        section.nfts.forEach((nft, i) => {
          if (i % 2 === 0) rows.push([nft]);
          else rows[rows.length - 1].push(nft);
        });
        return { key: sectionKey, section, data: section.loading ? [] : rows };
      }),
    [renderedSectionKeys, nftsBySections]
  );

  const isLoading = nftsBySections.solana.loading;

  // Load failure on any visible section — keep partial data visible.
  const loadError =
    mainnetQuery.error !== null || (developerNetworks && devnetQuery.error !== null);
  // Some pages arrived and a later one did not. The list renders, but it is
  // short, and saying so is the difference between resilient and quietly wrong.
  const partialLoad = mainnetQuery.partial || (developerNetworks && devnetQuery.partial);

  // Check if all visible sections are empty (after loading).
  // A failed load is not "you have no collectibles" — the error state owns
  // that render, so the empty state stays out of it.
  const isEmpty = useMemo(() => {
    if (isLoading || loadError) return false;
    return visibleSectionKeys.every((key) => nftsBySections[key].nfts.length === 0);
  }, [isLoading, loadError, visibleSectionKeys, nftsBySections]);

  // Loading state - wait for account to be ready
  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={semantic.accent.ink} />
        <Text style={styles.loadingText}>{t('wallet.loading_wallet', 'Loading wallet...')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={listSections}
        keyExtractor={(row, index) => row[0]?.mint ?? `row-${index}`}
        style={styles.scrollView}
        contentContainerStyle={[
          { paddingBottom: scrollBottomPadding },
          // The top padding is the host screen's to give (Home passes the same
          // `contentTopOffset` the Portfolio tab uses). Computing a second one
          // here shifted the balance by ~12dp when the user switched sub-tabs.
          // The Home shell's gutter arrives the same way, applied last so it
          // wins: the grid rows rendered flush to the left edge because every
          // block inside drew its own padding and the rows drew none (owner,
          // first device run).
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
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
            tintColor={semantic.text.primary}
            colors={[semantic.accent.ink]}
          />
        }
        ListHeaderComponent={
          <NftsTabHeader
            listHeader={listHeader}
            developerMode={!!developerNetworks}
            loadError={!!loadError}
            partialLoad={!!partialLoad}
            isEmpty={isEmpty}
            onRetry={handleRefresh}
          />
        }
        renderSectionHeader={({ section }) => (
          <NftSectionHeader
            title={showChainLabel ? getNftSectionTitle(section.key, section.section) : undefined}
            count={section.section.nfts.length}
            loading={section.section.loading}
            subAccounts={sectionSubAccounts[section.key] ?? []}
            activeIndex={sectionIndexes[section.key]}
            onSelectSubAccount={(index) => handleSectionIndexChange(section.key, index)}
            skeletonRows={SKELETON_ROWS}
            rowStyle={styles.gridRow}
            cardStyle={styles.gridCard}
          />
        )}
        renderItem={({ item: row, section }) => (
          <View style={styles.gridRow}>
            {row.map((nft) => (
              <NftCard
                key={nft.mint}
                nft={nft}
                onPress={() => handleNftPress(nft, section.key)}
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

const styles = StyleSheet.create({
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
    color: semantic.text.secondary,
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
