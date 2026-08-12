import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
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
} from '@salmon/shared';
import { SolanaSvgIcon, BitcoinSvgIcon } from '../Icon';
import { BlurContainer } from '../BlurContainer';
import type { NftCarouselSectionProps, NftBlockchain } from './types';
import type { NftData } from '../NftCard';
import { NftCarouselSectionSkeleton } from './NftCarouselSectionSkeleton';

// Card dimensions for carousel (matches Figma node 1702:6142 — ~194x193pt)
const CARD_WIDTH = s(194);
const CARD_HEIGHT = vs(193);
const CARD_BORDER_RADIUS = ms(18);
const CARD_GAP = s(9);

// Fallback gradient for NFTs without images
const FALLBACK_GRADIENT = {
  colors: [...gradients.primaryButton.colors],
  start: { x: 0.12, y: 0.5 },
  end: { x: 0.83, y: 0.5 },
} as const;

/**
 * Get blockchain icon component based on blockchain type
 */
const getBlockchainIcon = (blockchain: NftBlockchain, size: number = 24) => {
  switch (blockchain) {
    case 'solana':
      return <SolanaSvgIcon size={size} color={colors.text.primary} />;
    case 'bitcoin':
      return <BitcoinSvgIcon size={size} color={colors.text.primary} />;
    default:
      return null;
  }
};

/**
 * Chevron right icon for "See All" button
 */
const ChevronRightIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = colors.text.secondary,
}) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: size * 0.8, color }}>{'>'}</Text>
  </View>
);

/**
 * Mini NFT Card for carousel display
 */
interface MiniNftCardProps {
  nft: NftData;
  onPress?: () => void;
}

const MiniNftCard: React.FC<MiniNftCardProps> = ({ nft, onPress }) => {
  const { t } = useTranslation();
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);

  const showFallback = !nft.image || imageError;

  return (
    <TouchableOpacity
      style={styles.miniCard}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={t('nft.detail.cardLabel', 'NFT: {{name}}', { name: nft.name })}
    >
      {/* Background */}
      {showFallback ? (
        <LinearGradient
          colors={[...FALLBACK_GRADIENT.colors]}
          start={FALLBACK_GRADIENT.start}
          end={FALLBACK_GRADIENT.end}
          style={styles.cardBackground}
        />
      ) : (
        <>
          <Image
            source={nft.image}
            style={styles.cardImage}
            contentFit="cover"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            recyclingKey={nft.mint}
            autoplay={true}
          />
          {imageLoading && (
            <View style={styles.loadingOverlay}>
              <LinearGradient
                colors={[...FALLBACK_GRADIENT.colors]}
                start={FALLBACK_GRADIENT.start}
                end={FALLBACK_GRADIENT.end}
                style={styles.cardBackground}
              />
              <ActivityIndicator size="small" color={colors.text.primary} />
            </View>
          )}
        </>
      )}

      {/* Name badge */}
      <View style={styles.nameBadgeContainer}>
        <BlurContainer
          style={styles.nameBadge}
          blurIntensity={6}
          backgroundColor={colors.overlay.darkHover}
          borderColor={colors.accent.border}
          borderWidth={borderWidth.actionButton}
        >
          <Text style={styles.nameText} numberOfLines={1} ellipsizeMode="tail">
            {nft.name || t('nft.unnamed', 'Unnamed NFT')}
          </Text>
        </BlurContainer>
      </View>
    </TouchableOpacity>
  );
};

/**
 * NftCarouselSection - Horizontal single-row carousel of NFTs
 *
 * Horizontal scrolling carousel grouped by blockchain.
 * Cards peek at the edge to hint at scrollability.
 *
 * @example
 * ```tsx
 * <NftCarouselSection
 *   title="Solana"
 *   blockchain="solana"
 *   nfts={solanaCollection}
 *   onNftPress={(nft) => showDetail(nft)}
 *   onSeeAllPress={() => openSeeAllSheet('solana')}
 * />
 * ```
 */
export const NftCarouselSection: React.FC<NftCarouselSectionProps> = ({
  title,
  blockchain,
  nfts,
  loading = false,
  onNftPress,
  onSeeAllPress,
  style,
  testID,
  renderBeforeCarousel,
}) => {
  const handleNftPress = useCallback(
    (nft: NftData) => {
      onNftPress?.(nft);
    },
    [onNftPress]
  );

  const handleSeeAllPress = useCallback(() => {
    onSeeAllPress?.();
  }, [onSeeAllPress]);

  // Show skeleton while loading
  if (loading) {
    return <NftCarouselSectionSkeleton blockchain={blockchain} style={style} testID={testID} />;
  }

  // Don't render if no NFTs
  if (!nfts || nfts.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Section Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleSeeAllPress}
        activeOpacity={onSeeAllPress ? 0.7 : 1}
        disabled={!onSeeAllPress}
      >
        <View style={styles.headerLeft}>
          {getBlockchainIcon(blockchain, s(24))}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.count}>({nfts.length})</Text>
        </View>
        {onSeeAllPress && (
          <View style={styles.headerRight}>
            <ChevronRightIcon size={s(20)} color={colors.text.secondary} />
          </View>
        )}
      </TouchableOpacity>

      {/* Optional content before carousel (e.g., SubAccountSelector) */}
      {renderBeforeCarousel}

      {/* Carousel Content — single horizontal row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {nfts.map((nft) => (
          <MiniNftCard key={nft.mint} nft={nft} onPress={() => handleNftPress(nft)} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: vs(spacing['2xl']),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(spacing.headerPadding),
    marginBottom: vs(spacing.md),
    height: vs(componentSizes.iconSizeLarge),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamilyNative.semiBold,
    fontSize: ms(fontSize.lg),
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  count: {
    fontFamily: fontFamilyNative.regular,
    fontSize: ms(fontSize.base),
    color: colors.text.secondary,
  },
  scrollContent: {
    paddingHorizontal: s(spacing.headerPadding),
    gap: CARD_GAP,
  },
  // Mini Card Styles
  miniCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
    ...shadows.nftCard,
  },
  cardBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cardImage: {
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
  nameBadgeContainer: {
    position: 'absolute',
    bottom: vs(spacing.sm),
    left: s(spacing.sm),
    right: s(spacing.sm),
    alignItems: 'center',
  },
  nameBadge: {
    borderRadius: ms(borderRadius.badge),
    paddingVertical: vs(spacing.xs),
    paddingHorizontal: s(spacing.lg),
    width: '100%',
    overflow: 'hidden',
  },
  nameText: {
    fontFamily: fontFamilyNative.semiBold,
    fontSize: ms(fontSize.sm),
    fontWeight: fontWeight.semibold,
    color: colors.text.balance,
    textAlign: 'center',
  },
});

export default NftCarouselSection;
