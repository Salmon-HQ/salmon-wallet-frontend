/**
 * Typography tokens for Salmon Wallet
 * Uses DM Sans as the primary font family
 * Works for both React Native (Expo) and Web (WXT+Vite extension)
 */

export const fontFamily = {
  /** Primary font - Geist */
  sans: 'Geist',
  /**
   * Monospace font - Geist Mono.
   *
   * Required for any value the user must read character by character:
   * addresses, transaction hashes, private keys, and seed phrases. Geist Mono
   * ships a slashed zero as the default glyph (no `zero`/`ss` feature needed,
   * which React Native's `fontVariant` cannot enable) and a fixed 600/1000
   * advance for every digit, so amounts do not reflow as values update.
   */
  mono: 'Geist Mono',
} as const;

/**
 * React Native font family names
 * Actual font family names loaded in Expo
 */
export const fontFamilyNative = {
  /** Geist Regular (400) — `light` maps here; the ramp ships four weights */
  light: 'GeistRegular',
  /** Geist Regular (400) */
  regular: 'GeistRegular',
  /** Geist Medium (500) */
  medium: 'GeistMedium',
  /** Geist SemiBold (600) */
  semiBold: 'GeistSemiBold',
  /** Geist Bold (700) */
  bold: 'GeistBold',
  /** Geist Bold (700) — `extraBold` maps here */
  extraBold: 'GeistBold',
  /** Geist Bold (700) — `black` maps here; it had no call sites */
  black: 'GeistBold',
  /** Geist Mono Regular (400) - addresses, hashes, keys, seed phrases */
  mono: 'GeistMonoRegular',
} as const;

/**
 * Font sizes in pixels
 */
export const fontSize = {
  /** 10px */
  xs: 10,
  /** 11.375px - TokenListItem change text */
  tokenChange: 11.375,
  /** 12px */
  sm: 12,
  /** 13.65px - TokenListItem name and price */
  tokenNamePrice: 13.65,
  /** 14px */
  base: 14,
  /** 14.5px - Action button text */
  actionButton: 14.5,
  /** 16px */
  md: 16,
  /** 18px */
  lg: 18,
  /** 20px */
  xl: 20,
  /** 22px - Titles, confirmation amounts */
  title: 22,
  /** 24px */
  '2xl': 24,
  /** 28px - Medium icon size */
  iconMd: 28,
  /** 30px */
  '3xl': 30,
  /** 36px */
  '4xl': 36,
  /** 40px - Large icon size */
  iconLg: 40,
  /** 48px */
  '5xl': 48,
  /** 60px - Balance card amount */
  balance: 60,
} as const;

/**
 * Line heights (multipliers)
 */
export const lineHeight = {
  /** 1.0 */
  none: 1,
  /** 1.25 */
  tight: 1.25,
  /** 1.3 */
  condensed: 1.3,
  /** 1.4 - TokenListItem */
  tokenListItem: 1.4,
  /** 1.5 */
  normal: 1.5,
  /** 1.625 */
  relaxed: 1.625,
} as const;

/**
 * Font weights (maps to DM Sans variants)
 */
export const fontWeight = {
  /** 300 */
  light: '300',
  /** 400 */
  regular: '400',
  /** 500 */
  medium: '500',
  /** 600 */
  semibold: '600',
  /** 700 */
  bold: '700',
  /** 800 */
  extraBold: '800',
  /** 900 */
  black: '900',
} as const;

/**
 * Letter spacing in pixels
 */
export const letterSpacing = {
  /** -0.245px - Balance amount */
  balance: -0.245,
  /** -0.12px - Titles, headings in sheets */
  snug: -0.12,
  /** -0.07px - Subtle negative for labels, badges */
  slight: -0.07,
  /** 0px */
  normal: 0,
  /** 0.12px - Header text */
  header: 0.12,
  /** 0.13px - Change text */
  change: 0.13,
  /** 0.25px */
  wide: 0.25,
  /** 0.3px - Source badges, uppercase labels */
  semiWide: 0.3,
  /** 0.5px */
  wider: 0.5,
  /** 1px */
  widest: 1,
} as const;

/**
 * Caps for OS font scaling (Dynamic Type / Android font scale), passed to a
 * Text/TextInput `maxFontSizeMultiplier`. Text still scales with the user's
 * accessibility setting, but only up to these ceilings, so dense or
 * space-constrained UI stays legible instead of overlapping/clipping.
 * Icons are unaffected — they keep their fixed size.
 */
export const fontScaleCap = {
  /** Chrome with little room: tab bar labels, compact action buttons. */
  chrome: 1.3,
  /** Dense data rows where columns must coexist: token/transaction lists. */
  dense: 1.4,
} as const;

export type FontScaleCap = typeof fontScaleCap;

/**
 * Tabular figures. Apply to every rendered number: balances, token amounts,
 * prices, percentages, fees, dates, and countdowns.
 *
 * Geist's default digits are proportional — `1` is 384 units wide against
 * `0` at 663 — so a balance visibly reflows every time it repolls. The font
 * ships a `tnum` feature that maps all ten digits to 600-unit variants, but
 * it is opt-in, so switching typeface alone does not fix the jitter; this
 * does. `tabular-nums` is one of the few features React Native's `fontVariant`
 * enum can actually enable, which is why the fix works on all three surfaces.
 */
export const tabularNums = {
  /** Web and extension — spread into a style object or `sx`. */
  css: { fontVariantNumeric: 'tabular-nums' },
  /** React Native — spread into a `Text` style. */
  native: { fontVariant: ['tabular-nums'] },
} as const;

export type TabularNums = typeof tabularNums;

export type FontFamily = typeof fontFamily;
export type FontFamilyNative = typeof fontFamilyNative;
export type FontSize = typeof fontSize;
export type LineHeight = typeof lineHeight;
export type FontWeight = typeof fontWeight;
export type LetterSpacing = typeof letterSpacing;
