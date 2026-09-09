/**
 * The DOM wait's keyframes and styled parts. The component composes them;
 * the cross-platform numbers (`CONTENT_LANDS_MS`, `MARK_SINK_*`,
 * `MAX_TIP_LINES`) come from `@salmon/shared` `motion/wait`.
 */
import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import {
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  FLOAT_DELAY_MS,
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
  SINK_FLOAT_TRAVEL,
  spacing,
  duration,
  durationMs,
  easing,
  CREST_FADE_FROM,
  crestGradientCSS,
  type CrestShadow,
  motionEasing,
  reducedMotion,
  WAVEFRONT_CROSS_MS,
  WAVEFRONT_EBB_MS,
  WAVEFRONT_PERIOD_MS,
  WAVEFRONT_RECOVER_MS,
  WAVEFRONT_SINK_MS,
  componentSizes,
  CONTENT_LANDS_MS,
  MARK_SINK_DIM,
  MARK_SINK_SCALE,
  MAX_TIP_LINES,
} from '@salmon/shared';
import { waterColumnHost } from '../WaterColumn';

// ============================================================================
// Keyframes
// ============================================================================

/**
 * The mark pressing into the surface, and the light it loses for being under.
 *
 * **A scale-down on its own does not read as an impact** — the same shrink
 * describes an object simply moving away from the eye. Three things separate
 * the readings, and all three are free: it **dims**, because water over a thing
 * is water that takes its light; it goes down eight times faster than it comes
 * back up (`flick` against `tide`), which is the profile of something struck
 * rather than something travelling; and the wave is thrown at the bottom of it.
 *
 * The recovery is **monotonic** — `settle`, no overshoot. A spring that
 * overshoots is the jump product had just had removed from the words.
 */
export const sinkKeyframes = keyframes`
  0% { transform: scale(1); opacity: 1; animation-timing-function: ${motionEasing.sink.css}; }
  ${(WAVEFRONT_SINK_MS / WAVEFRONT_PERIOD_MS) * 100}% {
    transform: scale(${1 - MARK_SINK_SCALE});
    opacity: ${1 - MARK_SINK_DIM};
    animation-timing-function: ${motionEasing.settle.css};
  }
  ${((WAVEFRONT_SINK_MS + WAVEFRONT_RECOVER_MS) / WAVEFRONT_PERIOD_MS) * 100}%, 100% {
    transform: scale(1);
    opacity: 1;
  }
`;

/**
 * The front itself, made visible: a crest leaving the mark and crossing the
 * screen in `WAVEFRONT_CROSS_MS`, reaching the farthest corner exactly as the
 * last rider is displaced.
 *
 * Only `transform` and `opacity` are keyframed. The crest's light/dark ramp is
 * painted once into the layer as a static `radial-gradient` and never touched
 * again, which is the whole reason a band costs the same as the hairline it
 * replaces: the compositor scales a rasterised layer, it does not re-run a
 * gradient per frame.
 */
export const crestKeyframes = keyframes`
  0% { transform: translate(-50%, -50%) scale(0.02); opacity: 0; }
  ${(0.04 * WAVEFRONT_CROSS_MS * 100) / WAVEFRONT_PERIOD_MS}% { opacity: 1; }
  ${((CREST_FADE_FROM * WAVEFRONT_CROSS_MS) / WAVEFRONT_PERIOD_MS) * 100}% {
    opacity: 1;
  }
  ${(WAVEFRONT_CROSS_MS / WAVEFRONT_PERIOD_MS) * 100}% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
`;

export const fadeInKeyframes = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const fadeOutKeyframes = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

/**
 * The wait arriving: everything it owns rises the verb's travel and comes to
 * rest on `settle` — buoyancy running out, no overshoot — while its light
 * returns on the accelerating `sink` curve, which is the vocabulary's closest
 * bezier to Beer-Lambert. Two media, one event, so two animations rather than
 * one keyframe set. DESIGN.md §The sink and the float.
 */
export const floatTravelKeyframes = keyframes`
  from { transform: translateY(${SINK_FLOAT_TRAVEL}px) scale(${FLOAT_ENTER_SCALE}); }
  to { transform: none; }
`;

