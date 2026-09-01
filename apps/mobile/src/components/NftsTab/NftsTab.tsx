/**
 * NftsTab - NFT Gallery (Netflix-Style)
 *
 * Displays NFTs grouped by blockchain in horizontal carousels.
 * - Always shows mainnet NFTs for all blockchains
 * - When developer mode is enabled, also shows devnet/testnet NFTs
 *
 * Features:
 * - Pull-to-refresh
 * - Loading skeleton state
 * - Empty state
 * - "See All" sheets for each blockchain
 * - Parallel multi-chain fetching
 * - Developer mode support for test networks
 */

import {
  SECTION_TO_NETWORK as SHARED_SECTION_TO_NETWORK,
  canonicalNftToSolanaNftData,
  borderRadius,
  colors,
  fontFamilyNative,
  fontSize,
  spacing,
  getNftSectionTitle,
  getShortAddress,
  ms,
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
  TouchableOpacity,
  View,
} from 'react-native';
import { NftCard, NftCardSkeleton, type NftBlockchain, type NftData } from '../NftCard';
import { SolanaSvgIcon } from '../Icon';
import { SubAccountSelector, type SubAccount } from '../SubAccountSelector';
import { WarningNotice } from '../WarningNotice';
import { useDeveloperMode } from '../../contexts/DeveloperModeContext';
import { useTabChrome } from '../../../hooks/useTabChrome';
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

// Grid layout constants (matching NftSeeAllSheet pattern)
const GRID_GAP = s(18);

// ============================================================================
// Main Component
// ============================================================================

/**
 * Skeleton rows shown while a section loads. Three rows overflow the fold on
 * the shortest supported device, so the placeholder never reads as a short,
 * finished grid.
 */
