/**
 * Salmon Wallet Design Tokens
 *
 * Shared design system for both:
 * - Expo (React Native) mobile app
 * - WXT+Vite browser extension
 *
 * Usage:
 * ```ts
 * import { colors, spacing, typography } from '@salmon/shared';
 * ```
 */

import { colors, gradients } from './colors';
import {
  spacing,
  borderRadius,
  borderWidth,
  componentSizes,
  contentPadding,
  opacity,
  blur,
} from './spacing';
import {
  fontFamily,
  fontFamilyNative,
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing,
} from './typography';
import { shadows, shadowsCSS } from './shadows';
import { duration, durationMs, easing } from './durations';

// Re-export all tokens from colors
export { colors, gradients, getScalesColorForBlockchain } from './colors';
export type { Colors, Gradients } from './colors';

// Primitive ramps and the semantic layer built on them. Additive: `colors`
// above remains the token source most components read today, and moves over
// surface by surface rather than in one sweep.
// Exposed as two objects rather than a dozen loose names: `semantic.text`,
// `semantic.border`, `palette.salmon`. Names like `state`, `status`, `change`
// and `surface` are far too generic to sit in a barrel that also carries API
// services and hooks.
export { palette } from './palette';
export type { Neutral, Salmon, Palette } from './palette';
export { semantic } from './semantic';
export type { Semantic } from './semantic';

// Brand geometry — the mark as path data every platform can draw.
export {
  markViewBox,
  markViewBoxAttr,
  markAspectRatio,
  markPaths,
  markToSvg,
} from './brand';

// Re-export all tokens from spacing
export {
  spacing,
  borderRadius,
  borderWidth,
  componentSizes,
  contentPadding,
  opacity,
  blur,
} from './spacing';
export type {
  Spacing,
  BorderRadius,
  BorderWidth,
  ComponentSizes,
  ContentPadding,
  Opacity,
  Blur,
} from './spacing';

// Re-export all tokens from typography
export {
  fontFamily,
  fontFamilyNative,
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing,
  fontScaleCap,
} from './typography';
export type {
  FontFamily,
  FontFamilyNative,
  FontSize,
  LineHeight,
  FontWeight,
  LetterSpacing,
  FontScaleCap,
} from './typography';

// Re-export all tokens from shadows
export { shadows, shadowsCSS } from './shadows';
export type { Shadows, ShadowsCSS } from './shadows';

// Re-export all tokens from durations
export { duration, durationMs, easing } from './durations';
export type { Duration, DurationMs, Easing } from './durations';

/**
 * Complete theme object combining all tokens
 * Useful for theme providers
 */
export const theme = {
  colors,
  gradients,
  spacing,
  borderRadius,
  borderWidth,
  componentSizes,
  contentPadding,
  fontFamily,
  fontFamilyNative,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  opacity,
  blur,
  shadows,
  shadowsCSS,
  duration,
  durationMs,
  easing,
} as const;

export type Theme = typeof theme;
