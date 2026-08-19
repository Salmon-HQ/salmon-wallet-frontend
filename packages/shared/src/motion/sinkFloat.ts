/**
 * The sink and the float — the transition verb's numbers, shared by every
 * platform that speaks it.
 *
 * The verb (DESIGN.md, §The sink and the float — the transition verb): when
 * one piece of content replaces another, **leaving is sinking** — the outgoing
 * content drops `SINK_FLOAT_TRAVEL` accelerating on the `sink` curve, its
 * opacity falling the way light falls with depth — and **arriving is
 * floating** — the incoming content rises the same distance and comes to rest
 * on `settle` (buoyancy running out: no overshoot, per the system rule that
 * nothing bounces), settling from `FLOAT_ENTER_SCALE`.
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
 * Beer–Lambert light: opacity is not linear in time. `depthField` computes a
 * floc's opacity as `exp(−μ·depth)`, so the entering opacity runs on the
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
 * How far things travel — dp on mobile, px on the DOM. Band 24–40: 12–16 reads
 * as a nudge, not as depth. Chrome speaks the same verb at half this distance.
 */
export const SINK_FLOAT_TRAVEL = 28;

/**
 * Where the incoming content settles from. 0.96 rather than the route
 * transition's 0.97 — a touch more pressure at depth, still felt rather than
 * seen; below ~0.95 it starts to read as zoom.
 */
export const FLOAT_ENTER_SCALE = 0.96;

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
