/**
 * LoadingScreen — the wait, on the app's own ground.
 *
 * Uses Emotion keyframes + styled() for consistency with the rest of @salmon/ui.
 *
 * The choreography, and the one idea it is built on: **the wait goes down and
 * the success comes up.** A wait may not compete with the receipt — it is
 * given the opposite *direction* instead, which costs nothing and makes the two
 * screens read as one sequence.
 *
 * - **The mark is the emitter**, and it is pinned to the centre of whatever this
 *   overlay occupies, at `MARK_SIZE`. A wave with no visible source is four
 *   things twitching, and a radial front whose origin is off-centre reads as a
 *   wave from somewhere else.
 * - **The descent was removed** (product, 2026-08). It was a 2px × 120px
 *   vertical track with a salmon segment running down it, and it read as a
 *   *progress bar* — but no caller has ever passed progress and this component
 *   has never had a `progress` prop, so it claimed a completion percentage it
 *   did not have. On a pending on-chain transaction there is no percentage to
 *   claim. It was also the one element that would not ride the wave, so it put a
 *   second motion vocabulary on the same screen as the front. The Harrison, Yeo
 *   & Hudson (CHI 2010) argument it carried — that a decelerating augmentation
 *   makes a wait read shorter — is now carried by the front itself, which
 *   crosses once per `pulseCycle` and then rests.
 * - **The mark sinks, and the front is born at the trough.** It presses *into*
 *   the surface rather than swelling off it: quick down (`flick`), slow and
 *   monotonic back up (`tide`), and the ring is emitted at the moment of impact
 *   — `animation-delay: WAVEFRONT_SINK_MS` — rather than running on a parallel
 *   timer. _(Product, 2026-08: "El logo sigue saltando y bajando, no bajando y
 *   volviendo a su lugar.")_
 * - **Nothing rides the front.** The title, subtitle and tips are stationary.
 *   _(Product, 2026-08: "Unlocking Wallet sigue moviéndose y el div de tip
 *   también, cuando te dije que no debería.")_
 * - **The wave** (`waves`, on by default) is the disturbed water. It loops for
 *   as long as the wait lasts and the exit waits for the front to leave the
 *   screen (`onExited`). The arithmetic is in `@salmon/shared`
 *   `motion/wavefront`, shared with the React Native twin, so the two platforms
 *   cannot drift and the timing is testable without a frame clock.
 * - **The wait owns its passage.** Everything it owns — mark, words, tips —
 *   floats up into place as the overlay fades in, and the beat is *intrinsic*:
 *   the cluster waits out `FLOAT_DELAY_MS` inside this component, so a caller
 *   that sank to make room keeps the double gesture for free and call sites
 *   pass nothing. The impact loop waits out that beat plus one float before its
 *   first press — the mark cannot press into a surface it has not landed on.
 *   On the way out the same content sinks on the overlay's own closing ramp, so
 *   the wait leaves as one gesture with the departing wave. The crests stay
 *   outside the travelling cluster: the water is the ground, and the ground
 *   never travels. (DESIGN.md §Motion, "The wait owns its passage, end to end".)
 * - **Tips are on by default** — see `LoadingScreenBaseProps.showTips`.
 * - **A wait lasts at least `motionMs.waitFloor`**, whether or not the work
 *   behind it has already finished. The floor is spent with the crest still
 *   looping, and only then is the exit planned — see the visibility effect.
 */
