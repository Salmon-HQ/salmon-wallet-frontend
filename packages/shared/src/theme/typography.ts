/**
 * Typography tokens for Salmon Wallet
 * Uses DM Sans as the primary font family
 * Works for both React Native (Expo) and Web (WXT+Vite extension)
 */

export const fontFamily = {
  /**
   * Primary font - DM Sans.
   *
   * The shipped binaries are modified: `scripts/dmsans.py` equalises the ten
   * digit advances, because no released DM Sans has a `tnum` feature to switch
   * on. See `packages/assets/src/fonts/DMSans-README.md`.
   */
  sans: 'DM Sans',
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
  /** DM Sans Regular (400) — `light` maps here; the ramp ships four weights */
  light: 'DMSansRegular',
  /** DM Sans Regular (400) */
  regular: 'DMSansRegular',
  /** DM Sans Medium (500) */
  medium: 'DMSansMedium',
  /** DM Sans SemiBold (600) */
  semiBold: 'DMSansSemiBold',
  /** DM Sans Bold (700) */
  bold: 'DMSansBold',
  /** DM Sans Bold (700) — `extraBold` maps here */
  extraBold: 'DMSansBold',
  /** DM Sans Bold (700) — `black` maps here; it had no call sites */
  black: 'DMSansBold',
  /** Geist Mono Regular (400) - addresses, hashes, keys, seed phrases */
  mono: 'GeistMonoRegular',
} as const;

/**
 * Font sizes in pixels.
 *
 * An eight-step modular scale plus one hero size, replacing the flat list of
 * Figma-derived one-offs (11.375 / 13.65 / 14.5) that used to live here.
 *
 * **Ratio.** Nominally a major second (1.125) off a 16px base, snapped to even
 * integers so no step ever lands on a fractional pixel — fractional sizes are
 * what made 11.375 unreasonable in the first place, and they render blurry at
 * 1x. Snapping makes the realised ratio decay across the ramp
 * (1.2 → 1.167 → 1.143 → 1.125 → 1.111 → 1.2 → 1.5), which is deliberate: a
 * dense wallet needs fine gradation at the bottom, where a primary and a
 * secondary line must be distinguishable inside one 44px list row on a phone
 * and inside a 360px-wide side panel, and coarse jumps at the top, where the
 * only job is to read as hierarchy at a glance. A constant 1.25 from 10 would
 * give 12.5 / 15.6 / 19.5 — no 16, and fractional pixels throughout.
 *
 * Legacy keys are kept and re-pointed at their nearest step so every existing
 * call site snaps onto the scale without being edited. Component-named keys
 * are deprecated; use the role-named step named in each tag.
 */
export const fontSize = {
  // ---------------------------------------------------------------------
  // The scale
  // ---------------------------------------------------------------------
  /** 10px - uppercase labels, badges, plane markers, "TESTNET" */
  micro: 10,
  /** 10px - section and plane labels (600, uppercase, +0.3px); size shared with `micro` */
  label: 10,
  /** 12px - dense secondary text: list sublines, metadata, deltas */
  caption: 12,
  /** 13px - mono: addresses, hashes, memos, origin strings */
  mono: 13,
  /** 16px - the larger mono size: seed words (DESIGN.md §Hierarchy; size pairs with `bodyLg`) */
  monoLg: 16,
  /** 14px - default UI text: rows, controls, button labels */
  body: 14,
  /** 16px - reading text and primary values in a row */
  bodyLg: 16,
  /** 18px - minor section headings */
  heading: 18,
  /** 20px - card and sheet titles, confirmation amounts */
  title: 20,
  /** 24px - screen headers, sheet headlines */
  headline: 24,
  /** 36px - the largest heading role */
  display: 36,
  /**
   * 48px - the total balance, and nothing else. Owner, 2026-09-02: the number
   * takes the lead; it was 38, the `.pen`'s size. A long total fits itself to
   * the width beside Send/Receive rather than wrapping.
   */
  balance: 48,

  // ---------------------------------------------------------------------
  // Legacy aliases — re-pointed at the scale, kept so consumers keep working
  // ---------------------------------------------------------------------
  /** 10px @deprecated use `micro` */
  xs: 10,
  /** 12px @deprecated use `caption` */
  sm: 12,
  /** 14px @deprecated use `body` */
  base: 14,
  /** 18px @deprecated use `heading` */
  lg: 18,
  /** 20px @deprecated use `title` */
  xl: 20,
  /** 24px @deprecated use `headline` */
  '2xl': 24,
  /** 36px @deprecated use `display` */
  '3xl': 36,
  /** 36px @deprecated use `display` */
  '4xl': 36,
  /** 36px @deprecated use `display` */
  '5xl': 36,

  // ---------------------------------------------------------------------
  // Icon glyph sizes — not text, deliberately off the type scale
  // ---------------------------------------------------------------------
  /** 40px - large icon glyph size (MUI `fontSize` on an icon) */
  iconLg: 40,
} as const;

