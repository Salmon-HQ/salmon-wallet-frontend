import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  type ListRenderItem,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import {
  useTokenSearch,
  colors,
  componentSizes,
  spacing,
  borderRadius,
  ContentLoader,
  Rect,
  Circle,
  formatTokenAmount,
  getShortAddress,
  getTokenKey,
  fontFamilyNative,
  fontSize,
  fontWeight,
  tabularNums,
  ms,
  vs,
  s,
} from '@salmon/shared';
import { MagnifyingGlassIcon } from '../../icons';
import { BitcoinSvgIcon, EthereumSvgIcon } from '../Icon/SvgIcons';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { BottomSheetTitleHeader } from '../BottomSheetTitleHeader';
import { BlurContainer } from '../BlurContainer';
import { TokenLogo } from '../TokenLogo';
import type { TokenSelectorToken, TokenSelectorModalProps } from './types';

const HIDDEN_VALUE = '******';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable array, so spread once here.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

// Skeleton geometry mirrors the token rows it stands in for
// (same idiom as SendSheet's StepTokenSelect).
const SKELETON_COUNT = 5;
const SKELETON_ROW_HEIGHT = vs(12) * 2 + ms(32); // paddingVertical * 2 + logo height
const SKELETON_ROW_WIDTH = 280; // approximate inner width

// Chain identity on token rows. Mainnet is the silent default: Solana rows
// carry no marker at all (in a Solana-first wallet the chip is redundant on
// every row), and a non-Solana mainnet token gets only its quiet chain mark —
// the same glyphs BalanceCard and DerivedAccountCard use for chain identity.
// Anything that is NOT mainnet keeps the loud text chip, so a devnet/testnet
// token can never be mistaken for a mainnet one in developer mode.
const CHAIN_MARKS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  bitcoin: BitcoinSvgIcon,
  ethereum: EthereumSvgIcon,
};

const NetworkIdentity: React.FC<{ network: string }> = ({ network }) => {
  // Network values arrive either as canonical ids ('bitcoin-mainnet',
  // 'solana-devnet') or as bare chain names ('Bitcoin') from the swap logic's
  // chain fallback; a bare chain name carries no environment, so it counts as
  // mainnet.
  const [chain, env] = network.toLowerCase().split('-');
  if (env && env !== 'mainnet') {
    return (
      <View style={styles.networkChip}>
        <Text style={styles.networkChipText}>{network.toUpperCase()}</Text>
      </View>
    );
  }
  const Mark = CHAIN_MARKS[chain];
  if (!Mark) return null;
  return (
    <View style={styles.chainMark} testID={`chain-mark-${chain}`}>
      <Mark size={ms(14)} color={colors.text.tertiary} />
    </View>
  );
};

const TokenListSkeleton: React.FC = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.skeletonList} accessibilityLabel={t('accessibility.loading_token_list')}>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <BlurContainer key={i} style={styles.tokenRow}>
          <ContentLoader
            speed={1.5}
            width={SKELETON_ROW_WIDTH}
            height={SKELETON_ROW_HEIGHT}
            viewBox={`0 0 ${SKELETON_ROW_WIDTH} ${SKELETON_ROW_HEIGHT}`}
            backgroundColor={colors.skeleton.base}
            foregroundColor={colors.skeleton.highlight}
          >
            <Circle cx={ms(16)} cy={SKELETON_ROW_HEIGHT / 2} r={ms(16)} />
            <Rect
              x={ms(40)}
              y={SKELETON_ROW_HEIGHT / 2 - ms(8)}
              rx="4"
              ry="4"
              width="100"
              height={ms(16)}
            />
            <Rect
              x={SKELETON_ROW_WIDTH - 80}
              y={SKELETON_ROW_HEIGHT / 2 - ms(8)}
              rx="4"
              ry="4"
              width="70"
              height={ms(16)}
            />
          </ContentLoader>
        </BlurContainer>
      ))}
    </View>
  );
};

/**
 * Modal component for selecting tokens.
 *
 * Mounts through BottomSheetContainer like every other sheet in the app, so
 * dismissal is the shared vocabulary: drag handle, backdrop tap, Android back.
 */