import { memo, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { keyframes } from '@emotion/react';
import { styled } from '../../utils/styled';
import {
  colors,
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  DEFAULT_WALLET_TIP_KEYS,
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
  crestTrain,
  markPaths,
  markViewBoxAttr,
  motionEasing,
  motionMs,
  planWavefrontExit,
  reducedMotion,
  semantic,
  wavefrontExitMs,
  wavefrontRadius,
  WAVEFRONT_CROSS_MS,
  WAVEFRONT_EBB_MS,
  WAVEFRONT_PERIOD_MS,
  WAVEFRONT_RECOVER_MS,
  WAVEFRONT_SINK_MS,
} from '@salmon/shared';
import { WaterColumn, waterColumnHost } from '../WaterColumn';
import { useReducedMotion } from '../../utils/useReducedMotion';
import type { LoadingScreenProps } from './types';

// ============================================================================
// Constants
// ============================================================================

/**
 * When the content has landed, and the earliest the impact loop may begin.
 *
 * The beat is intrinsic to the wait (DESIGN.md §Motion, "The wait owns its
 * passage, end to end"): the cluster's float waits out `FLOAT_DELAY_MS` after
 * mount, so a caller that sank to make room keeps the double gesture for free
 * and never delays the wait itself — doing so would double-count the beat.
 * The float therefore ends one beat *plus* one float after the overlay mounts,
 * and the mark cannot press into a surface it has not landed on yet.
 */
const CONTENT_LANDS_MS = FLOAT_DELAY_MS + FLOAT_IN_MS;

/** How far the mark presses in, and how much light it loses down there. */
const MARK_SINK_SCALE = 0.05;
const MARK_SINK_DIM = 0.12;

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
const sinkKeyframes = keyframes`
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
const crestKeyframes = keyframes`
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

const fadeInKeyframes = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeOutKeyframes = keyframes`
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
const floatTravelKeyframes = keyframes`
  from { transform: translateY(${SINK_FLOAT_TRAVEL}px) scale(${FLOAT_ENTER_SCALE}); }
  to { transform: none; }
`;

const floatLightKeyframes = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/**
 * The wait leaving: the same content goes down with the departing wave, on the
 * overlay's own closing ramp and its own hold, so the screen leaves as one
 * gesture rather than as a fade with stragglers. Only the travel lives here —
 * the light is the overlay's, which is fading over exactly this window.
 */
const sinkOutKeyframes = keyframes`
  from { transform: none; }
  to { transform: translateY(${SINK_FLOAT_TRAVEL}px); }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Overlay = styled('div')<{ $isFadingOut: boolean; $waveOut: boolean }>(
  ({ $isFadingOut, $waveOut }) => ({
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
    background: `linear-gradient(180deg, ${colors.background.primary} 0%, ${colors.background.secondary} 100%)`,
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
  })
);

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
const Cluster = styled('div')<{ $waveOut: boolean }>(({ $waveOut }) => ({
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
const MARK_SIZE = 96;

/** Clear space between the mark's edge and the first word under it. */
const MARK_TO_WORDS = spacing['3xl'];

/**
 * The words, and only the words. Pinned to start *below* the centre point
 * rather than being centred themselves, because the centre belongs to the mark:
 * the origin of the front is the middle of the surface, and everything else is
 * arranged around it. Product, 2026-08 — "lo más importante es que ocurra en el
 * centro del celular."
 */
const Words = styled('div')({
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

const Title = styled('div')({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize['2xl'],
  lineHeight: `${fontSize['2xl'] * lineHeight.condensed}px`,
  marginBottom: spacing.sm,
});

const Subtitle = styled('div')({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.regular,
  fontSize: fontSize.bodyLg,
  lineHeight: `${fontSize.bodyLg * lineHeight.normal}px`,
});

/**
 * The emitter. The mark was removed with the spinning ring and is back by
 * decision, not by drift: without a visible source a radial front reads as
 * unrelated elements twitching. It is the brand accent — `semantic.accent.fill`
 * — same as the crest it emits (owner ruling, 2026-09-01, DESIGN.md §The wait).
 *
 * It **sinks**; it does not pulse. See `sinkKeyframes`.
 */
const Emitter = styled('div')<{ $waves: boolean }>(({ $waves }) => ({
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
  color: semantic.accent.fill,
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
const Crest = styled('div')<{ $alpha: number; $lagMs: number; $waves: boolean }>(
  ({ $alpha, $lagMs, $waves }) => ({
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
    background: crestGradientCSS($alpha, semantic.accent.fill),
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
  })
);

const Mark = styled('svg')({
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
const tipsAnchor = {
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
const TIP_LINE_HEIGHT_PX = Math.round(fontSize.base * lineHeight.tokenListItem);
const MAX_TIP_LINES = 3;

const TipsContainer = styled('div')({
  textAlign: 'center',
  height:
    Math.round(fontSize.sm * lineHeight.condensed) +
    spacing.sm +
    TIP_LINE_HEIGHT_PX * MAX_TIP_LINES,
});

const TipLabel = styled('div')({
  color: colors.accent.primary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.sm,
  lineHeight: `${fontSize.sm * lineHeight.condensed}px`,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  textAlign: 'center',
  marginBottom: spacing.sm,
});

const TipText = styled('div')<{ $fading: boolean }>(({ $fading }) => ({
  color: colors.text.secondary,
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

// ============================================================================
// Component
// ============================================================================

/**
 * LoadingScreen component - Animated loading overlay
 *
 * @example
 * ```tsx
 * <LoadingScreen
 *   visible={isLoading}
 *   title="Loading Wallet"
 *   subtitle="Please wait..."

 * />
 * ```
 */
export const LoadingScreen = memo(function LoadingScreen({
  visible,
  title,
  subtitle,
  tips = DEFAULT_WALLET_TIP_KEYS as unknown as string[],
  tipInterval = 4000,
  showTips = true,
  // Every wait is water. `waves` used to default to `false` and be passed only
  // by the transaction wait; product hit the account-recovery wait (2026-08) and
  // found it bare. The treatment is the wait now, not a decoration one screen
  // opts into. The prop survives so `bedrock` — and any future surface that must
  // show nothing living through itself — can still opt out.
  waves = true,
  bedrock = false,
  onExited,
}: LoadingScreenProps) {
  const { t } = useTranslation();
  const isReduceMotionEnabled = useReducedMotion();

  // Resolve tip keys through t() for i18n
  const resolvedTips = useMemo(() => tips.map((tipKey) => t(tipKey, tipKey)), [tips, t]);

  // The Bedrock Rule: the dApp approval flow shows nothing living through
  // itself, and a pulsing mark throwing rings across the screen is the most
  // living thing in the app. It is the same opt-out the water column takes.
  const riding = waves && !bedrock;

  // State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tipFading, setTipFading] = useState(false);
  const [isVisible, setIsVisible] = useState(visible);
  const [isFadingOut, setIsFadingOut] = useState(false);
  // The closing wave is in flight: the loop is cancelled, every rider is
  // leaving on its own delay, and the ground is holding until the front is off
  // the screen.
  const [isClosing, setIsClosing] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  /**
   * When the impact loop starts, so the exit can ask where the front is
   * without reading an animation off the compositor. The phase is
   * `(now − startedAt) % period`, which is all `planWavefrontExit` needs.
   *
   * It is the *delayed* start — the content floats in first — so the exit
   * arithmetic measures from the same instant the keyframes do and the
   * calm-water handoff stays honest.
   */
  const startedAtRef = useRef(0);
  /**
   * When the overlay came up, so the exit can spend the owner's floor
   * (`motionMs.waitFloor`) before it plans anything. Measured from the moment
   * the caller sees the wait appear, not from the loop's delayed start: the
   * floor is about how long the *screen* is up.
   */
  const shownAtRef = useRef(0);
  // Held in a ref so an inline callback cannot restart the exit timer on every
  // render — which would leave the screen up forever.
  const onExitedRef = useRef(onExited);
  useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setIsFadingOut(false);
      setIsClosing(false);
      startedAtRef.current = Date.now() + CONTENT_LANDS_MS;
      shownAtRef.current = Date.now();
      return undefined;
    }
    if (!isVisible) return undefined;

    // **The floor comes first, and it is a hold rather than a transition.** A
    // wait stays up `motionMs.waitFloor` whether or not the work behind it has
    // already finished, and reduced motion does not shorten it — exactly as
    // the copy-feedback hold is not shortened. It is spent with the crest's
    // `infinite` animation still running and nothing cancelled, so when the
    // exit is finally planned it is planned from the phase the water is
    // genuinely in: the floor and the calm-water hold are sequential, never
    // double-counted. See DESIGN.md §The wait.
    const floorMs = Math.max(0, motionMs.waitFloor - (Date.now() - shownAtRef.current));

    let exitTimer: ReturnType<typeof setTimeout> | undefined;

    // The exit, and it waits for calm water. Product, 2026-08: *"que no se pase
    // a la siguiente screen hasta que la última onda salga de la pantalla, es
    // decir, justo cuando el agua está calma."*
    //
    // Nothing is cancelled. The crest's `infinite` animation is left running
    // exactly as it is, so a front in flight finishes crossing instead of being
    // cut in half; the ground simply fades once it has left. Because only one
    // front is ever in flight (`WAVEFRONT_REST_MS`), the fade always completes
    // before the next emission is due, and a wait that resolves during the rest
    // has nothing to wait for at all.
    // A wait that resolves while the content is still floating in has thrown
    // nothing yet: there is no front on the screen to wait out, which is the
    // same answer the plan gives for calm water.
    const planExit = () => {
      const elapsedMs = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
      const preImpact = elapsedMs < 0;
      const { holdMs, exitMs } = planWavefrontExit(
        Math.max(0, elapsedMs),
        !riding || isReduceMotionEnabled || preImpact
      );

      if (riding && !isReduceMotionEnabled && holdMs > 0) {
        // Only the ground has anything to wait for: nothing rides the front, so
        // the hold is the whole exit.
        contentRef.current?.style.setProperty('--wave-hold', `${holdMs}ms`);
        setIsClosing(true);
        exitTimer = setTimeout(
          () => {
            setIsVisible(false);
            setIsClosing(false);
            onExitedRef.current?.();
            // The hard bound, unchanged in job: a wallet may never be stranded on a
            // wait. `exitMs` is what the screen is actually doing and
            // `wavefrontExitMs` is its worst case, so the guard can only be late.
            // The floor is spent before this is armed, so it bounds the whole
            // thing rather than racing it.
          },
          Math.min(exitMs, wavefrontExitMs(false))
        );
        return;
      }

      setIsFadingOut(true);
      exitTimer = setTimeout(() => {
        setIsVisible(false);
        setIsFadingOut(false);
        onExitedRef.current?.();
      }, durationMs.slow);
    };

    // The floor is a plain hold: the wait is simply still up, doing what it was
    // already doing, and the exit is planned when it runs out.
    let floorTimer: ReturnType<typeof setTimeout> | undefined;
    if (floorMs <= 0) planExit();
    else floorTimer = setTimeout(planExit, floorMs);

    return () => {
      if (floorTimer) clearTimeout(floorTimer);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [visible, isVisible, riding, isReduceMotionEnabled]);

  /**
   * The measurement pass — one read, and the only reason the front crosses in
   * `WAVEFRONT_CROSS_MS` on a 360px popup and on a 1440px window alike.
   *
   * It used to plan every rider as well; the riders are gone (product, 2026-08)
   * and what is left is the ring's final diameter, written straight onto the
   * mark as a custom property so nothing re-renders and nothing is evaluated
   * per frame. Re-measured only when the viewport changes.
   */
  useLayoutEffect(() => {
    if (!isVisible || !riding) return undefined;

    const measure = () => {
      const root = contentRef.current;
      const mark = originRef.current;
      if (!root || !mark) return;

      // The surface is *this overlay*, not the viewport. A wait rendered into a
      // panel rather than over the whole window gets its own centre and its own
      // corner distance out of the same three lines — there is no full-screen
      // special case to keep in step.
      //
      // Read from layout (`offset*`) rather than from a client rect: the mark
      // rides the cluster, which is mid-float when this runs, and a rect
      // includes that transform. The cluster is absolute-fill, so the mark's
      // offsets are already the overlay's own coordinates.
      const origin = {
        x: mark.offsetLeft + mark.offsetWidth / 2,
        y: mark.offsetTop + mark.offsetHeight / 2,
      };

      // Written on the overlay rather than on the mark: the crests are siblings
      // of the travelling cluster now, and they inherit it from here.
      root.style.setProperty(
        '--wave-ring',
        `${2 * wavefrontRadius(origin, { width: root.clientWidth, height: root.clientHeight })}px`
      );
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isVisible, riding, title, subtitle]);

  // Cycle through tips
  useEffect(() => {
    if (!visible || !showTips || resolvedTips.length <= 1) return;

    const interval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % resolvedTips.length);
        setTipFading(false);
      }, durationMs.slower);
    }, tipInterval);

    return () => clearInterval(interval);
  }, [visible, showTips, resolvedTips.length, tipInterval]);

  // Don't render if not visible
  if (!isVisible) return null;

  const overlay = (
    // `loading-screen` is a test handle with a reason: this overlay is fixed
    // and covers the viewport, so it swallows clicks for as long as it is
    // mounted — including the whole exit animation, while the screen
    // underneath is already visible. Anything waiting to click that screen has
    // to wait for this to detach, not merely for the screen to appear.
    <Overlay
      ref={contentRef}
      $isFadingOut={isFadingOut}
      $waveOut={isClosing}
      role="status"
      aria-busy="true"
      data-testid="loading-screen"
    >
      {/* A wait is a screen like any other, and a screen is water. This one is
          the seam the ground has to close: the wait before a swap confirms is
          followed immediately by the receipt, which stands in the column, and
          two grounds one behind the other in the same second reads as two
          apps. Nothing here is redrawn — the spinner, the logo and the tips
          are exactly what they were; only what they stand in has changed. */}
      {!bedrock && <WaterColumn />}

      {/* The front, drawn — a sibling of the travelling cluster rather than a
          child of the mark that throws it: the water is the ground, and the
          ground never travels. Decorative and announced by the overlay's own
          `role="status"`, so it is hidden from assistive technology rather
          than narrated as a second thing happening. Its origin is the middle
          of the surface, which is where the mark rests. */}
      {riding &&
        crestTrain().map(({ lag, alpha }) => (
          <Crest
            key={lag}
            $alpha={alpha}
            $lagMs={Math.round(lag * WAVEFRONT_CROSS_MS)}
            $waves={riding}
            aria-hidden="true"
          />
        ))}

      {/* Everything the wait owns, floating in as one and sinking out as one.
          See `Cluster`. */}
      <Cluster $waveOut={isClosing} data-testid="loading-cluster">
        {/* The emitter. It is pinned to the middle of the surface: the origin
            of a radial front is the one thing on this screen that may not be
            off-centre. */}
        {riding && (
          <Emitter ref={originRef} $waves={riding} aria-hidden="true" data-testid="loading-emitter">
            <Mark viewBox={markViewBoxAttr} fill="currentColor" focusable="false">
              {markPaths.map((d) => (
                <path key={d} d={d} />
              ))}
            </Mark>
          </Emitter>
        )}

        {/* The words do not move — not on the front, at least. Product,
            2026-08: "Unlocking Wallet sigue moviéndose y el div de tip
            también, cuando te dije que no debería." They arrive and leave with
            the rest of the wait, which is the passage, not a rider. */}
        <Words>
          {title && <Title>{title}</Title>}
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </Words>

        {/* The tips, stationary too. They used to be the far-field passenger that
            showed the front takes real time to get there; the crest itself shows
            that, and it is the only thing that should. */}
        {showTips && resolvedTips.length > 0 && (
          <div style={tipsAnchor}>
            <TipsContainer>
              <TipLabel>{t('general.tip', 'Tip')}</TipLabel>
              <TipText $fading={tipFading}>{resolvedTips[currentTipIndex]}</TipText>
            </TipsContainer>
          </div>
        )}
      </Cluster>
    </Overlay>
  );

  // **Mounted on the body, not where it was written.** `position: fixed`
  // resolves against the nearest ancestor carrying a `transform` — not against
  // the viewport — so a wait rendered inside a sliding panel (the settings
  // stack keeps `translateX(0)` as its resting state) was clipped to that
  // panel. The overlay covers the app or it is not a wait, and the transform it
  // was trapped under is load-bearing for the slide, so the overlay leaves the
  // subtree instead. Everything else — context, the measurement pass, the
  // `loading-screen` handle — is unchanged: a portal keeps the React tree.
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
});
