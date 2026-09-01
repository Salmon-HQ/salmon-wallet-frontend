/**
 * Semantic color tokens for Salmon Wallet — "Deep Water".
 *
 * Every value here points at a step in `palette.ts` rather than at a literal.
 * That indirection is the whole point: the light theme is a second mapping of
 * the same names onto different ramp indices, so consumers keep asking for
 * `text.primary` and never learn which mode is active.
 *
 * Names are depth names because depth is the system — the app is a column of
 * water, and a surface's name says how far down it sits.
 *
 * ## The resolver
 *
 * `createSemantic(mode)` builds the whole token object once per mode. Every
 * leaf that differs between modes is written as `pick({ dark, light })`, so
 * the two ramp indices for a token sit on the same line and cannot drift
 * apart in separate files. A leaf written as a plain value is invariant by
 * construction — `accent.fill` and `accent.onFill` are the two the brand
 * depends on (DESIGN.md §Two modes), and the scanner overlay is invariant
 * because a camera view is always dark.
 *
 * `export const semantic = createSemantic('dark')` is unchanged in shape and
 * in value: web, extension, `packages/ui` and every mobile file that has not
 * moved to the theme hook keep reading the same static object.
 *
 * Works for both React Native (Expo) and Web (WXT+Vite extension).
 */

import { danger, neutral, salmon, success, warning } from './palette';

export type ThemeMode = 'dark' | 'light';

/** One resolver entry: what each mode reads for a single token. */
interface ModeRefs<T> {
  dark: T;
  light: T;
}

/**
 * Builds the semantic layer for one mode.
 *
 * Light values come from `specs/021-light-theme/spec.md`, whose source is the
 * `product.pen` light drawing mapped onto the existing ramp. Where the `.pen`
 * value would fail WCAG the ramp step wins — those rows are commented
 * individually, because an accessibility override that is not written down
 * gets "fixed" back to the drawing six months later.
 */
