/**
 * NftCard — the collectible tile, on the kit.
 *
 * It is a `Card` at the control radius with the artwork edge-to-edge inside
 * it and the name band over a scrim at the bottom: the tile used to be a
 * `BlurContainer` with a second `BlurContainer` badge inside it, which is two
 * blur surfaces per cell in a virtualised grid and a material the redesign no
 * longer draws. The press feedback is the repo's one press idiom
 * (`usePressMotion` + `PressSpecular`), the same object `IconBubble` and the
 * buttons press with, so a tile cannot drift from a control.
 */
import {
  borderRadius,
  componentSizes,
  fontFamilyNative,
  fontSize,
  lineHeight,
  ms,
  s,
  semantic,
  spacing,
  vs,
  gradients,
} from '@salmon/shared';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Image } from 'expo-image';

import { usePressMotion } from '../../../hooks/usePressMotion';
import { Card } from '../Card';
import { PressSpecular } from '../PressSpecular';
import { ShimmerRect } from '../ShimmerRect';
import type { NftCardProps, NftCardSkeletonProps } from './types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/** The salmon fallback when the token carries no art, or the art fails. */
const FALLBACK_GRADIENT = {
  colors: [...gradients.primaryButton.colors],
  start: { x: 0.12, y: 0.5 },
  end: { x: 0.83, y: 0.5 },
} as const;

export const NftCard: React.FC<NftCardProps> = ({ nft, onPress, style, testID }) => {
  const { t } = useTranslation();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { scale, pressHandlers, specular } = usePressMotion();

  const motionStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleImageLoadStart = useCallback(() => setImageLoading(true), []);
  const handleImageLoadEnd = useCallback(() => setImageLoading(false), []);
  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  const showFallback = !nft.image || imageError;
  const displayName = nft.name || t('nft.unnamed', 'Unnamed NFT');

  return (
    <AnimatedTouchable
      style={[styles.tile, style, motionStyle]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={t('nft.detail.cardLabel', 'NFT: {{name}}', { name: nft.name })}
      accessibilityHint={
        onPress ? t('accessibility.nft_view_hint', 'Double tap to view NFT details') : undefined
      }
      testID={testID ?? `nft-card-${nft.mint ?? nft.name}`}
      {...pressHandlers}
    >
      {/* The card's own padding is zero here: the artwork is the card's
          ground, not something set inside it. `Card` applies `style` last, so
          this wins over the tone's padding without a new prop. */}
      <Card radius="lg" style={styles.card}>
        {showFallback ? (
          <LinearGradient
            colors={[...FALLBACK_GRADIENT.colors]}
            start={FALLBACK_GRADIENT.start}
            end={FALLBACK_GRADIENT.end}
            style={styles.fill}
          />
        ) : (
          <>
            <Image
              source={nft.image}
              style={styles.fill}
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
                  style={styles.fill}
                />
                <ActivityIndicator size="small" color={semantic.accent.onFill} />
              </View>
            )}
          </>
        )}

        <View style={styles.nameBand}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {displayName}
          </Text>
          {!!nft.collectionName && (
            <Text style={styles.collection} numberOfLines={1} ellipsizeMode="tail">
              {nft.collectionName}
            </Text>
          )}
        </View>

        {!!onPress && <PressSpecular {...specular} />}
      </Card>
    </AnimatedTouchable>
  );
};

/**
 * NftCardSkeleton — the tile's own geometry while a section loads, so the
 * placeholder grid lines up with the grid that replaces it.
 */
export const NftCardSkeleton = React.memo<NftCardSkeletonProps>(({ style, testID }) => (
  <View style={[styles.tile, style]} testID={testID}>
    <Card radius="lg" style={styles.card}>
      {/* `ShimmerRect` takes pixels, and the tile is fluid: the band is drawn
          at the tile's drawn size and clipped by the card's own radius. */}
      <ShimmerRect
        width={s(componentSizes.nftCardWidth)}
        height={vs(componentSizes.nftCardHeight)}
        borderRadius={ms(borderRadius.r3)}
      />
    </Card>
  </View>
));

NftCardSkeleton.displayName = 'NftCardSkeleton';

const styles = StyleSheet.create({
  tile: {
    width: s(componentSizes.nftCardWidth),
    aspectRatio: componentSizes.nftCardWidth / componentSizes.nftCardHeight,
  },
  card: {
    flex: 1,
    padding: 0,
    justifyContent: 'flex-end',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBand: {
    backgroundColor: semantic.overlay.scrim,
    paddingVertical: vs(spacing.sm),
    paddingHorizontal: s(spacing.md),
    gap: vs(spacing.xxs),
  },
  name: {
    fontFamily: fontFamilyNative.semiBold,
    fontSize: s(fontSize.body),
    lineHeight: s(fontSize.body) * lineHeight.snug,
    color: semantic.text.primary,
  },
  collection: {
    fontFamily: fontFamilyNative.regular,
    fontSize: s(fontSize.caption),
    lineHeight: s(fontSize.caption) * lineHeight.snug,
    color: semantic.text.secondary,
  },
});

export default NftCard;