export const floatLightKeyframes = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/**
 * The wait leaving: the same content goes down with the departing wave, on the
 * overlay's own closing ramp and its own hold, so the screen leaves as one
 * gesture rather than as a fade with stragglers. Only the travel lives here —
 * the light is the overlay's, which is fading over exactly this window.
 */
export const sinkOutKeyframes = keyframes`
  from { transform: none; }
  to { transform: translateY(${SINK_FLOAT_TRAVEL}px); }
`;

// ============================================================================
// Styled Components
// ============================================================================

export const Overlay = styled('div')<{
  $isFadingOut: boolean;
  $waveOut: boolean;
  $ground: readonly [string, string];
}>(({ $isFadingOut, $waveOut, $ground }) => ({
  ...waterColumnHost,
  // `fixed` rather than the host's `relative`: this overlay covers the viewport
  // rather than its parent. It is still a containing block, and `isolation`
  // still gives the stacking context the ground's negative layer needs.
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 9999,
  // The water ramp's own stops, so a wait on bedrock (no column) still
  // stands on the ground the column would have painted.
  background: `linear-gradient(180deg, ${$ground[0]} 0%, ${$ground[1]} 100%)`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  // When the wave is driving the exit, the ground has to outlive the riders:
  // it holds for whatever the front still in flight has left to travel, then
  // ebbs. The hold arrives as `--wave-hold`, written by the exit effect from
  // `planWavefrontExit`, so what the caller is told and what the screen does
  // are the same number.
  // The ramp is `WAVEFRONT_EBB_MS` — shared with `planWavefrontExit`, so
  // what the caller is told and what the ground does are the same number.
  animation: $waveOut
    ? `${fadeOutKeyframes} ${WAVEFRONT_EBB_MS}ms ${motionEasing.sink.css} var(--wave-hold, ${WAVEFRONT_CROSS_MS}ms) forwards`
    : // The plain ramp, in tokens: `durationMs.slow` is the same number the
      // exit timer below spends, so what the caller is told and what the
      // screen does are one number here too. Arriving decelerates (`settle`),
      // leaving accelerates away (`sink`).
      `${$isFadingOut ? fadeOutKeyframes : fadeInKeyframes} ${durationMs.slow}ms ${
        $isFadingOut ? motionEasing.sink.css : motionEasing.settle.css
      } forwards`,
}));

/**
 * Everything the wait owns — mark, words, tips — as one travelling cluster.
 *
 * It floats up into place as the overlay fades in and sinks with the departing
 * wave on the way out, on the overlay's own `--wave-hold` and closing ramp, so
 * the wait arrives and leaves as one gesture (DESIGN.md §Motion, "The wait owns
 * its passage, end to end").
 *
 * The crests are deliberately **not** in here: the water is the ground, and the
 * ground never travels. Absolute-fill so the cluster is exactly the frame its
 * children were already centred in — nothing below changes position, and a
 * transform moves no layout, so the measured origin stays honest.
 *
 * Reduce motion cuts every stage: no travel in, no travel out, and the overlay's
 * own opacity step carries the wait either way.
 */
export const Cluster = styled('div')<{ $waveOut: boolean }>(({ $waveOut }) => ({
  position: 'absolute',
  inset: 0,
  animation: $waveOut
    ? `${sinkOutKeyframes} ${WAVEFRONT_EBB_MS}ms ${motionEasing.sink.css} var(--wave-hold, 0ms) forwards`
    : [
        `${floatTravelKeyframes} ${FLOAT_IN_MS}ms ${motionEasing.settle.css} ${FLOAT_DELAY_MS}ms both`,
        `${floatLightKeyframes} ${FLOAT_IN_MS}ms ${motionEasing.sink.css} ${FLOAT_DELAY_MS}ms both`,
      ].join(', '),
  [`@media ${reducedMotion.query}`]: {
    animation: 'none',
  },
}));

/** Diameter of the mark that emits the wave, px. */
export const MARK_SIZE = componentSizes.markHero;

/** Clear space between the mark's edge and the first word under it. */
export const MARK_TO_WORDS = spacing['3xl'];

