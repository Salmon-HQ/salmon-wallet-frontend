/**
 * NftCard — the collectible tile, on the kit, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/NftCard/NftCard.tsx`: a
 * `Card` at the control radius with the artwork edge to edge inside it and the
 * name band over a scrim at the bottom. The tile used to be a `BlurContainer`
 * with a second `BlurContainer` badge inside it — two blur surfaces per cell in
 * a grid, and a material the redesign no longer draws.
 *
 * The band is the scrim token, not a blur, and it carries the name over the
 * collection line in the two on-scrim inks, so a pale artwork and a dark one
 * both read. `Card` supplies the ground, the radius and the hairline; the
 * press feedback is `Card`'s own, the one the whole kit presses with.
 */
import React, { useCallback, useState } from 'react';
import {
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  type Semantic,
} from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { Card } from '../Card';
import type { NftCardProps } from './types';

/** The artwork fills the tile; the band sits on top of its bottom edge. */
const fillStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

/**
 * A missing image is an empty surface, not an accent: the salmon fill this
 * used to draw put a grid of living salmon rectangles on the screen and broke
 * the One Living Thing Rule every time art failed to load.
 */
const fallbackStyle = (t: Semantic): React.CSSProperties => ({
  ...fillStyle,
  backgroundColor: t.surface.raised,
});

export function NftCard({ nft, onPress, style, className, testID }: NftCardProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [imageError, setImageError] = useState(false);

  const handleImageError = useCallback(() => setImageError(true), []);

  const showFallback = !nft.image || imageError;
  const displayName = nft.name || t('nft.unnamed', 'Unnamed NFT');

  return (
    <Card
      testID={testID ?? `nft-card-${nft.mint ?? nft.name}`}
      onPress={onPress}
      accessibilityLabel={t('nft.detail.cardLabel', 'NFT: {{name}}', { name: displayName })}
      radius="lg"
      style={{
        // The card's own padding is zero here: the artwork is the card's
        // ground, not something set inside it. `Card` applies `style` last, so
        // this wins over the tone's padding without a new prop.
        padding: 0,
        position: 'relative',
        aspectRatio: `${componentSizes.nftCardWidth} / ${componentSizes.nftCardHeight}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        // Off-screen tiles skip layout and paint entirely, and the reserved
        // size keeps the scrollbar honest while they are skipped. Pairs with
        // the image's `loading="lazy"`: this skips the work of painting, that
        // one the work of decoding.
        contentVisibility: 'auto',
        containIntrinsicSize: `${componentSizes.nftCardHeight}px`,
        ...style,
      }}
      className={className}
    >
      {showFallback ? (
        <span style={fallbackStyle(semantic)} />
      ) : (
        <img
          src={nft.image}
          alt={t('nft.detail.imageAlt', 'NFT image for {{name}}', { name: displayName })}
          // A wallet with hundreds of collectibles mounts hundreds of these at
          // once. `lazy` lets the browser skip fetching and decoding what is
          // far from the viewport, natively — a virtualization library would be
          // a dependency bought to get the same thing back.
          loading="lazy"
          decoding="async"
          onError={handleImageError}
          style={fillStyle}
        />
      )}

      <span
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.xxs,
          backgroundColor: semantic.overlay.scrim,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          paddingLeft: spacing.md,
          paddingRight: spacing.md,
          minWidth: 0,
        }}
      >
        <span style={bandTextStyle(fontSize.body, fontWeight.semibold, semantic.text.onScrim)}>
          {displayName}
        </span>
        {!!nft.collectionName && (
          <span
            style={bandTextStyle(
              fontSize.caption,
              fontWeight.regular,
              semantic.text.onScrimSecondary
            )}
          >
            {nft.collectionName}
          </span>
        )}
      </span>
    </Card>
  );
}

const bandTextStyle = (size: number, weight: string, color: string): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: weight,
  fontSize: size,
  lineHeight: `${size * lineHeight.snug}px`,
  color,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'left',
});