const SKELETON_ROWS = ['a', 'b', 'c'] as const;

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

  // Get account context
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
  const visibleSectionKeys = useMemo<NftSectionKey[]>(() => {
    if (developerNetworks) {
      return ['solana', 'solana-devnet'];
    }
    return ['solana'];
  }, [developerNetworks]);

  // Sections that actually paint. Mainnet and devnet count as two distinct
  // chains: same base chain, different networks and different assets, and a
  // devnet NFT is worthless — collapsing the label there would present the
  // two as interchangeable, which is the confusion the label exists to
  // prevent. Devnet only appears once Developer Networks is on, so that user
  // has already opted into the distinction.
  //
  // Derived from data the screen already holds; no hook, service or network
  // call is involved.
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

  // Check if Solana section is loading
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
        <ActivityIndicator size="large" color={colors.accent.primary} />
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
          styles.scrollContent,
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
            tintColor={colors.text.primary}
            colors={[colors.accent.primary]}
          />
        }
        ListHeaderComponent={
          <>
            {/* Home's balance block on the NFTs sub-tab. It is the list's
                header rather than a pinned sibling, so it scrolls away with
                the grid while the sub-tab row above stays reachable — and the
                grid keeps being the screen's only scroll view. */}
            {listHeader}

            {/* The visible "My Collectibles" heading sat directly under the
                Collectibles tab, repeating a label the user had just tapped. It is
                not deleted, only unpainted: React Native has no DOM and therefore
                no `visuallyHidden` clip rectangle, so the platform equivalent is a
                1x1 transparent node that stays in the accessibility tree with
                `accessibilityRole="header"`. Screen-reader users keep a heading to
                orient by; the eye gets ~78px of vertical chrome back. Zero width
                or `display: none` would drop it from the tree on Android, which is
                why the box is 1x1 rather than 0x0. */}
            <Text
              style={styles.assistiveHeading}
              accessibilityRole="header"
              importantForAccessibility="yes"
            >
              {t('wallet.my_nfts', 'My Collectibles')}
            </Text>

            {/* Developer Mode Banner */}
            {developerNetworks && (
              <View style={styles.devModeBanner}>
                <Text style={styles.devModeBannerText}>
                  {t('collectibles.developer_banner', 'Developer Mode - Showing testnet NFTs')}
                </Text>
              </View>
            )}

            {/* Load failure banner — explicit retry (pull-to-refresh also works) */}
            {loadError && (
              <View style={styles.loadErrorBanner} testID="collectibles-load-error">
                <WarningNotice
                  tone="warning"
                  title={t(
                    'collectibles.load_error',
                    "Your collectibles couldn't be loaded right now."
                  )}
                  action={
                    <TouchableOpacity
                      onPress={handleRefresh}
                      accessibilityRole="button"
                      testID="collectibles-retry-button"
                    >
                      <Text style={styles.retryText}>{t('actions.retry', 'Retry')}</Text>
                    </TouchableOpacity>
                  }
                />
              </View>
            )}

            {/* A short list, not a failed one: the grid below is real, it is
                just missing whatever the failed page held. */}
            {!loadError && partialLoad && (
              <View style={styles.loadErrorBanner} testID="collectibles-partial-load">
                <WarningNotice
                  tone="warning"
                  title={t(
                    'collectibles.partial_error',
                    'Some of your collectibles could not be loaded. Pull to refresh to try again.'
                  )}
                  action={
                    <TouchableOpacity
                      onPress={handleRefresh}
                      accessibilityRole="button"
                      testID="collectibles-partial-retry-button"
                    >
                      <Text style={styles.retryText}>{t('actions.retry', 'Retry')}</Text>
                    </TouchableOpacity>
                  }
                />
              </View>
            )}

            {/* Empty State */}
            {isEmpty && (
              <View style={styles.emptyContainer} testID="collectibles-empty">
                <Text style={styles.emptyText}>{t('nft.emptyTitle', 'No Collectibles')}</Text>
                <Text style={styles.emptySubtext}>
                  {t(
                    'nft.emptySubtitle',
                    'Your NFTs and Ordinals will appear here once you receive some'
                  )}
                </Text>
              </View>
            )}
          </>
        }
        renderSectionHeader={({ section }) => {
          const sectionKey = section.key;
          const nftSection = section.section;
          const title = getNftSectionTitle(sectionKey, nftSection);
          const subAccounts = sectionSubAccounts[sectionKey] ?? [];

          return (
            <View style={styles.sectionHeaderBlock}>
              {showChainLabel && (
                <View style={styles.sectionHeader}>
                  <SolanaSvgIcon size={ms(24)} color={colors.text.primary} />
                  <Text style={styles.sectionHeaderTitle}>{title}</Text>
                  <Text style={styles.sectionHeaderCount}>({nftSection.nfts.length})</Text>
                </View>
              )}
              <SubAccountSelector
                accounts={subAccounts}
                activeIndex={sectionIndexes[sectionKey]}
                onSelect={(index) => handleSectionIndexChange(sectionKey, index)}
                style={styles.sectionSelector}
              />
              {nftSection.loading && (
                <View testID="collectibles-loading">
                  {/* Four lonely cards read as an empty grid that finished
                      loading, and the shimmer alone is too quiet against this
                      palette to say otherwise. The skeletons fill the fold so
                      the screen looks like a grid arriving rather than a grid
                      that is over — the grid itself is the loading signal. */}
                  <View>
                    {SKELETON_ROWS.map((rowKey) => (
                      <View key={rowKey} style={styles.gridRow}>
                        <NftCardSkeleton style={styles.gridCard} />
                        <NftCardSkeleton style={styles.gridCard} />
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        }}
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
    fontSize: ms(fontSize.bodyLg),
    marginTop: vs(spacing.lg),
  },
  scrollView: {
    flex: 1,
    position: 'relative',
    zIndex: 0,
  },
  scrollContent: {},
  /** Present to assistive tech, absent to the eye. See the render comment. */
  assistiveHeading: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  devModeBanner: {
    backgroundColor: colors.accent.tint,
    borderWidth: 1,
    borderColor: colors.accent.border,
    borderRadius: ms(borderRadius.md),
    paddingVertical: vs(spacing.sm),
    paddingHorizontal: s(spacing.md),
    marginBottom: vs(spacing.lg),
  },
  devModeBannerText: {
    fontFamily: fontFamilyNative.medium,
    fontSize: ms(fontSize.sm),
    color: colors.accent.primary,
    textAlign: 'center',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(48),
    paddingHorizontal: s(24),
    marginTop: vs(40),
  },
  emptyText: {
    fontFamily: fontFamilyNative.semiBold,
    fontSize: ms(fontSize.lg),
    fontWeight: '600',
    color: semantic.text.secondary,
    marginBottom: vs(spacing.sm),
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: fontFamilyNative.regular,
    fontSize: ms(fontSize.base),
    color: colors.text.disabled,
    textAlign: 'center',
  },
  sectionSelector: {
    marginBottom: vs(8),
  },
  loadErrorBanner: {
    marginBottom: vs(spacing.lg),
  },
  retryText: {
    fontFamily: fontFamilyNative.semiBold,
    fontSize: ms(fontSize.sm),
    color: colors.accent.primary,
  },
  // Grid layout styles (matching NftSeeAllSheet pattern)
  sectionContainer: {
    marginBottom: vs(16),
  },
  // The section header block carries what used to be the top of
  // `sectionContainer`: the chain label, the sub-account selector, and the
  // skeletons while the section loads.
  sectionHeaderBlock: {
    marginBottom: vs(8),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: vs(8),
  },
  sectionHeaderTitle: {
    fontFamily: fontFamilyNative.semiBold,
    fontSize: ms(16),
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  sectionHeaderCount: {
    fontFamily: fontFamilyNative.regular,
    fontSize: ms(13),
    color: colors.text.secondary,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GRID_GAP,
  },
  gridCard: {
    flex: 1,
    maxWidth: `${(100 - 2) / 2}%`,
  },
});