export function createSemantic(mode: ThemeMode) {
  const pick = <T>(refs: ModeRefs<T>): T => refs[mode];

  /**
   * Ground and surfaces, ordered by depth.
   *
   * The two `membrane` tiers are translucent and only guarantee their text
   * contrast when composited over the documented scrim; opaque surfaces are
   * safe anywhere. `bedrock` is opaque by rule, not by accident: the approval
   * and seed-phrase screens must never show anything through them.
   */
  const depth = {
    /** Window/root behind everything. No content sits directly on it. */
    abyss: pick({ dark: neutral[1000], light: neutral[50] }),
    /** App ground. Hosts the scales field. */
    column: pick({ dark: neutral[975], light: neutral[25] }),
  } as const;

  const surface = {
    /** Default opaque card */
    shelf: pick({ dark: neutral[950], light: neutral[0] }),
    /** Opaque card above a card */
    raised: pick({ dark: neutral[900], light: neutral[0] }),
    /**
     * Opaque top elevation — menus, opaque sheets.
     *
     * Deviation from the spec table's `neutral-25` (a row the spec marks
     * "derived", not drawn): `neutral-25` is also `depth.column`, so a menu
     * would land in the app's own ground, and `text.tertiary` measures 4.01:1
     * on it — under AA on the surface menus put their supporting copy. On a
     * light ground elevation is carried by the shadow (`createShadows`), not
     * by a lighter plane, so the top elevation is the same white card.
     */
    crest: pick({ dark: neutral[925], light: neutral[0] }),
    /**
     * Translucent tier 1 — pair with blur; see the material model.
     *
     * Lowered from 0.62 (2026-09-01, owner: what lies under a sheet or a card
     * must show through). The thermocline's only remaining thin-tier consumer
     * is content — Card's `surface` tone, and the token rows built on it — so
     * the worst case that governs the alpha is what actually sits under a
     * card: the water column's own ground (`water.gradient`), not an arbitrary
     * bright backdrop. `contrast.test.ts` asserts `text.primary` stays ≥4.5:1
     * against that ground.
     *
     * Mode-invariant for now: the thermocline's light re-tune is a dedicated
     * pass (spec 021, "flesh/scales/water" row). Until then a light-mode
     * surface does not use the membrane tiers.
     */
    membraneThin: 'rgba(11, 15, 25, 0.48)',
    /**
     * Translucent tier 2 — pair with blur.
     *
     * Lowered from 0.80 (2026-09-01, same ruling). Still measured against
     * `water.gradient`'s worst case in `contrast.test.ts`. Mode-invariant for
     * the same reason as `membraneThin`.
     */
    membraneThick: 'rgba(11, 15, 25, 0.66)',
    /** Opaque by rule: approval and seed screens forbid translucency */
    bedrock: pick({ dark: neutral[975], light: neutral[0] }),
  } as const;

  /**
   * Text roles. Dark ratios are quoted against `surface.shelf`, light ratios
   * against the white card `surface.shelf` becomes.
   */
  const text = {
    /** 16.37:1 dark / 13.72:1 light — balances, headings, body */
    primary: pick({ dark: neutral[50], light: neutral[850] }),
    /**
     * 8.59:1 dark / 8.75:1 light — labels, supporting rows.
     *
     * The `.pen` draws `#667085` (≈ `neutral-500`); the spec table steps that
     * to `neutral-600` for headroom. One further step, because `tertiary` is
     * forced onto `neutral-600` by the AA floor below and the two roles have
     * to stay a visible step apart. The light ladder (13.72 / 8.75 / 6.03)
     * mirrors the dark one (16.37 / 8.59 / 6.24) almost exactly.
     */
    secondary: pick({ dark: neutral[300], light: neutral[700] }),
    /**
     * 6.24:1 dark / 6.03:1 light — timestamps, address middles, placeholders.
     *
     * This role is text, so 1.4.3 applies. The `.pen`'s muted `#98A2B3`
     * (≈ `neutral-400`) measures 2.98:1 on white and the spec table's
     * `neutral-500` measures 4.25:1 — both under the 4.5:1 floor.
     * `neutral-600` is the first step that clears it. `neutral-500` is still
     * the right step for a *boundary* (3:1), which is what `input.edge` and
     * `step.inactive` take below.
     */
    tertiary: pick({ dark: neutral[400], light: neutral[600] }),
    /** 4.37:1 dark — disabled controls. Non-text use only in light. */
    disabled: pick({ dark: neutral[500], light: neutral[400] }),
    /** 6.07:1 dark / 5.48:1 light — salmon used as ink */
    accent: pick({ dark: salmon[500], light: salmon[700] }),
    /**
     * 6.50:1 on a salmon fill, in both modes. The only text color allowed on
     * one, and one of the two theme-invariant values (DESIGN.md §Two modes).
     * The `.pen` draws white on the brand fill; rejected at 3.06:1.
     */
    onAccent: neutral[1000],
  } as const;

  /**
   * Borders are per-plane because WCAG 1.4.11's 3:1 requirement is measured
   * against whatever the border sits on. Any border above `surface.shelf` must
   * use `raised` or stronger — `default` drops to 2.82:1 on `surface.raised`.
   */
  const border = {
    /**
     * 3.08:1 on dark `surface.shelf`. In light this is the `.pen`'s decorative
     * card hairline (`#E4E7EC` ≈ `neutral-100`, 1.19:1 on white) — a
     * decorative edge, exempt from 1.4.11. Anything that must be *seen* in
     * light uses `border.raised` or `border.strong`.
     */
    default: pick({ dark: neutral[600], light: neutral[100] }),
    /** 3.99:1 on dark `surface.raised`; 4.27:1 on the light white card */
    raised: pick({ dark: neutral[500], light: neutral[500] }),
    /**
     * Emphasis and focus targets — 6.24:1 dark, 6.03:1 light.
     *
     * Deviation from the spec table, which maps this to the `.pen`'s
     * `border-strong` (`#CDD2DA` ≈ `neutral-200`, 1.30:1 on white). This token
     * is load-bearing — chip outlines, hovered outlined buttons, the scanner's
     * viewfinder corners — so it keeps the dark mode's job and its ratio; the
     * `.pen`'s stronger *decorative* edge is `border.default`'s neighbourhood.
     */
    strong: pick({ dark: neutral[400], light: neutral[600] }),
    /** Decorative only. Nothing meaningful may depend on seeing this line. */
    hairline: pick({
      dark: 'rgba(199, 211, 232, 0.10)',
      light: 'rgba(22, 28, 45, 0.08)',
    }),
  } as const;

  /**
   * Status ink, hue-separated from salmon so errors never read as brand.
   *
   * The `*Tint` values are the tinted notice surfaces — faint washes that sit
   * *under* status ink, never carry text contrast of their own. The dark
   * values are inherited unchanged from the retired `colors.status.*Background`
   * layer; the light ones are the `.pen`'s soft washes, now the `50` step of
   * each status ramp.
   *
   * `*Fill` is mode-invariant: a filled status control is the `700` step in
   * both modes, and the ink on it is light in both modes — it is **not**
   * `text.primary` in light. `contrast.test.ts` pins that.
   */
  const status = {
    success: pick({ dark: success[500], light: success[700] }),
    danger: pick({ dark: danger[500], light: danger[700] }),
    warning: pick({ dark: warning[500], light: warning[700] }),
    successFill: success[700],
    dangerFill: danger[700],
    warningFill: warning[700],
    /** Tinted notice surface under success ink. */
    successTint: pick({ dark: 'rgba(76, 175, 80, 0.1)', light: success[50] }),
    /** Tinted notice surface under danger ink. */
    dangerTint: pick({ dark: 'rgba(239, 68, 68, 0.1)', light: danger[50] }),
    /** Tinted notice surface under warning ink. */
    warningTint: pick({ dark: 'rgba(255, 171, 0, 0.1)', light: warning[50] }),
    /** The stroke a warning tint wears when it needs an edge. Decorative. */
    warningTintBorder: pick({ dark: 'rgba(255, 171, 0, 0.3)', light: warning[500] }),
  } as const;

  /**
   * Price movement. The previous lime `#80ff54` is retired — it was the single
   * most generic "crypto app" value in the palette, and it collided with the
   * success ramp for no benefit.
   *
   * Light takes the same `700` steps as the status inks: a `500` step is
   * chosen to be readable on deep neutrals and measures under 2:1 on white.
   */
  const change = {
    positive: pick({ dark: success[500], light: success[700] }),
    negative: pick({ dark: danger[500], light: danger[700] }),
    neutral: pick({ dark: neutral[400], light: neutral[500] }),
  } as const;

  /**
   * Interaction states, applied as an overlay on any surface so one system
   * covers every control instead of each component inventing its own.
   *
   * `focusVisible` is a ring, never a removal. It is the token that was missing
   * entirely: without it a keyboard user cannot tell which control is focused,
   * which on a transaction-approval screen is a fund-safety problem, not a
   * cosmetic one. On a light ground the ring steps to `salmon-700` — the
   * lighter brand steps measure under 3:1 on `depth.column`.
   */
  const state = {
    hover: pick({ dark: 'rgba(199, 211, 232, 0.06)', light: 'rgba(22, 28, 45, 0.06)' }),
    press: pick({ dark: 'rgba(199, 211, 232, 0.10)', light: 'rgba(22, 28, 45, 0.10)' }),
    /** Ring color; pair with a 2px offset ring in `depth.abyss` (dark only) */
    focusVisible: pick({ dark: salmon[300], light: salmon[700] }),
    focusRingWidth: 2,
    focusRingOffset: 2,
    selectedFill: 'rgba(255, 92, 69, 0.12)',
    selectedEdge: pick({ dark: salmon[500], light: salmon[700] }),
    disabledOpacity: 0.45,
  } as const;

  /** Salmon-tinted backgrounds that sit *under* salmon ink (5.29:1 composite). */
  const accent = {
    ink: pick({ dark: salmon[500], light: salmon[700] }),
    /**
     * Salmon as *text* on a membrane. `accent.ink` measures 3.44:1 on
     * `membraneThick`'s worst-case composite (#3C3F47) — fine for a 26px icon
     * (1.4.11, 3:1) but under the 4.5:1 AA floor for small text. This step
     * clears it at 5.27:1, so an active tab label can stay salmon without the
     * icon losing the brand step. Asserted in `contrast.test.ts`.
     *
     * Invariant while the membrane tiers are: it is ink for a dark material.
     */
    inkOnMembrane: salmon[300],
    tint: pick({ dark: 'rgba(255, 92, 69, 0.10)', light: salmon[50] }),
    tintHover: pick({ dark: 'rgba(255, 92, 69, 0.15)', light: salmon[100] }),
    /** Fill + the only legal text color on it. Both theme-invariant. */
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
   *
   * Mode-invariant: the underwater material's light re-tune is a dedicated
   * pass. Until it lands, light-mode backgrounds render their ground flat and
   * the motif is simply not drawn (spec 021).
   */
  const scales = {
    /**
     * Deep field — the column's own texture, top to bottom of the ground.
     *
     * Halved from 0.06 (2026-09-01, owner: the water column scales should
     * read as farther away). Still visible on an OLED at full brightness —
     * ~1.05:1 on `depth.column`, above the ~1.03:1 floor — but noticeably
     * fainter than before. Opacity only; `deepFieldScale` is unchanged.
     */
    deepFieldStroke: 'rgba(199, 211, 232, 0.03)',
    deepFieldScale: 3.2,
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
    /** Seigaiha tile scale the refraction variant uses. */
    refractionScale: 0.5,
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
   * Invariant: the fill it lives inside is invariant, so its texture is too.
   *
   * Geometry lives in `theme/flesh.ts`; this is only the ink.
   */
  const flesh = {
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
   * Mode-invariant, same ruling as `scales`: light grounds render flat until
   * the material's light pass.
   *
   * What this deliberately does *not* include: no sand, no seabed, no ambient
   * light shafts. The reasons are in DESIGN.md §The water column.
   */
  const water = {
    /** Ground ramp, top → bottom. Nearer water above, abyss below. */
    gradient: [neutral[950], neutral[1000]] as const,
    /**
     * Marine snow, brightest floc. Particle opacities scale this down.
     *
     * Lowered from 0.12 (owner, on device): the field was reading as weather
     * rather than as water. The contrast argument is unchanged in direction and
     * only gets safer — 1.20:1 on the ramp's lightest stop against the 1.4:1
     * ceiling a non-informational stroke is held to.
     */
    snow: 'rgba(199, 211, 232, 0.09)',
    /**
     * Cold caustic light — what water returns when it catches a highlight.
     *
     * The one cold ink this system allows. It was promoted to a token when the
     * wait's crest became its third consumer and three copies of a literal is
     * drift waiting to happen; the caustic band that was one of the three has
     * since been deleted with the receipt's entrance, so the live consumers are
     * the press specular and the crest (DESIGN.md §The wait).
     *
     * It is deliberately **not** `accent.ink` (DESIGN.md §The wait: *"las ondas
     * siguen siendo naranjas"*). Salmon on a travelling ring reads as a brand
     * element crossing the screen; the crest is light returning off water, so it
     * takes the colour of the material rather than of the company.
     */
    light: '#9FE0EF',
  } as const;

  /**
   * Loading-state shimmer. Two neutral steps, not one, so the sweep between
   * them reads as motion. In dark, `surface.crest` only cleared 1.07:1 against
   * `surface.raised` — not enough to see move — so the highlight steps to
   * `neutral-800`, the nearest ramp step that clears the visibility floor
   * (1.38:1, asserted in `contrast.test.ts`).
   *
   * Light deviates from the spec table's `neutral-50 / neutral-100`: those two
   * steps measure 1.14:1, under the same 1.3:1 floor the dark pair is held to
   * (light neutrals sit at the compressed end of the luminance curve, so
   * adjacent steps buy almost no ratio). The visibility floor is the
   * requirement and the steps are derived, so the pair moves to
   * `neutral-200 / neutral-50` — 1.45:1, and the sweep runs lighter, which is
   * the direction a shimmer runs on a light ground.
   *
   * Consumer: `Skeleton`.
   */
  const skeleton = {
    base: pick({ dark: surface.raised, light: neutral[200] }),
    highlight: pick({ dark: neutral[800], light: neutral[50] }),
  } as const;

  /**
   * Text-entry fields. From the legacy `colors.input.background`
   * (`rgba(64, 73, 98, 0.2)`, composited it lands within a few hex steps of
   * `surface.raised`) and `colors.input.border` (`neutral-600`). Placeholder
   * ink reuses `text.tertiary`, the same role the legacy `colors.text.tertiary`
   * doc comment already named as "also used as placeholder color".
   *
   * In light the field's ground is the card it sits on, so the *edge* is what
   * makes it a field: `neutral-500`, 4.27:1, well over the 3:1 a form control's
   * boundary is held to (1.4.11). `border.default`'s light step is decorative
   * and would leave the field invisible.
   *
   * Consumers: `TextField`, `AmountInput`, `RecipientInput`.
   */
  const input = {
    ground: surface.raised,
    edge: pick({ dark: border.default, light: neutral[500] }),
    placeholder: text.tertiary,
  } as const;

  /**
   * Full-bleed scrims — the wash behind a sheet, dialog, or hovered/pressed
   * row. In dark both are `depth.abyss` at the alpha the legacy layer already
   * used, so the migration is a rename of the alpha, not a re-tune of it. In
   * light they keep the alphas and take `neutral-900` as their ink: a scrim
   * darkens whatever it covers in both modes.
   *
   * `backdrop` takes `colors.dialog.overlay`'s alpha (0.7) rather than
   * `colors.sheet.backdrop`'s fully-opaque black — the dialog value is the one
   * every current sheet/dialog consumer actually renders; the plain-opaque
   * form is a stronger scrim than any live surface uses today.
   * Consumers: `BaseDialog`, `BaseSheetDialog` (`backdrop`); hover/press
   * overlays on dark imagery (`scrim`, from `colors.overlay.darkHover`).
   */
  const overlay = {
    backdrop: pick({ dark: 'rgba(7, 9, 17, 0.7)', light: 'rgba(22, 28, 45, 0.7)' }),
    /** The press/selection wash on a card (was colors.interactive.highlight). */
    highlight: pick({ dark: 'rgba(255, 255, 255, 0.2)', light: 'rgba(22, 28, 45, 0.2)' }),
    scrim: pick({ dark: 'rgba(7, 9, 17, 0.9)', light: 'rgba(22, 28, 45, 0.9)' }),
  } as const;

  /**
   * The bottom-sheet drag handle. From `colors.sheet.handle` (`#b9b9b9`,
   * 4.85:1 on `surface.shelf`) — close enough to `text.tertiary` that the step
   * is a rename, not a re-tune. Consumer: `BottomSheetContainer`'s handle bar.
   */
  const sheet = {
    handle: text.tertiary,
  } as const;

  /**
   * Step/progress indicators (onboarding dots, multi-step forms). From
   * `colors.step.active` (`#FF5C45`, exactly `salmon-500`) and
   * `colors.step.inactive` (`rgba(255, 255, 255, 0.3)`, an translucent white
   * that reads as `border.default` opaque on the deep-water ground).
   *
   * An inactive step is a UI boundary that carries meaning — it says how many
   * steps remain — so in light it takes `neutral-500` (3:1 floor) rather than
   * `border.default`'s decorative hairline.
   *
   * Consumer: `StepIndicator`.
   */
  const step = {
    active: accent.ink,
    inactive: pick({ dark: border.default, light: neutral[500] }),
  } as const;

  /**
   * The QR scanner overlay — its own isolated sub-system, same as it was in
   * `colors.scanner`. The legacy hexes (`#1a1a2e`, `#2a2a4e`, `#8b8b9e`,
   * `#6b6b7e`, `#4a4a6e`) were off-palette (no hue-222 blue bias); every step
   * below is the nearest ramp/role that reads the same depth on the ground.
   *
   * Theme-invariant by ruling (spec 021): a camera viewfinder is always dark,
   * whatever mode the app is in, so these are the dark steps in both — written
   * as ramp steps rather than as `depth.*` so a light mode cannot brighten
   * them by accident.
   *
   * Consumer: `QRScanner` / `ScanScreen`.
   */
  const scanner = {
    /** From `colors.scanner.background` (`#1a1a2e`) — the camera view's ground. */
    ground: neutral[1000],
    /** From `colors.scanner.surface` (`#2a2a4e`) — the mask panel around the scan window. */
    frame: neutral[900],
    /** From `colors.scanner.button` (`#4a4a6e`) — the viewfinder corner brackets. */
    corner: neutral[400],
    /**
     * From `colors.scanner.textSecondary`/`textTertiary` (`#8b8b9e`/`#6b6b7e`,
     * two tones collapsed to one) — the instruction copy under the scan window.
     */
    hint: neutral[300],
  } as const;

  return {
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
    skeleton,
    input,
    overlay,
    sheet,
    step,
    scanner,
  } as const;
}

/**
 * The deep-water token set, resolved once at module load.
 *
 * This is the export three apps read as a static object. It is byte-for-byte
 * what the hand-written layer shipped before the resolver landed —
 * `semantic.test.ts` asserts that against a frozen snapshot.
 */
export const semantic = createSemantic('dark');

export type Semantic = typeof semantic;

// The token groups as loose names, for the modules inside this package that
// import one group rather than the whole object (`colors.ts`, the motion
// layer, the theme tests). Dark, like `semantic` — anything that has to follow
// the active mode reads `useTheme()` instead.
export const {
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
  skeleton,
  input,
  overlay,
  sheet,
  step,
  scanner,
} = semantic;
