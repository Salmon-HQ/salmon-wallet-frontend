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
// `semantic` is the deep-water set resolved at module load; `createSemantic`
// is the resolver behind it, for the provider that follows the active mode.
export { semantic, createSemantic } from './semantic';
// A token at another alpha — the only sanctioned end of a fade (never
// `'transparent'`, which is black at alpha 0 and tints the ramp on its way out).
export { withAlpha } from './withAlpha';
export type { Semantic, ThemeMode } from './semantic';

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
  chainMarks,
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
  resolveOnboardingBands,
} from './onboardingGrid';
export type {
  OnboardingSlot,
  ReservedSlot,
  OnboardingGrid,
  OnboardingVariant,
} from './onboardingGrid';

// Flesh geometry — the myoseptal texture as path data both platforms draw.
export { fleshTile, fleshFills } from './flesh';
export type { FleshFill } from './flesh';

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
export { shadows, shadowsCSS, createShadows } from './shadows';
export type { Shadows, ShadowsCSS, ShadowStyle, ShadowTable } from './shadows';

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