export function TokenSelectorModal({
  visible,
  onClose,
  tokens,
  featuredTokens,
  onSelect,
  onSearch,
  hiddenBalance = false,
  showNetworkChip = false,
  showVerifiedDisclaimer = false,
  loading = false,
  showBalances = true,
}: TokenSelectorModalProps & {
  /**
   * Whether rows show the user's holdings. The You Send selector keeps them
   * (they're load-bearing there); the You Receive selector hides them —
   * how much you already hold is noise when choosing what to receive.
   * Mobile-local prop until another platform needs it.
   */
  showBalances?: boolean;
}): React.ReactElement {
  const { t } = useTranslation();
  const topFadeOpacity = useMemo(() => new Animated.Value(0), []);
  const { standardContentBottomPadding } = useBottomSheetChrome();

  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    paginatedTokens,
    hasMore,
    loadMore,
    reset,
    retry,
    isError,
  } = useTokenSearch(tokens, onSearch);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSelect = useCallback(
    (token: TokenSelectorToken) => {
      onSelect(token);
      reset();
    },
    [onSelect, reset]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      topFadeOpacity.setValue(Math.min(offsetY / 30, 1));
    },
    [topFadeOpacity]
  );

  const renderTokenItem: ListRenderItem<TokenSelectorToken> = useCallback(
    ({ item: token }) => {
      const tokenName = token.name || getShortAddress(token.mint || token.address);
      // With balances hidden the right column falls back to the symbol alone —
      // identity stays, holdings go.
      const balanceText =
        showBalances && token.uiAmount
          ? `${hiddenBalance ? HIDDEN_VALUE : formatTokenAmount(token.uiAmount)} ${token.symbol || ''}`
          : token.symbol || '';

      return (
        <TouchableOpacity
          testID={`token-row-${token.symbol}`}
          accessibilityRole="button"
          accessibilityLabel={
            token.network
              ? t('accessibility.token_on_network', {
                  token: tokenName,
                  network: token.network,
                })
              : tokenName
          }
          onPress={() => handleSelect(token)}
          activeOpacity={0.7}
        >
          <BlurContainer style={styles.tokenRow}>
            <View style={styles.tokenLogoContainer}>
              <TokenLogo uri={token.logo || undefined} symbol={token.symbol} size={ms(32)} />
            </View>
            <Text style={styles.tokenName} numberOfLines={1}>
              {tokenName}
            </Text>
            {showNetworkChip && token.network && <NetworkIdentity network={token.network} />}
            <Text style={styles.tokenBalance} numberOfLines={1}>
              {balanceText}
            </Text>
          </BlurContainer>
        </TouchableOpacity>
      );
    },
    [handleSelect, hiddenBalance, showNetworkChip, showBalances, t]
  );

  const renderFeaturedTokens = useCallback(() => {
    if (!featuredTokens || featuredTokens.length === 0 || searchQuery.length >= 3) {
      return null;
    }

    return (
      <View style={styles.featuredContainer}>
        {featuredTokens.map((token) => (
          <TouchableOpacity
            key={getTokenKey(token)}
            style={styles.featuredToken}
            onPress={() => handleSelect(token)}
            activeOpacity={0.7}
          >
            <TokenLogo uri={token.logo || undefined} symbol={token.symbol} size={48} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [featuredTokens, searchQuery, handleSelect]);

  const renderHeader = useCallback(() => {
    return (
      <View>
        {showVerifiedDisclaimer && searchQuery.length < 3 && (
          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimerText}>
              {t('swap.showing_verified_tokens', 'Showing verified tokens only')}
            </Text>
          </View>
        )}
        {isSearching && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="small" color={colors.text.secondary} />
            <Text style={styles.searchingText}>{t('actions.searching', 'Searching...')}</Text>
          </View>
        )}
        {renderFeaturedTokens()}
      </View>
    );
  }, [showVerifiedDisclaimer, searchQuery, isSearching, t, renderFeaturedTokens]);

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;

    return (
      <TouchableOpacity onPress={loadMore} activeOpacity={0.7} accessibilityRole="button">
        <BlurContainer style={[styles.tokenRow, styles.loadMoreRow]}>
          <Text style={styles.loadMoreText}>{t('actions.view_more', 'View More')}</Text>
        </BlurContainer>
      </TouchableOpacity>
    );
  }, [hasMore, loadMore, t]);

  const renderEmpty = useCallback(() => {
    if (isSearching) return null;

    if (isError) {
      return (
        <View style={styles.emptyContainer} testID="token-search-error">
          <Text style={styles.emptyText}>{t('wallet.token_search_failed')}</Text>
          <TouchableOpacity
            onPress={retry}
            activeOpacity={0.7}
            testID="token-search-retry-button"
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>{t('transactions.tapToRetry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('wallet.no_tokens_found', 'No tokens found')}</Text>
      </View>
    );
  }, [isSearching, isError, retry, t]);

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={handleClose}
      headerContent={<BottomSheetTitleHeader title={t('wallet.select_token', 'Select Token')} />}
      testID="token-selector-modal"
    >
      <View style={styles.content}>
        <BlurContainer style={styles.searchContainer}>
          <MagnifyingGlassIcon
            size={ms(18)}
            color={colors.text.secondary}
            style={styles.searchIcon}
          />
          <TextInput
            testID="token-search-input"
            style={styles.searchInput}
            placeholder={t('actions.search_placeholder', 'Search...')}
            placeholderTextColor={colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </BlurContainer>

        {loading ? (
          <TokenListSkeleton />
        ) : (
          <View style={styles.listWrapper}>
            <FlatList
              data={paginatedTokens}
              keyExtractor={getTokenKey}
              renderItem={renderTokenItem}
              ListHeaderComponent={renderHeader}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: standardContentBottomPadding },
              ]}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              // Without this, a tap on a result while the search input still
              // holds focus is spent dismissing the keyboard instead of
              // selecting the token, so searching always costs two taps.
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />

            {/* Top fade gradient */}
            <Animated.View
              style={[styles.topFadeGradient, { opacity: topFadeOpacity }]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={[colors.background.secondary, 'transparent']}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        )}
      </View>
    </BottomSheetContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: s(spacing.headerPadding),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(borderRadius.md),
    paddingHorizontal: s(spacing.lg),
    minHeight: vs(componentSizes.tokenIcon),
    paddingVertical: vs(spacing.xs),
    marginBottom: vs(spacing.headerPadding),
  },
  searchIcon: {
    marginRight: s(spacing.sm),
  },
  searchInput: {
    flex: 1,
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    gap: vs(spacing.base),
  },
  topFadeGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: componentSizes.sheetFadeGradientHeight,
    zIndex: 1,
  },
  skeletonList: {
    gap: vs(spacing.base),
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(borderRadius.badge),
    paddingVertical: vs(spacing.md),
    paddingHorizontal: s(spacing.md),
  },
  tokenLogoContainer: {
    marginRight: s(spacing.md),
  },
  tokenName: {
    flex: 1,
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.balance,
  },
  tokenBalance: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.balance,
    marginLeft: s(spacing.sm),
    ...TABULAR,
  },
  chainMark: {
    marginLeft: s(spacing.sm),
  },
  networkChip: {
    backgroundColor: `${colors.border.default}CC`,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: spacing.xxs,
    marginLeft: s(spacing.sm),
  },
  networkChipText: {
    color: colors.text.secondary,
    fontSize: fontSize.xs,
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
  },
  featuredContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: vs(spacing.lg),
    marginBottom: vs(spacing.sm),
  },
  featuredToken: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(spacing.sm),
  },
  loadMoreRow: {
    justifyContent: 'center',
  },
  loadMoreText: {
    color: colors.text.primary,
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
  },
  disclaimerContainer: {
    alignItems: 'center',
    paddingVertical: vs(spacing.sm),
  },
  disclaimerText: {
    color: colors.text.secondary,
    fontSize: ms(fontSize.sm),
    textAlign: 'center',
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(spacing.md),
  },
  searchingText: {
    color: colors.text.secondary,
    fontSize: ms(fontSize.base),
    marginLeft: s(spacing.sm),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: vs(spacing['3xl']),
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: ms(fontSize.bodyLg),
  },
  retryText: {
    color: colors.accent.primary,
    fontSize: ms(fontSize.bodyLg),
    fontFamily: fontFamilyNative.medium,
    marginTop: vs(spacing.md),
    padding: s(spacing.sm),
  },
});
