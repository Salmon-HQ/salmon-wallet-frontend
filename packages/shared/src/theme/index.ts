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
import {
  duration,
  durationMs,
  easing,
  motionDuration,
  motionEasing,
  motionMs,
  reducedMotion,
} from './durations';

// Re-export all tokens from colors
export { colors, gradients, getScalesColorForBlockchain, isOpaqueColor } from './colors';
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
  wordmarkViewBox,
  wordmarkViewBoxAttr,
  wordmarkAspectRatio,
  wordmarkPaths,
  wordmarkText,
  wordmarkTypeface,
  wordmarkToSvg,
} from './brand';

// The onboarding slot grid — five reserved-height tables, read by all three apps.
export {
  onboardingSlots,
  onboardingIdentityGridFull,
  onboardingIdentityGridCompact,
  onboardingCredentialGridFull,
  onboardingCredentialGridCompact,
  onboardingLockGridFull,
  onboardingLockGridCompact,
  onboardingContentGridFull,
  onboardingContentGridCompact,
  onboardingContentTightGridFull,
  onboardingContentTightGridCompact,
  onboardingCompactHeight,
  onboardingMarkTitleGap,
  identityClusterCenterOffset,
  resolveOnboardingGrid,
} from './onboardingGrid';
export type {
  OnboardingSlot,
  ReservedSlot,
  OnboardingGrid,
  OnboardingVariant,
} from './onboardingGrid';

// Marine snow geometry — the water column's suspended matter, as data both
// platforms draw. The DOM serialises it; mobile draws the array directly.
export {
  depthDrift,
  depthFieldCycleMs,
  depthFieldTile,
  depthFieldTileHeight,
  marineSnow,
  marineSnowTiled,
  marineSnowSvg,
  wrapDepthOffset,
} from './depthField';
export type { SnowFloc } from './depthField';

// Blizzard variant — the same field with heroes, a mid-field lift, and
// clustering. Renderers pick a variant through their debug switches.
export {
  blizzard,
  blizzardClusterCenters,
  blizzardHeroes,
  blizzardMidFlocs,
  blizzardSnow,
  blizzardSnowSvg,
  blizzardSnowTiled,
} from './depthFieldBlizzard';
export type { HeroFloc, SnowVariant } from './depthFieldBlizzard';

// Flesh geometry — the myoseptal texture as path data both platforms draw.
export { fleshTile, fleshFades, fleshStrokes, fleshTiledStrokes } from './flesh';
export type { FleshFadeStop, FleshStroke } from './flesh';
export { fleshVariantFills, fleshVariantTiles } from './fleshVariants';
export type { FleshFill, FleshVariant } from './fleshVariants';

// Seigaiha geometry — the scales motif as path data both platforms draw.
export { seigaihaTile, seigaihaPaths, seigaihaTiledPaths, shiftSeigaiha } from './scales';

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
  tabularNums,
} from './typography';
export type {
  FontFamily,
  FontFamilyNative,
  FontSize,
  LineHeight,
  FontWeight,
  LetterSpacing,
  FontScaleCap,
  TabularNums,
} from './typography';

// Re-export all tokens from shadows
export { shadows, shadowsCSS } from './shadows';
export type { Shadows, ShadowsCSS } from './shadows';

// Re-export all tokens from durations.
// `motionMs` / `motionDuration` / `motionEasing` are the vocabulary; the
// `duration` / `durationMs` / `easing` trio is kept and deprecated so the three
// apps keep compiling while call sites move over.
export {
  motionMs,
  motionDuration,
  motionEasing,
  reducedMotion,
  resolveMotionMs,
  resolveMotionDuration,
  duration,
  durationMs,
  easing,
} from './durations';
export type {
  MotionMs,
  MotionDuration,
  MotionEasing,
  ReducedMotion,
  Duration,
  DurationMs,
  Easing,
} from './durations';

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
  motionMs,
  motionDuration,
  motionEasing,
  reducedMotion,
  duration,
  durationMs,
  easing,
} as const;

export type Theme = typeof theme;
