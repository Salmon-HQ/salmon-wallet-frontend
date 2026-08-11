import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { ContentLoader, Rect } from '@salmon/shared';
import {
  colors,
  ms,
  vs,
  s,
  fontFamilyNative,
  fontSize,
  borderRadius,
  spacing,
} from '@salmon/shared';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { TokenListItem } from '../TokenList';
import { PriceChart } from '../PriceChart';
import { TokenMarketData } from './TokenMarketData';
import { TokenAbout } from './TokenAbout';
import { TokenBadgesSection } from './TokenBadgesSection';
import type { TokenInformationSheetProps } from './types';

/**
 * TokenListItem skeleton for loading state
 */
const TokenListItemSkeleton: React.FC = () => {
  return (
    <View style={styles.tokenItemSkeletonContainer}>
      <ContentLoader
        speed={1.5}
        width="100%"
        height={60}
        backgroundColor={colors.skeleton.base}
        foregroundColor={colors.skeleton.highlight}
      >
        {/* Logo circle */}
        <Rect x="12" y="12" rx="18" ry="18" width="36" height="36" />
        {/* Token name */}
        <Rect x="60" y="12" rx="4" ry="4" width="100" height="14" />
        {/* Price info */}
        <Rect x="60" y="34" rx="4" ry="4" width="80" height="12" />
        {/* USD value (right side) */}
        <Rect x="85%" y="12" rx="4" ry="4" width="15%" height="16" />
        {/* Token amount (right side) */}
        <Rect x="85%" y="34" rx="4" ry="4" width="15%" height="12" />
      </ContentLoader>
    </View>
  );
};

/**
 * TokenInformationSheet - Bottom sheet modal for token details
 *
 * Features:
 * - Slide-up animation from bottom
 * - Rounded top corners with border
 * - Drag handle indicator
 * - Title header
 * - ScrollView with token information components
 * - Loading skeleton states
 * - Backdrop with tap-to-dismiss
 *
 * @example
 * ```tsx
 * <TokenInformationSheet
 *   visible={isVisible}
 *   onClose={() => setIsVisible(false)}
 *   token={selectedToken}
 *   chartData={priceData}
 *   chartPeriod="1M"
 *   onChartPeriodChange={setPeriod}
 *   coinInfo={coinInfo}
 *   marketData={marketData}
 *   loading={false}
 * />
 * ```
 */
export const TokenInformationSheet: React.FC<TokenInformationSheetProps> = ({
  visible,
  onClose,
  token,
  blockchain = 'solana',
  chartData,
  chartPeriod,
  onChartPeriodChange,
  coinInfo,
  marketData,
  loading = false,
  style,
}) => {
  const { t } = useTranslation();
  // Top fade gradient opacity (driven by scroll offset)
  const topFadeOpacity = useMemo(() => new Animated.Value(0), []);
  const { bottomInset, standardContentBottomPadding } = useBottomSheetChrome();

  // Handle token press (no-op for display purposes)
  const handleTokenPress = useCallback(() => {
    // No action needed - token is already selected
  }, []);

  // Handle scroll to show/hide top fade gradient dynamically
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const opacity = Math.min(offsetY / 30, 1);
    topFadeOpacity.setValue(opacity);
  }, [topFadeOpacity]);

  const title = (
    <Text style={styles.title}>{t('token.detail.title', 'Token Information')}</Text>
  );

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      title={title}
      showFadeGradient
      fadeGradientTop={vs(12) + vs(8) + ms(24) + vs(15)}
      scrollOffsetValue={topFadeOpacity}
      style={[styles.sheetContainer, style]}
    >
      {/* ScrollView Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: standardContentBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: bottomInset }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* PriceChart - full width, edge to edge */}
        {(loading || chartData.length > 0) && (
          <PriceChart
            data={chartData}
            selectedPeriod={chartPeriod}
            onPeriodChange={onChartPeriodChange}
            loading={loading}
            style={{ marginHorizontal: -s(spacing.headerPadding) }}
          />
        )}

        {/* TokenListItem */}
        {loading ? (
          <TokenListItemSkeleton />
        ) : (
          <TokenListItem
            token={token}
            onPress={handleTokenPress}
            hiddenBalance={false}
            blockchain={blockchain}
            style={{ marginHorizontal: 0, marginBottom: 0 }}
          />
        )}

        {/* TokenMarketData (Info) */}
        <TokenMarketData
          data={marketData}
          symbol={token.symbol}
          title={t('token.marketData.title', 'Info')}
          loading={loading}
          style={{ marginHorizontal: 0 }}
        />

        {/* TokenBadgesSection - Before About */}
        <TokenBadgesSection
          tags={token.tags}
          loading={loading}
          style={{ marginHorizontal: 0 }}
        />

        {/* TokenAbout - At the bottom */}
        <TokenAbout
          description={coinInfo?.description}
          loading={loading}
          style={{ marginHorizontal: 0 }}
        />
      </ScrollView>
    </BottomSheetContainer>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    minHeight: '85%',
  },
  title: {
    fontSize: ms(fontSize['2xl']),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: vs(spacing.lg),
    letterSpacing: ms(-0.12, 0.3),
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: s(spacing.headerPadding),
    gap: vs(spacing.lg),
  },
  tokenItemSkeletonContainer: {
    backgroundColor: colors.background.tokenItem,
    borderRadius: borderRadius.lg,
    marginBottom: vs(spacing.sm),
    overflow: 'hidden',
  },
});

export default TokenInformationSheet;
