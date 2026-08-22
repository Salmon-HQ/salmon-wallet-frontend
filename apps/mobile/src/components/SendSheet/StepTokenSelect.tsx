import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon } from '../../icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  componentSizes,
  ContentLoader,
  Rect,
  Circle,
  fontFamilyNative,
  formatTokenAmount,
  ms,
  vs,
  s,
  fontSize,
  borderRadius,
  spacing,
} from '@salmon/shared';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { BlurContainer } from '../BlurContainer';
import { TokenLogo } from '../TokenLogo';
import type { StepTokenSelectProps, SendToken } from './types';

// ============================================================================
// Token Row Component
// ============================================================================

interface TokenRowProps {
  token: SendToken;
  onPress: (token: SendToken) => void;
}

const TokenRow: React.FC<TokenRowProps> = React.memo(({ token, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(token);
  }, [token, onPress]);

  const balanceDisplay = useMemo(() => {
    const amount = typeof token.uiAmount === 'string' ? parseFloat(token.uiAmount) : token.uiAmount;
    if (amount === 0) return `0 ${token.symbol}`;
    // The floor reads in the app's language too — a hardcoded '<0.0001' put an
    // English decimal point next to a Spanish one in the row below it.
    if (amount < 0.0001) return `<${formatTokenAmount(0.0001)} ${token.symbol}`;
    return `${formatTokenAmount(amount)} ${token.symbol}`;
  }, [token.uiAmount, token.symbol]);

  return (
    <TouchableOpacity
      testID={`send-token-row-${token.symbol}`}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`${token.name}, ${balanceDisplay}`}
      accessibilityRole="button"
    >
      <BlurContainer style={styles.tokenRow}>
        {/* Token Logo */}
        <View style={styles.tokenLogoContainer}>
          <TokenLogo uri={token.logo || undefined} symbol={token.symbol} size={ms(32)} />
        </View>

        {/* Token Name */}
        <Text style={styles.tokenName} numberOfLines={1}>
          {token.name}
        </Text>

        {/* Balance */}
        <Text style={styles.tokenBalance} numberOfLines={1}>
          {balanceDisplay}
        </Text>
      </BlurContainer>
    </TouchableOpacity>
  );
});

TokenRow.displayName = 'TokenRow';

// ============================================================================
// Main Component
// ============================================================================

const SKELETON_COUNT = 5;
const SKELETON_ROW_HEIGHT = vs(12) * 2 + ms(32); // paddingVertical * 2 + logo height
const SKELETON_ROW_WIDTH = 280; // approximate inner width

const TokenSelectSkeleton: React.FC = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {/* Search bar skeleton */}
      <BlurContainer style={styles.searchContainer}>
        <ContentLoader
          speed={1.5}
          width={SKELETON_ROW_WIDTH}
          height={vs(20)}
          viewBox={`0 0 ${SKELETON_ROW_WIDTH} ${vs(20)}`}
          backgroundColor={colors.skeleton.base}
          foregroundColor={colors.skeleton.highlight}
          accessibilityLabel={t('accessibility.loading_token_list')}
        >
          <Circle cx={ms(9)} cy={vs(10)} r={ms(9)} />
          <Rect x={ms(24)} y={vs(4)} rx="4" ry="4" width="120" height={vs(12)} />
        </ContentLoader>
      </BlurContainer>

      {/* Section header skeleton */}
      <View style={styles.skeletonHeaderPlaceholder}>
        <ContentLoader
          speed={1.5}
          width={120}
          height={ms(18)}
          viewBox={`0 0 120 ${ms(18)}`}
          backgroundColor={colors.skeleton.base}
          foregroundColor={colors.skeleton.highlight}
        >
          <Rect x="0" y="0" rx="4" ry="4" width="120" height={ms(18)} />
        </ContentLoader>
      </View>

      {/* Token row skeletons */}
      <View style={styles.skeletonList}>
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
    </View>
  );
};

export const StepTokenSelect: React.FC<StepTokenSelectProps> = ({
  tokens,
  onSelectToken,
  showUnverifiedTokens,
  loading,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const topFadeOpacity = useMemo(() => new Animated.Value(0), []);
  const { bottomInset, standardContentBottomPadding } = useBottomSheetChrome();

  // All hooks must be called before any early return (Rules of Hooks)
  const verifiedTokens = useMemo(() => {
    return tokens.filter((token) => {
      const hasMeaningfulTags =
        token.tags && token.tags.length > 0 && token.tags.some((tag) => tag !== 'unknown');
      if (hasMeaningfulTags) return true;
      return !!showUnverifiedTokens;
    });
  }, [tokens, showUnverifiedTokens]);

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return verifiedTokens;
    const query = searchQuery.toLowerCase().trim();
    return verifiedTokens.filter(
      (token) =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
    );
  }, [verifiedTokens, searchQuery]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const opacity = Math.min(offsetY / 30, 1);
      topFadeOpacity.setValue(opacity);
    },
    [topFadeOpacity]
  );

  const renderItem = useCallback(
    ({ item }: { item: SendToken }) => <TokenRow token={item} onPress={onSelectToken} />,
    [onSelectToken]
  );

  const keyExtractor = useCallback((item: SendToken) => item.address, []);

  if (loading) {
    return <TokenSelectSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <BlurContainer style={styles.searchContainer}>
        <MagnifyingGlassIcon
          size={ms(18)}
          color={colors.text.secondary}
          style={styles.searchIcon}
        />
        <TextInput
          testID="send-token-search-input"
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

      {/* Section Header */}
      <Text style={styles.sectionHeader}>{t('wallet.select_token', 'Select Token')}</Text>

      {/* Token List */}
      <View style={styles.listWrapper}>
        <FlatList
          data={filteredTokens}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: standardContentBottomPadding },
          ]}
          scrollIndicatorInsets={{ bottom: bottomInset }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
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
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
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
  sectionHeader: {
    fontSize: ms(fontSize.bodyLg),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    marginBottom: vs(spacing.md),
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
  },
  skeletonHeaderPlaceholder: {
    marginBottom: vs(spacing.md),
  },
  skeletonList: {
    gap: vs(spacing.base),
  },
});

export default StepTokenSelect;
