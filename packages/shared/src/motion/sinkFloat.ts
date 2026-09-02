/**
 * The sink and the float — the transition verb's numbers, shared by every
 * platform that speaks it.
 *
 * The verb (DESIGN.md, §The sink and the float — the transition verb): when
 * one piece of content replaces another, **leaving is sinking** — the outgoing
 * content recedes to `SINK_EXIT_SCALE` and drops `SINK_FLOAT_TRAVEL`
 * accelerating on the `sink` curve, its opacity falling the way light falls
 * with depth — and **arriving is floating** — the incoming content rises the
 * same distance from `FLOAT_ENTER_SCALE` and comes to rest on `settle`
 * (buoyancy running out: no overshoot, per the system rule that nothing
 * bounces).
 *
 * **The depth reading** (DESIGN.md, §The verb reads as depth, not as a
 * slide): the geometry below is weighted so that **scale carries the Z and
 * travel is only an accent**. The verb first shipped the other way round —
 * 28dp of travel and no scale at all on the exit — and translation dominating
 * meant the swap read as a Y-slide: content sliding off a shelf rather than
 * content going away from the viewer. Scale is the Z cue every depth idiom
 * uses (Material's shared-Z-axis, the iOS sheet push-back, aerial
 * perspective), so the same verb was re-weighted onto it: the travel shrank to
 * a buoyancy accent and both halves gained a real recession. **Only the
 * geometry moved** — every clock, curve, beat and stagger below is the one the
 * water's-clock recalibration already settled.
 *
 * The constants live here for the same reason the wavefront's and the crest's
 * timing does: the verb is drawn twice — Reanimated in `apps/mobile`, CSS
 * animations in `packages/ui` — and a number tuned in one of them is a number
 * that has drifted. **Constants only.** The animation *functions* stay in
 * their platforms: they speak Reanimated on one side and keyframes on the
 * other, and neither can cross into this package, which has to stay importable
 * from React Native.
 *
 * Recalibrated to the water's own clock (DESIGN.md, "Recalibrated to the
 * water's own clock"): the verb first shipped on generic-UI numbers — 12dp
 * over `drift` in and `ebb` out — and read as a fade with a direction, because
 * this system's water runs at 700–2000ms (the logo's return is `tide`, the
 * wavefront's crossing 2000). So every number below is re-derived from The
 * Surfacing rather than from any generic motion spec, and every one of them is
 * a **named tunable** calibrated by eye on device, with its band recorded
 * beside it.
 *
 * Beer–Lambert light: opacity is not linear in time. Transmittance through a
 * scattering medium decays as `exp(−μ·depth)`, so the entering opacity runs on the
 * accelerating `sink` bezier — the vocabulary's closest curve to that
 * exponential — while the travel runs on `settle`. The light returns late and
 * fast; the arrival is heavily damped. Sinking is the mirror.
 *
 * No new duration tokens are minted here: the verb spends the vocabulary in
 * `motionMs` that it found.
 *
 * @module motion/sinkFloat
 */

import { motionMs } from '../theme/durations';

/**
 * How far things travel — dp on mobile, px on the DOM. The buoyancy accent,
 * not the carrier: scale speaks the depth (see the two scales below), and
 * travel only tips the eye which way the Z is going. Band 0–10: at 0 the swap
 * is pure depth and can read as a crossfade-zoom; above ~10 the slide starts
 * competing with the scale again and the verb slides instead of receding.
 * Chrome speaks the same verb at half this distance.
 */
export const SINK_FLOAT_TRAVEL = 8;

/**
 * How much of a finger's travel a value under the finger actually takes. Below
 * 1 the value lags the drag, which is what reads as resistance — water, not a
 * page turning. Band 0.4–0.8: at 1 the value is stuck to the finger and the
 * gesture has no cost; under ~0.4 it stops answering at all.
 */
export const DRAG_FOLLOW = 0.6;

/**
 * How far a value travels sideways to leave, and the distance its replacement
 * arrives from — one number, because arriving is exactly the mirror of
 * leaving. Far enough to be a departure rather than a nudge; the light is
 * already out before it gets there, so it never has to reach a real edge.
 */
export const LATERAL_SWAP_TRAVEL = 64;

/**
 * Where the incoming content arrives from — small → full, an arrival *from*
 * depth, the exact mirror of {@link SINK_EXIT_SCALE} so the two halves ride
 * one continuous Z axis. Band 0.88–0.93: above ~0.93 the depth is too subtle
 * to out-speak the travel; below ~0.88 it reads as a zoom, not a depth.
 */
export const FLOAT_ENTER_SCALE = 0.9;

/**
 * Where the outgoing content recedes to — the push-back itself, and the reason
 * the exit is no longer a Y-slide: before this the sink animated translation
 * and light only, so the swap read as content dropping off a shelf rather than
 * as content going away from the viewer. Same band and same reasoning as
 * {@link FLOAT_ENTER_SCALE}; equal to it by intent, not by coincidence.
 */
export const SINK_EXIT_SCALE = 0.9;

/**
 * Chrome's depth — a header line, a title, a back affordance — for both halves
 * of the verb. Chrome has always spoken the verb at *half*, and that rule now
 * translates into the medium that carries the depth: half the **depth**, not
 * half the travel. Content recedes 0.10 from full, so chrome recedes 0.05 →
 * 0.95. Band 0.93–0.97: the literal old reading (half the travel, 4dp) is not
 * a gesture at all any more, and a chrome depth below ~0.93 stops being
 * secondary to the content it frames.
 *
 * The travel override at half (`SINK_FLOAT_TRAVEL / 2`) still stands beside
 * it: travel is the buoyant accent, and chrome's accent is still half.
 */
export const CHROME_SCALE = 0.95;

/**
 * The float's length — `drift`×2 (560ms). Band 450–650: on the water's clock,
 * between `rise` and `tide`, short of ever feeling like The Surfacing.
 */
export const FLOAT_IN_MS = motionMs.drift * 2;

/**
 * The sink's length — `tide`/2 (360ms). Band 320–400. Shorter than the float,
 * as everywhere — but no longer `ebb`: water swallows things at its own speed.
 */
export const SINK_OUT_MS = motionMs.tide / 2;

/**
 * The beat between the sink and the float: the full sink plus a short
 * perceptible stillness (band 90–120 — under ~80 the beat vanishes, over ~150
 * it reads as lag). Without it the two halves overlap and the eye never reads
 * the double gesture.
 *
 * Spend it **only where something actually sank first** — a keyed content
 * swap, a step change with a real exit. On an arrival with no prior sink (a
 * first mount) the same delay is pure lag, so those sites pass nothing.
 */
export const FLOAT_DELAY_MS = SINK_OUT_MS + 90;

/**
 * The step between bands when a surface arrives in pieces. Inherited from The
 * Surfacing's chrome stagger; band 24–40. Small groups only — never more than
 * 4–5 steps.
 */
export const SINK_FLOAT_STAGGER_MS = motionMs.stagger;
