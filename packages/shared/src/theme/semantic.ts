/**
 * Semantic color tokens for Salmon Wallet — "Deep Water".
 *
 * Every value here points at a step in `palette.ts` rather than at a literal.
 * That indirection is the whole point: a light theme becomes a second mapping
 * of the same names onto different ramp indices, so consumers keep asking for
 * `text.primary` and never learn which theme is active.
 *
 * Names are depth names because depth is the system — the app is a column of
 * water, and a surface's name says how far down it sits.
 *
 * This layer is additive. The legacy `colors` export in `colors.ts` still
 * works and is still what most components read today; components move over as
 * they are touched, rather than in one sweeping rename.
 *
 * Works for both React Native (Expo) and Web (WXT+Vite extension).
 */

import { danger, neutral, salmon, success, warning } from './palette';

/**
 * Ground and surfaces, ordered by depth.
 *
 * The two `membrane` tiers are translucent and only guarantee their text
 * contrast when composited over the documented scrim; opaque surfaces are
 * safe anywhere. `bedrock` is opaque by rule, not by accident: the approval
 * and seed-phrase screens must never show anything through them.
 */
export const depth = {
  /** Window/root behind everything. No content sits directly on it. */
  abyss: neutral[1000],
  /** App ground. Hosts the scales field. */
  column: neutral[975],
} as const;

export const surface = {
  /** Default opaque card */
  shelf: neutral[950],
  /** Opaque card above a card */
  raised: neutral[900],
  /** Opaque top elevation — menus, opaque sheets */
  crest: neutral[925],
  /** Translucent tier 1 — pair with blur; see the material model */
  membraneThin: 'rgba(11, 15, 25, 0.62)',
  /** Translucent tier 2 — pair with blur */
  membraneThick: 'rgba(11, 15, 25, 0.80)',
  /** Opaque by rule: approval and seed screens forbid translucency */
  bedrock: neutral[975],
} as const;

/** Text roles. Ratios are quoted against `surface.shelf`. */
export const text = {
  /** 16.37:1 — balances, headings, body */
  primary: neutral[50],
  /** 8.59:1 — labels, supporting rows */
  secondary: neutral[300],
  /** 6.24:1 — timestamps, address middles, placeholders */
  tertiary: neutral[400],
  /** 4.37:1 — disabled controls */
  disabled: neutral[500],
  /** 6.07:1 — salmon used as ink */
  accent: salmon[500],
  /** 6.50:1 on a salmon fill. The only text color allowed on one. */
  onAccent: neutral[1000],
  /** Text over any membrane; the scrim floor guarantees the ratio */
  onGlass: neutral[50],
} as const;

/**
 * Borders are per-plane because WCAG 1.4.11's 3:1 requirement is measured
 * against whatever the border sits on. Any border above `surface.shelf` must
 * use `raised` or stronger — `default` drops to 2.82:1 on `surface.raised`.
 */
export const border = {
  /** 3.08:1 on `surface.shelf` */
  default: neutral[600],
  /** 3.99:1 on `surface.raised`, 3.74:1 on `surface.crest` */
  raised: neutral[500],
  /** 6.24:1 on `surface.shelf` — emphasis and focus targets */
  strong: neutral[400],
  /** Decorative only. Nothing meaningful may depend on seeing this line. */
  hairline: 'rgba(199, 211, 232, 0.10)',
} as const;

/** Status ink, hue-separated from salmon so errors never read as brand. */
export const status = {
  success: success[500],
  danger: danger[500],
  warning: warning[500],
  successFill: success[700],
  dangerFill: danger[700],
  warningFill: warning[700],
} as const;

/**
 * Price movement. The previous lime `#80ff54` is retired — it was the single
 * most generic "crypto app" value in the palette, and it collided with the
 * success ramp for no benefit.
 */
export const change = {
  positive: success[500],
  negative: danger[500],
  neutral: neutral[400],
} as const;

/**
 * Interaction states, applied as an overlay on any surface so one system
 * covers every control instead of each component inventing its own.
 *
 * `focusVisible` is a ring, never a removal. It is the token that was missing
 * entirely: without it a keyboard user cannot tell which control is focused,
 * which on a transaction-approval screen is a fund-safety problem, not a
 * cosmetic one.
 */
export const state = {
  hover: 'rgba(199, 211, 232, 0.06)',
  press: 'rgba(199, 211, 232, 0.10)',
  /** Ring color; pair with a 2px offset ring in `depth.abyss` */
  focusVisible: salmon[300],
  focusRingWidth: 2,
  focusRingOffset: 2,
  selectedFill: 'rgba(255, 92, 69, 0.12)',
  selectedEdge: salmon[500],
  disabledOpacity: 0.45,
  loadingOpacity: 0.5,
} as const;

/** Salmon-tinted backgrounds that sit *under* salmon ink (5.29:1 composite). */
export const accent = {
  ink: salmon[500],
  tint: 'rgba(255, 92, 69, 0.10)',
  tintHover: 'rgba(255, 92, 69, 0.15)',
  /** Fill + the only legal text color on it */
  fill: salmon[500],
  onFill: neutral[1000],
} as const;

export const semantic = {
  depth,
  surface,
  text,
  border,
  status,
  change,
  state,
  accent,
} as const;

export type Semantic = typeof semantic;