/**
 * The words, and only the words. Pinned to start *below* the centre point
 * rather than being centred themselves, because the centre belongs to the mark:
 * the origin of the front is the middle of the surface, and everything else is
 * arranged around it. Product, 2026-08 — "lo más importante es que ocurra en el
 * centro del celular."
 */
export const Words = styled('div')({
  position: 'absolute',
  top: '50%',
  left: 0,
  right: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: `${MARK_SIZE / 2 + MARK_TO_WORDS}px ${spacing['2xl']}px 0`,
  textAlign: 'center',
  pointerEvents: 'none',
});

export const Title = styled('div')<{ $ink: string }>(({ $ink }) => ({
  color: $ink,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize['2xl'],
  lineHeight: `${fontSize['2xl'] * lineHeight.condensed}px`,
  marginBottom: spacing.sm,
}));

export const Subtitle = styled('div')<{ $ink: string }>(({ $ink }) => ({
  color: $ink,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.regular,
  fontSize: fontSize.bodyLg,
  lineHeight: `${fontSize.bodyLg * lineHeight.normal}px`,
}));

/**
 * The emitter. The mark was removed with the spinning ring and is back by
 * decision, not by drift: without a visible source a radial front reads as
 * unrelated elements twitching. It is the brand accent — `semantic.accent.fill`
 * — same as the crest it emits (owner ruling, 2026-09-01, DESIGN.md §The wait).
 *
 * It **sinks**; it does not pulse. See `sinkKeyframes`.
 */
export const Emitter = styled('div')<{ $waves: boolean; $ink: string }>(({ $waves, $ink }) => ({
  // The true centre of whatever the wait occupies — not of the viewport. The
  // overlay is the surface, so its middle is the origin, and a wait rendered in
  // a smaller box gets its own centre with no special case.
  position: 'absolute',
  top: '50%',
  left: '50%',
  marginTop: -MARK_SIZE / 2,
  marginLeft: -MARK_SIZE / 2,
  width: MARK_SIZE,
  height: MARK_SIZE,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: $ink,
  // Not stopped on close: the front in flight is left to finish crossing, and
  // the ground has faded before the next emission is due.
  // The per-step curves live inside the keyframes (fast in, slow out), so the
  // animation itself is `linear` — an easing here would ease the easing.
  // Delayed by `CONTENT_LANDS_MS`: the float precedes the impact, because the
  // mark cannot press into a surface it has not landed on.
  animation: $waves
    ? `${sinkKeyframes} ${WAVEFRONT_PERIOD_MS}ms linear ${CONTENT_LANDS_MS}ms infinite`
    : 'none',
  [`@media ${reducedMotion.query}`]: {
    animation: 'none',
  },
}));

/**
 * The front, drawn — a **refraction crest**, not an outline.
 *
 * Across the thickness of the band the inner face returns light and the outer
 * face falls into shadow, which is what a raised ridge of water looks like from
 * above: the light term follows the *derivative* of the height field, so the two
 * slopes of one bump catch light with opposite sign. It is the bezel this system
 * already puts on a filled button — lit rim, shaded underside — rotated into a
 * radial band. The shape lives in `@salmon/shared` `motion/crest` so mobile and
 * the DOM cannot draw two different waves.
 *
 * The construction is a **static** `radial-gradient` on a box laid out at the
 * front's final diameter, moved only by `transform: scale()`. Nothing about the
 * paint is animated: the layer is rasterised once and the compositor scales it,
 * which is why a band costs what the hairline cost.
 *
 * This is a light event during a wait, which §Overview used to forbid outright
 * ("one light event"). That rule has been amended in DESIGN.md rather than
 * quietly broken here: the ring is now the one event the system allows. The
 * light is still rationed — `semantic.accent.fill` at low alpha (owner ruling,
 * 2026-09-01: the crest is the brand accent, not the cold caustic ink it used
 * to be), alive only while the wait is, travelling outward and down, and gone
 * before the receipt mounts.
 */
