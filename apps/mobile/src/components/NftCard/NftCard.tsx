import {
  fontFamilyNative,
  fontSize,
  fontWeight,
  borderRadius,
  borderWidth,
  gradients,
  shadows,
  componentSizes,
  ms,
  s,
  vs,
  spacing,
  semantic,
} from '@salmon/shared';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { ContentLoader, Rect } from '@salmon/shared';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { BlurContainer } from '../BlurContainer';
import type { NftCardProps, NftCardSkeletonProps } from './types';

/**
 * Orange gradient colors for fallback background
 * Gradient: linear-gradient(91.6deg, rgb(255, 92, 69) 12%, rgba(161, 42, 42, 0.9) 83%)
 */
/** A full cycle of the skeleton pulse, and how far down it dips. */
const PULSE_MS = 900;
const PULSE_MIN_OPACITY = 0.45;

const FALLBACK_GRADIENT = {
  colors: [...gradients.primaryButton.colors],
  start: { x: 0.12, y: 0.5 },
  end: { x: 0.83, y: 0.5 },
} as const;

/**
 * NftCard component for displaying NFTs in a grid layout
 *
 * Features:
 * - ~194x193px responsive card with 18px border radius
 * - NFT image covers the entire card
 * - Orange gradient fallback when no image or image fails to load
 * - Name badge at bottom with glassmorphism effect
 * - Accessible with press handling
 *
 * @example
 * ```tsx
 * <NftCard
 *   nft={{
 *     mint: 'abc123',
 *     name: 'Cool NFT #1',
 *     image: 'https://example.com/nft.png',
 *     collectionName: 'Cool Collection',
 *   }}
 *   onPress={() => console.log('NFT pressed')}
 * />
 * ```
 */
