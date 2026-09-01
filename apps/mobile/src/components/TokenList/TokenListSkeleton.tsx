import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ContentLoader, Rect, Circle } from '@salmon/shared';
import { semantic, spacing, borderRadius, borderWidth, componentSizes, s, vs } from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import type { TokenListSkeletonProps } from './types';

/**
 * Skeleton placeholder for a single token item
 * Uses react-content-loader for smooth shimmer animation
 * Dimensions match TokenListItem exactly for seamless transition
 */
const SkeletonItem: React.FC = () => {
  const { t } = useTranslation();
  // Calculate exact dimensions from TokenListItem
  const tokenIconSize = s(componentSizes.tokenIcon);
  const tokenIconRadius = tokenIconSize / 2;
  const itemHeight = vs(spacing.md) * 2 + tokenIconSize; // paddingVertical * 2 + logo height
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = screenWidth - s(spacing['2xl']) * 2 - s(spacing.md) * 2; // Screen minus margins and padding

  return (
    <BlurContainer style={styles.glassWrapper} borderWidth={borderWidth.tokenListItem}>
      <View style={styles.contentContainer}>
        <ContentLoader
          speed={1.5}
          width={itemWidth}
          height={itemHeight}
          viewBox={`0 0 ${itemWidth} ${itemHeight}`}
          backgroundColor={semantic.skeleton.base}
          foregroundColor={semantic.skeleton.highlight}
          accessibilityLabel={t('accessibility.loading_token_info', 'Loading token information')}
        >
          {/* Token logo circle */}
          <Circle cx={tokenIconRadius} cy={itemHeight / 2} r={tokenIconRadius} />

          {/* Token name bar */}
          <Rect
            x={tokenIconSize + s(spacing.md)}
            y={itemHeight / 2 - 18}
            rx="4"
            ry="4"
            width="100"
            height="18"
          />

          {/* Token price bar */}
          <Rect
            x={tokenIconSize + s(spacing.md)}
            y={itemHeight / 2 + 6}
            rx="4"
            ry="4"
            width="140"
            height="15"
          />

          {/* USD value (right aligned) */}
          <Rect
            x={itemWidth - 80 - s(spacing.md)}
            y={itemHeight / 2 - 20}
            rx="4"
            ry="4"
            width="80"
            height="24"
          />

          {/* Token amount (right aligned) */}
          <Rect
            x={itemWidth - 60 - s(spacing.md)}
            y={itemHeight / 2 + 8}
            rx="4"
            ry="4"
            width="60"
            height="16"
          />
        </ContentLoader>
      </View>
    </BlurContainer>
  );
};

/**
 * Loading skeleton for TokenList component
 *
 * Displays animated placeholder items while token data is loading.
 *
 * @example
 * ```tsx
 * <TokenListSkeleton count={5} />
 * ```
 */
const TokenListSkeleton: React.FC<TokenListSkeletonProps> = ({ count = 5 }) => {
  const items = Array.from({ length: count }, (_, index) => index);

  return (
    <View style={styles.container}>
      {items.map((index) => (
        <SkeletonItem key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Glass wrapper matching TokenListItem exactly
  glassWrapper: {
    borderRadius: borderRadius.lg,
    marginBottom: vs(spacing.screenGutter),
    marginHorizontal: s(spacing['2xl']),
    overflow: 'hidden',
  },
  // Content container for proper padding
  contentContainer: {
    paddingHorizontal: s(spacing.md),
    paddingVertical: vs(spacing.md),
  },
});

export default TokenListSkeleton;
