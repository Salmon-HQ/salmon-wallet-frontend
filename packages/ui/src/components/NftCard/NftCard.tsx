/**
 * NftCard - NFT display card for grid layouts
 *
 * Web version using MUI and @emotion/styled for browser extension
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import {
  colors,
  semantic,
  fontFamily,
  fontWeight,
  borderRadius,
  fontSize,
  spacing,
  shadowsCSS,
  opacity,
  duration,
  easing,
  componentSizes,
  blur,
  borderWidth,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import type { NftCardProps } from './types';

/**
 * Fallback background for an NFT with no image.
 *
 * It used to be the salmon primary fill, which put a grid of living salmon
 * rectangles on the collectibles screen and broke the One Living Thing Rule
 * every time art failed to load. A missing image is an empty surface, not an
 * accent, so it takes the raised plane instead.
 */
const FALLBACK_GRADIENT = semantic.surface.raised;

/** Card dimensions */
const CARD_BORDER_RADIUS = borderRadius.iconContainer;

const Container = styled(Box)<{ $clickable: boolean }>(({ $clickable }) => ({
  width: '100%',
  aspectRatio: '1',
  borderRadius: CARD_BORDER_RADIUS,
  overflow: 'hidden',
  position: 'relative',
  cursor: $clickable ? 'pointer' : 'default',
  boxShadow: shadowsCSS.md,
  transition: `opacity ${duration.normal} ${easing.ease}`,
  '&:hover': $clickable
    ? {
        opacity: opacity.high,
      }
    : {},
  '&:active': $clickable
    ? {
        opacity: opacity.medium,
      }
    : {},
}));

const NftImage = styled('img')({
  width: '100%',
  height: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
  objectFit: 'cover',
});

const FallbackGradient = styled(Box)({
  width: '100%',
  height: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
  background: FALLBACK_GRADIENT,
});

const LoadingOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const NameBadgeContainer = styled(Box)({
  position: 'absolute',
  bottom: spacing.sm,
  left: spacing.sm,
  right: spacing.sm,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const NameText = styled(Typography)({
  fontFamily: fontFamily.sans,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: colors.text.balance,
  textAlign: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  // Position above the BlurContainer pseudo-element overlay
  position: 'relative',
  zIndex: 1,
});

/**
 * NftCard component for displaying NFTs in a grid layout
 *
 * Features:
 * - ~194x193px card with 18px border radius
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
export function NftCard({ nft, onPress, style, className, testID }: NftCardProps) {
  const { t } = useTranslation();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  const showFallback = !nft.image || imageError;
  const displayName = nft.name || t('nft.unnamed', 'Unnamed NFT');

  return (
    <Container
      $clickable={!!onPress}
      onClick={onPress}
      style={style}
      className={className}
      role="button"
      aria-label={t('nft.detail.cardLabel', 'NFT: {{name}}', { name: displayName })}
      data-testid={testID ?? `nft-card-${nft.mint ?? nft.name}`}
    >
      {/* Background: image or gradient fallback */}
      {showFallback ? (
        <FallbackGradient />
      ) : (
        <>
          <NftImage
            src={nft.image}
            alt={t('nft.detail.imageAlt', 'NFT image for {{name}}', { name: displayName })}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          {imageLoading && (
            <LoadingOverlay>
              <FallbackGradient />
              <CircularProgress
                size={componentSizes.iconSizeSmall}
                sx={{
                  color: colors.text.primary,
                  position: 'absolute',
                }}
              />
            </LoadingOverlay>
          )}
        </>
      )}

      {/* Name badge at bottom */}
      <NameBadgeContainer>
        <BlurContainer
          blurIntensity={blur.sm}
          backgroundColor={colors.dialog.overlay}
          borderColor={colors.accent.border}
          borderWidth={borderWidth.actionButton}
          style={{
            borderRadius: borderRadius.md,
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm,
            paddingLeft: spacing.lg,
            paddingRight: spacing.lg,
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <NameText>{displayName}</NameText>
        </BlurContainer>
      </NameBadgeContainer>
    </Container>
  );
}