export const Crest = styled('div')<{
  $alpha: number;
  $lagMs: number;
  $waves: boolean;
  $ink: string;
  $shadow: CrestShadow;
}>(({ $alpha, $lagMs, $waves, $ink, $shadow }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  // Diameter is `--wave-ring`, written by the measurement pass as twice the
  // distance from the mark to the farthest corner. The crest is scaled *down*
  // from its final size rather than up from a small one, so the band never has
  // to be repainted — only `transform` and `opacity` ever change.
  width: 'var(--wave-ring, 0px)',
  height: 'var(--wave-ring, 0px)',
  borderRadius: '50%',
  // Both inks come from the live mode. The crown was already passed; the
  // flank was left to the function's default, which is the *static* token —
  // dark's near-black at 0.9. On the pale ground that painted a dark ring
  // around a coral crown, so light mode read as the dark wait with only its
  // orange kept (owner, 2026-09-03).
  background: crestGradientCSS($alpha, $ink, $shadow),
  opacity: 0,
  pointerEvents: 'none',
  transform: 'translate(-50%, -50%) scale(0)',
  // A wave train: each crest runs one `CREST_SPACING` of the crossing behind
  // the one ahead of it, at a fraction of its alpha. On close the train is
  // emitted exactly once — that emission *is* the exit.
  //
  // `linear`, and it is the one place in this system that gets it. The riders'
  // delays are linear in distance, so the front's position is linear in time —
  // that is what `d = c·t` means. Easing the front on `current` was measured
  // doing the wrong thing: it covered 90% of the screen in the first 20% of
  // the crossing and then waited off-screen for riders it had already passed.
  // This is a front's velocity, not an element arriving.
  // The delay carries the *impact*: `WAVEFRONT_SINK_MS` is how long the mark
  // takes to reach the trough, so the front leaves at the bottom of the sink
  // rather than at the top of the period. The train's own lag rides on top of
  // it. One constant holds the mark and the wave together, and the rhythm
  // falls out of it — see `wavefrontCalmMs`.
  animation: $waves
    ? `${crestKeyframes} ${WAVEFRONT_PERIOD_MS}ms linear ${
        CONTENT_LANDS_MS + WAVEFRONT_SINK_MS + $lagMs
      }ms infinite`
    : 'none',
  [`@media ${reducedMotion.query}`]: {
    animation: 'none',
    opacity: 0,
  },
}));

export const Mark = styled('svg')({
  width: '100%',
  height: '100%',
  display: 'block',
});

/**
 * The tips. Absolutely placed on the *rider* rather than on this box, so the
 * thing the measurement pass sizes is the thing that actually sits at the
 * bottom of the surface — a wrapper collapsed to zero height would be planned as
 * if it were at the origin.
 */
export const tipsAnchor = {
  position: 'absolute',
  bottom: spacing['7xl'],
  left: spacing['2xl'],
  right: spacing['2xl'],
} as const;

/**
 * The tip block's reserved geometry.
 *
 * Tips rotate and are not all the same length. Sized by its content, the block
 * grew upward from its bottom anchor, so the label above it travelled every
 * time the sentence changed line count. Reserving the tallest case keeps the
 * label still and lets the sentence use the room below it.
 */
export const TIP_LINE_HEIGHT_PX = Math.round(fontSize.base * lineHeight.tokenListItem);

export const TipsContainer = styled('div')({
  textAlign: 'center',
  height:
    Math.round(fontSize.sm * lineHeight.condensed) +
    spacing.sm +
    TIP_LINE_HEIGHT_PX * MAX_TIP_LINES,
});

export const TipLabel = styled('div')<{ $ink: string }>(({ $ink }) => ({
  color: $ink,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.sm,
  lineHeight: `${fontSize.sm * lineHeight.condensed}px`,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  textAlign: 'center',
  marginBottom: spacing.sm,
}));

export const TipText = styled('div')<{ $fading: boolean; $ink: string }>(({ $fading, $ink }) => ({
  color: $ink,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.regular,
  fontSize: fontSize.base,
  lineHeight: `${fontSize.base * lineHeight.tokenListItem}px`,
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: MAX_TIP_LINES,
  overflow: 'hidden',
  textAlign: 'center',
  opacity: $fading ? 0 : 1,
  transition: `opacity ${duration.slower} ${easing.easeInOut}`,
  padding: `0 ${spacing.lg}px`,
}));
