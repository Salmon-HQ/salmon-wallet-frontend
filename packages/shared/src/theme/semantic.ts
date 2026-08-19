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

/**
 * Status ink, hue-separated from salmon so errors never read as brand.
 *
 * The `*Tint` values are the tinted notice surfaces — faint washes that sit
 * *under* status ink, never carry text contrast of their own. Their values are
 * inherited unchanged from the retired `colors.status.*Background` layer, so
 * the migration onto these names is a rename, not a repaint.
 * `warningTintBorder` is the one stroke the old layer shipped alongside them.
 */
export const status = {
  success: success[500],
  danger: danger[500],
  warning: warning[500],
  successFill: success[700],
  dangerFill: danger[700],
  warningFill: warning[700],
  /** Tinted notice surface under success ink. */
  successTint: 'rgba(76, 175, 80, 0.1)',
  /** Tinted notice surface under danger ink. */
  dangerTint: 'rgba(239, 68, 68, 0.1)',
  /** Tinted notice surface under warning ink. */
  warningTint: 'rgba(255, 171, 0, 0.1)',
  /** The stroke a warning tint wears when it needs an edge. Decorative. */
  warningTintBorder: 'rgba(255, 171, 0, 0.3)',
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

/**
 * The scales motif — three appearances, three scales, three jobs.
 *
 * In this world the scales are the water column's texture and their *density
 * is a depth cue*: they say how far down you are looking, the way particulate
 * density does in real water. They are not wallpaper, not a chain indicator,
 * and not a brand stamp, so there are exactly three sanctioned uses and no
 * free-form fourth.
 *
 * Every stroke here is deliberately below the 1.4:1 luminance ceiling for a
 * non-informational stroke, which is what keeps the motif decoration rather
 * than a data channel — and what makes it safe to paint behind type.
 *
 * `patternHeight` is a multiplier on the drawing's native 26px tile.
 */
export const scales = {
  /** Deep field — the column's own texture, top to bottom of the ground. */
  deepFieldStroke: 'rgba(199, 211, 232, 0.06)',
  deepFieldScale: 3.2,
  /**
   * @deprecated The field is no longer a band. It filled 180px and dissolved
   * to nothing, which put the entire motif under the balance card and left
   * the lower half of every screen — the empty half — bare. It is now the
   * height of whatever it is mounted in, thinning with depth via
   * `deepFieldFloor` instead of stopping. Kept as an export because
   * `semantic` is read by three apps; no renderer uses it.
   */
  deepFieldHeight: 180,
  /**
   * How much of the deep field survives at the bottom of its container.
   *
   * The field fades downward because density is the depth cue, but it fades
   * *to* this rather than to zero: a motif that reaches zero has an end, and
   * an end at the waterline is what made the fish read as cropped. At 0.35 of
   * a 0.06 stroke the deepest scales measure ~1.02:1 — present, and nowhere
   * near the 1.4:1 ceiling.
   */
  deepFieldFloor: 0.35,
  /**
   * @deprecated The `fish` variant no longer has a call site: salmon fills now
   * carry the flesh texture (`FleshBackground`, `theme/flesh.ts`), because a
   * filled button is mass rather than surface and because the seigaiha tile is
   * taller than a pill, so it reads as a stamp applied on top. Kept because
   * `ScalesVariant` is a public export of `@salmon/ui` with three apps behind
   * it; removing it is a contract change that needs a human's sign-off.
   */
  fishStroke: 'rgba(7, 9, 17, 0.10)',
  fishScale: 1,
  /** Refraction strip — a band clipped to the top edge of any membrane. */
  refractionScale: 0.5,
  refractionOpacity: 0.08,
  refractionHeight: 24,
  /**
   * The strip's horizontal sweep — caustic cyan through `salmon-300` to
   * `success-300`, DESIGN.md §the refraction strip. The direction's only
   * iridescence; composites measure under the 1.4:1 decorative ceiling.
   */
  refractionSweep: ['#9FE0EF', salmon[300], success[300]],
} as const;

/**
 * The flesh motif — the myoseptal texture inside a salmon fill.
 *
 * Scales are skin and belong on grounds and planes; a filled button is mass,
 * so what it shows is the cut surface. The one rule that makes this safe to
 * paint under a label: **the band is always lighter than the fill**, so the
 * texture can only raise luminance and the worst case under `accent.onFill`
 * stays exactly the flat fill's 6.50:1. A darker band, at any opacity, would
 * turn a free guarantee into a contrast budget.
 *
 * Geometry lives in `theme/flesh.ts`; this is only the ink.
 */
export const flesh = {
  /** The pale myoseptal band — the lightest step of the brand ramp. */
  band: salmon[50],
} as const;

/**
 * The water itself — the ground's depth ramp and the matter suspended in it.
 *
 * Two parts, one job: give the column dimension so the deep field's 3.2×
 * scales have something to be enormous *against*. A large arc with empty
 * ground in front of it is equally readable as a small arc nearby; scale is a
 * property of the space, not of the object.
 *
 * `gradient` runs top to bottom and darkens. Its top stop is the ground the
 * three apps actually paint today (`colors.background.primary`, `neutral-950`)
 * rather than the `depth.column` the spec names, so nothing sitting above or
 * beside the ground — a safe-area overlay, a page header, a sheet's backdrop —
 * grows a seam against it. The ramp deepens *from* the shipped ground; moving
 * the ground itself is a separate change. Deeper is darker, which suggests an
 * abyss without drawing a floor, and both stops are legal grounds: every text
 * role that clears AA on `neutral-950` clears it by more on `neutral-1000`, so
 * the ramp can only raise contrast.
 *
 * `snow` is the marine snow's brightest floc; every particle in
 * `theme/depthField.ts` carries a multiplier ≤ 1 on it. It composites to
 * 1.27:1 on the ramp's lightest stop, under the 1.4:1 ceiling for a
 * non-informational stroke — the snow is context, never information, and it
 * obeys The Scales Exclusion Rule: no numbers, rows, addresses, inputs, seed
 * phrases, or approval surfaces behind it.
 *
 * What this deliberately does *not* include: no sand, no seabed, no ambient
 * light shafts. The reasons are in DESIGN.md §The water column.
 */
export const water = {
  /** Ground ramp, top → bottom. Nearer water above, abyss below. */
  gradient: [neutral[950], neutral[1000]] as const,
  /** Marine snow, brightest floc. Particle opacities scale this down. */
  snow: 'rgba(199, 211, 232, 0.12)',
  /**
   * Cold caustic light — what water returns when it catches a highlight.
   *
   * The one cold ink this system allows, and it was already in the app twice
   * before it had a name: The Surfacing's caustic band and the press specular
   * are both `#9FE0EF` hardcoded in `apps/mobile`. It is a token now because
   * the wait's crest is the third use, and three copies of a colour is drift
   * waiting to happen.
   *
   * It is deliberately **not** `accent.ink`. Product, 2026-08: *"las ondas
   * siguen siendo naranjas."* Salmon on a travelling ring reads as a brand
   * element crossing the screen; the crest is light returning off water, so it
   * takes the colour of the material rather than of the company.
   */
  light: '#9FE0EF',
} as const;

export const semantic = {
  depth,
  water,
  surface,
  text,
  border,
  status,
  change,
  state,
  accent,
  scales,
  flesh,
} as const;

export type Semantic = typeof semantic;