export const NftCard: React.FC<NftCardProps> = ({ nft, onPress, style, testID }) => {
  const { t } = useTranslation();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoadStart = useCallback(() => {
    setImageLoading(true);
  }, []);

  const handleImageLoadEnd = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  const showFallback = !nft.image || imageError;

  /**
   * Render the background content (image or gradient fallback)
   */
  const renderBackground = () => {
    if (showFallback) {
      return (
        <LinearGradient
          colors={[...FALLBACK_GRADIENT.colors]}
          start={FALLBACK_GRADIENT.start}
          end={FALLBACK_GRADIENT.end}
          style={styles.fallbackGradient}
        />
      );
    }

    return (
      <>
        <Image
          source={nft.image}
          style={styles.image}
          contentFit="cover"
          onLoadStart={handleImageLoadStart}
          onLoadEnd={handleImageLoadEnd}
          onError={handleImageError}
          accessibilityLabel={t('nft.detail.imageAlt', 'NFT image for {{name}}', {
            name: nft.name,
          })}
          recyclingKey={nft.mint}
          autoplay={true}
        />
        {imageLoading && (
          <View style={styles.loadingOverlay}>
            <LinearGradient
              colors={[...FALLBACK_GRADIENT.colors]}
              start={FALLBACK_GRADIENT.start}
              end={FALLBACK_GRADIENT.end}
              style={styles.fallbackGradient}
            />
            <ActivityIndicator size="small" color={semantic.accent.onFill} style={styles.loader} />
          </View>
        )}
      </>
    );
  };

  /**
   * Render the name badge at the bottom of the card
   */
  const renderNameBadge = () => {
    const displayName = nft.name || t('nft.unnamed', 'Unnamed NFT');

    return (
      <View style={styles.nameBadgeContainer}>
        <BlurContainer
          style={styles.nameBadge}
          blurIntensity={6}
          backgroundColor={semantic.overlay.scrim}
          borderColor={semantic.border.raised}
          borderWidth={borderWidth.actionButton}
        >
          <Text style={styles.nameText} numberOfLines={1} ellipsizeMode="tail">
            {displayName}
          </Text>
        </BlurContainer>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={t('nft.detail.cardLabel', 'NFT: {{name}}', { name: nft.name })}
      accessibilityHint={
        onPress ? t('accessibility.nft_view_hint', 'Double tap to view NFT details') : undefined
      }
      testID={testID ?? `nft-card-${nft.mint ?? nft.name}`}
    >
      {renderBackground()}
      {renderNameBadge()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    // Card size: ~194x193px with responsive scaling
    width: s(componentSizes.nftCardWidth),
    height: vs(componentSizes.nftCardHeight),
    borderRadius: ms(borderRadius.iconContainer),
    overflow: 'hidden',
    // Shadow: 0px 3px 9px rgba(0,0,0,0.4)
    ...shadows.nftCard,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  fallbackGradient: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    position: 'absolute',
  },
  nameBadgeContainer: {
    position: 'absolute',
    bottom: vs(spacing.sm),
    left: s(spacing.sm),
    right: s(spacing.sm),
    alignItems: 'center',
  },
  nameBadge: {
    // Border radius: 9px (BlurContainer handles background/border)
    borderRadius: ms(borderRadius.badge),
    // Padding: 6px vertical
    paddingVertical: vs(spacing.xs),
    paddingHorizontal: s(spacing.lg),
    width: '100%',
    overflow: 'hidden',
  },
  nameText: {
    // DM Sans SemiBold, ~13px, color #e0e0e0
    fontFamily: fontFamilyNative.semiBold,
    fontSize: ms(fontSize.caption),
    fontWeight: fontWeight.semibold,
    color: semantic.text.primary,
    textAlign: 'center',
  },
});

/**
 * NftCardSkeleton component for loading state
 *
 * Uses ContentLoader with proper skeleton colors to match the project's
 * skeleton loading pattern. Replicates the visual structure of NftCard:
 * - Main card background (rounded rectangle)
 * - Name badge at bottom (rounded rectangle)
 *
 * Dimensions match NftCard: ~194x193px with 18px border radius
 */
export const NftCardSkeleton = React.memo<NftCardSkeletonProps>(
  ({ style, testID, animated = true }) => {
    // Card dimensions matching NftCard
    const cardWidth = s(componentSizes.nftCardWidth);
    const cardHeight = vs(componentSizes.nftCardHeight);
    const cardBorderRadius = ms(borderRadius.iconContainer);

    // Badge dimensions
    const badgeHeight = vs(25); // 6px padding * 2 + 13px text
    const badgeBottom = vs(8);
    const badgeHorizontal = s(8);
    const badgeBorderRadius = ms(borderRadius.badge);

    // The gradient sweep alone is too quiet against this palette: a grid of
    // placeholders read as a finished, empty grid rather than one still
    // loading. A pulse on the whole card is legible at a glance.
    const pulse = useSharedValue(1);
    const isReduceMotionEnabled = useReducedMotion();

    useEffect(() => {
      if (!animated || isReduceMotionEnabled) return;
      pulse.value = withRepeat(withTiming(PULSE_MIN_OPACITY, { duration: PULSE_MS }), -1, true);
    }, [animated, isReduceMotionEnabled, pulse]);

    const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

    return (
      <Animated.View style={[styles.container, style, pulseStyle]} testID={testID}>
        <ContentLoader
          speed={animated ? 1.5 : 0}
          width={cardWidth}
          height={cardHeight}
          viewBox={`0 0 ${cardWidth} ${cardHeight}`}
          backgroundColor={semantic.skeleton.base}
          foregroundColor={semantic.skeleton.highlight}
        >
          {/* Main card background */}
          <Rect
            x="0"
            y="0"
            rx={cardBorderRadius}
            ry={cardBorderRadius}
            width={cardWidth}
            height={cardHeight}
          />

          {/* Name badge at bottom */}
          <Rect
            x={badgeHorizontal}
            y={cardHeight - badgeHeight - badgeBottom}
            rx={badgeBorderRadius}
            ry={badgeBorderRadius}
            width={cardWidth - badgeHorizontal * 2}
            height={badgeHeight}
          />
        </ContentLoader>
      </Animated.View>
    );
  }
);

NftCardSkeleton.displayName = 'NftCardSkeleton';

export default NftCard;
