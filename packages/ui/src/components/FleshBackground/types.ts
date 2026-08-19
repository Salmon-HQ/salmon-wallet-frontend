import type { CSSProperties } from 'react';
import type { FleshVariant } from '@salmon/shared';

export interface FleshBackgroundProps {
  /**
   * Which candidate drawing to render — see
   * `packages/shared/src/theme/fleshVariants.ts`. Exposed for tests; screens
   * leave it on the debug switch (`./fleshVariant.ts`) so every CTA flips
   * together.
   */
  variant?: FleshVariant;
  /**
   * The band colour. Must be a *pale* tint of the fill it sits on — a darker
   * band would let the texture cut label contrast instead of only raising it.
   * Defaults to `semantic.flesh.band`.
   */
  color?: string;
  /**
   * Tile scale. 1 is tuned for a 44-64px pill; below ~0.7 the bands crowd and
   * start to read as stripes rather than as material.
   */
  scale?: number;
  /** Overall strength. The default is deliberately near the visibility floor. */
  opacity?: number;
  style?: CSSProperties;
  className?: string;
}
