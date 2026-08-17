/**
 * The Surfacing — the timeline, as data.
 *
 * DESIGN.md §The Surfacing specifies the signature moment: over `tide`
 * (720ms) the sheet's membrane clears, a caustic band travels from the bottom
 * of the sheet up to the amount, and the amount settles behind it. Exactly one
 * screen owns it — the confirmation of a completed send or swap — and it never
 * repeats.
 *
 * The plan lives here as a pure function of the reduce-motion flag so the
 * *timing* can be tested without a renderer, a native module, or a frame
 * clock. `TransactionSuccessScreen` reads the plan and drives it.
 *
 * Reduced motion is a **parallel mapping, not an off switch**: the membrane
 * still clears (in one step), the caustic light still appears (once, static,
 * over the amount), the amount still lands, and the success haptic still
 * fires. What is removed is travel.
 */
import { motionMs, semantic } from '@salmon/shared';

// ============================================================================
// Fixed quantities
// ============================================================================
//
// These are DESIGN.md §The Surfacing's own numbers. They are local constants
// rather than theme tokens because the theme has no vocabulary for them yet —
// `motionMs` covers the duration ramp, and `scales` covers the motif, but the
// caustic band's geometry and the band→amount lag have no tokens. Adding them
// to `packages/shared` is a change to a package this app does not own.

/** Membrane tint alpha at rest — the value baked into `surface.membraneThick`. */
export const MEMBRANE_ALPHA_FROM = 0.8;
/** Membrane tint alpha once cleared: the water above the transaction thins. */
export const MEMBRANE_ALPHA_TO = 0.55;

/**
 * The membrane is painted as one view filled with `surface.membraneThick`, so
 * "α 0.80 → 0.55" is a view opacity of 1 → 0.6875. Deriving the ratio keeps
 * the two halves of the statement from drifting apart.
 */
export const MEMBRANE_OPACITY_TO = MEMBRANE_ALPHA_TO / MEMBRANE_ALPHA_FROM;

/**
 * Height of the caustic band, in points. Its ink and its 0.5× scale live with
 * the rest of the motif, in `ScalesBackground`'s `caustic` variant.
 */
export const BAND_HEIGHT = 140;

/** How long the band takes to travel from the bottom of the sheet to the amount. */
export const BAND_TRAVEL_MS = 560;
/** The amount finishes settling this long after the band has passed it. */
export const AMOUNT_LAG_MS = 120;
/** The amount rises this far, in points, as it settles. */
export const AMOUNT_RISE = 6;
/** Reduced motion: how long the static caustic highlight holds before fading. */
export const STATIC_HIGHLIGHT_HOLD_MS = 400;

// ============================================================================
// The plan
// ============================================================================

export interface SurfacingTimeline {
  /** The sheet's membrane clearing from `MEMBRANE_ALPHA_FROM` to `_TO`. */
  membrane: { durationMs: number };
  /**
   * The caustic band.
   *
   * `travel` — it rises from the bottom of the screen to the amount and
   * dissipates. `static` — it is drawn once across the amount, holds, and
   * fades; nothing moves.
   */
  band: { mode: 'travel' | 'static'; durationMs: number; fadeMs: number };
  /** The amount settling. `rise` is 0 when the amount must not translate. */
  amount: { rise: number; delayMs: number; durationMs: number };
  /** Everything that is not the Surfacing: the status line, link and button. */
  chrome: { durationMs: number; delayMs: number; staggerMs: number };
}

/**
 * Build the timeline for the current reduce-motion setting.
 *
 * The full-motion plan is anchored on `tide`. The amount's delay is *derived*
 * so that it finishes exactly `AMOUNT_LAG_MS` after the band arrives, rather
 * than being a second hand-tuned number that can fall out of step with the
 * first.
 */
export function surfacingTimeline(isReduceMotionEnabled: boolean): SurfacingTimeline {
  if (isReduceMotionEnabled) {
    return {
      // One step, not zero: the membrane clearing is the event, and deleting
      // it would delete the feedback reduced motion is meant to preserve.
      membrane: { durationMs: motionMs.swell },
      band: { mode: 'static', durationMs: STATIC_HIGHLIGHT_HOLD_MS, fadeMs: motionMs.ebb },
      // No translation. The amount is simply there.
      amount: { rise: 0, delayMs: 0, durationMs: motionMs.swell },
      chrome: { durationMs: motionMs.swell, delayMs: 0, staggerMs: 0 },
    };
  }

  return {
    membrane: { durationMs: motionMs.tide },
    // The band dissipates in whatever `tide` has left after the travel, not in
    // `ebb`: 560 + 180 is 740, and a band still fading after the membrane has
    // finished clearing turns one physical event into two. 160ms against
    // `ebb`'s 180 is below the threshold where an exit reads as a glitch, and
    // it keeps the moment inside the one duration reserved for it.
    band: { mode: 'travel', durationMs: BAND_TRAVEL_MS, fadeMs: motionMs.tide - BAND_TRAVEL_MS },
    amount: {
      rise: AMOUNT_RISE,
      delayMs: BAND_TRAVEL_MS + AMOUNT_LAG_MS - motionMs.drift,
      durationMs: motionMs.drift,
    },
    // Then everything is still: the rest of the screen arrives after the
    // Surfacing has finished, not competing with it.
    chrome: { durationMs: motionMs.drift, delayMs: motionMs.tide, staggerMs: motionMs.stagger },
  };
}

/** When the amount has finished landing, measured from the start of `tide`. */
export function amountLandsAtMs(timeline: SurfacingTimeline): number {
  return timeline.amount.delayMs + timeline.amount.durationMs;
}

/**
 * The membrane's rest colour. Exported so the test can assert the alpha this
 * module assumes is the alpha the token actually carries — if `membraneThick`
 * is ever retuned, `MEMBRANE_OPACITY_TO` becomes a lie, silently.
 */
export const MEMBRANE_TINT = semantic.surface.membraneThick;