/**
 * Line heights (multipliers).
 *
 * Four steps, from six. A multiplier rather than a pixel value so one token
 * serves 10px labels and 36px headings alike, and so mobile's `ms()` scaling
 * stays correct. `snug` serves dense rows (the leading a token or transaction
 * row can actually afford); `normal` serves reading text.
 */
export const lineHeight = {
  /** 1.0 - single-line text in a fixed-height box; no leading at all */
  none: 1,
  /** 1.25 - display and headings, where leading would open the block up */
  tight: 1.25,
  /** 1.4 - dense rows: token lists, transaction lists, metadata pairs */
  snug: 1.4,
  /** 1.5 - reading text: paragraphs, descriptions, warnings */
  normal: 1.5,

  /** 1.25 @deprecated use `tight` (was 1.3) */
  condensed: 1.25,
  /** 1.4 @deprecated component-named; use `snug` */
  tokenListItem: 1.4,
  /** 1.5 @deprecated use `normal` (was 1.625) */
  relaxed: 1.5,
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
 * Letter spacing in pixels.
 *
 * Six steps, from ten. Tracking is a correction, not a decoration: negative
 * tracking only exists because large type sets too loose at its default
 * fitting, so it applies from `title` upward and nowhere else. Positive
 * tracking only exists because uppercase and very small type set too tight,
 * so it applies to labels and micro copy. Body-sized text is left at `normal`
 * — the old `slight` (-0.07), `header` (+0.12) and `change` (+0.13) were
 * sub-perceptual at 12-16px and only made the token set unchoosable.
 */
export const letterSpacing = {
  /** -0.12px - titles and headlines (20-24px) */
  snug: -0.12,
  /** 0px - body-sized text; the default */
  normal: 0,
  /** 0.3px - uppercase labels, badges, micro copy */
  label: 0.3,
  /** 1px - maximum tracking; letter-spaced display lockups */
  widest: 1,

  /** -0.25px @deprecated component-named; use `snug` (was -0.245) */
  balance: -0.25,
  /** 0px @deprecated sub-perceptual; use `normal` (was -0.07) */
  slight: 0,
  /** 0px @deprecated sub-perceptual; use `normal` (was 0.13) */
  change: 0,
  /** 0.3px @deprecated use `label` (was 0.25) */
  wide: 0.3,
  /** 0.3px @deprecated use `label` */
  semiWide: 0.3,
  /** 0.5px @deprecated use `loose` */
  wider: 0.5,
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
 * A no-op against the shipped faces, and deliberately kept anyway.
 *
 * DM Sans's stock digits are proportional — `1` is 342 units against `0` at
 * 656 — so a balance visibly reflows every time it repolls, and DM Sans has no
 * `tnum` feature to switch on, which makes `font-variant-numeric` and React
 * Native's `fontVariant` silent no-ops against it. The jitter is therefore
 * fixed one level down, in the binary: `scripts/dmsans.py` bakes one advance
 * width into all ten digits and drops their kern pairs, so every number is
 * tabular whether or not this token is applied (Geist Mono is fixed-pitch and
 * always was).
 *
 * Keep applying it. It costs nothing, it documents intent at the call site,
 * and it is what stays correct if the family is ever swapped for one that does
 * gate tabular figures behind a feature.
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
