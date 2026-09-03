/**
 * LoadingScreen — the wait, on the app's own ground. Native twin of
 * `packages/ui/src/components/LoadingScreen`; read that file's header for the
 * argument, which is one sentence: **the wait goes down and the success comes
 * up.** The wait is given the direction opposite to the receipt's arrival
 * rather than a competing one.
 *
 * - **The mark is the emitter**, and it is nailed to the centre of whatever the
 *   wait occupies, at `MARK_SIZE`. A front with no visible source reads as
 *   unrelated elements twitching, and a radial front whose origin is off-centre
 *   reads as a wave from somewhere else.
 * - **The descent was removed** (product, 2026-08). It was a 2px × 120px
 *   vertical track with a salmon segment running down it, and it read as a
 *   *progress bar* — but no caller has ever passed progress and this component
 *   has never had a `progress` prop, so it claimed a completion percentage it
 *   did not have. On a pending on-chain transaction there is no percentage to
 *   claim. It was also the one element that would not ride the wave, so it put
 *   a second motion vocabulary on the same screen as the front.
 * - **The mark sinks, and the front is born at the trough.** It presses *into*
 *   the surface — quick on the way down (`flick`), slow and monotonic on the way
 *   back (`tide`) — and the ring is emitted at the moment of impact rather than
 *   on a parallel timer. The delay is `WAVEFRONT_SINK_MS`, so the two cannot
 *   come apart. _(Product, 2026-08: "El logo sigue saltando y bajando, no
 *   bajando y volviendo a su lugar.")_
 * - **Nothing rides the front.** The title, subtitle and tips are stationary.
 *   _(Product, 2026-08: "Unlocking Wallet sigue moviéndose y el div de tip
 *   también, cuando te dije que no debería.")_ The wave is what moves; the words
 *   are what is read.
 * - **The wave** (`waves`, now on by default) is the disturbed water. It loops
 *   for as long as the wait lasts and the exit waits for it to leave the screen
 *   (`onExited`). The arithmetic lives in `@salmon/shared` `motion/wavefront`,
 *   shared with the DOM twin, so the two cannot drift and the timing is testable
 *   without a frame clock — the same split `surfacing.ts` already uses.
 * - It is deliberately *not* a distortion: `react-native-svg` implements neither
 *   `FeTurbulence` nor `FeDisplacementMap` (both return `null` and warn), and
 *   the only way to a real ripple shader is `@shopify/react-native-skia` — a
 *   native module, and therefore a store release rather than an OTA. Skia would
 *   not even solve it: it distorts pixels in its own canvas, it does not move
 *   real views.
 * - **Tips are on by default** — see `LoadingScreenBaseProps.showTips`.
 * - **A wait lasts at least `motionMs.waitFloor`**, whether or not the work
 *   behind it has already finished. The floor is spent with the wave still
 *   looping, and only then is the exit planned — see the exit effect below.
 *
 * Uses react-native-reanimated for 60fps animations, all on the UI thread.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Modal, View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  interpolate,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withDelay,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import {
  CREST_FADE_FROM,
  crestStops,
  crestTrain,
  type CrestShadow,
  DEFAULT_WALLET_TIP_KEYS,
  fontFamilyNative,
  letterSpacing,
  lineHeight,
  markPaths,
  markViewBoxAttr,
  motionMs,
  s,
  spacing,
  fontSize,
  planWavefrontExit,
  wavefrontExitMs,
  wavefrontRadius,
  WAVEFRONT_CROSS_MS,
  WAVEFRONT_EBB_MS,
  WAVEFRONT_PERIOD_MS,
  WAVEFRONT_RECOVER_MS,
  WAVEFRONT_SINK_MS,
  type Semantic,
  type WavefrontPoint,
  componentSizes,
} from '@salmon/shared';

import { LoadingScreenProps } from './types';
import { curve, timing } from '../../utils/motion';
import {
  FLOAT_DELAY_MS,
  FLOAT_IN_MS,
  SINK_FLOAT_TRAVEL,
  floatEntering,
} from '../../utils/sinkAndFloat';
import { useTaskChrome } from '../../contexts/TaskChromeContext';
import { DepthBackground } from '../DepthBackground';
import { ScalesBackground } from '../ScalesBackground';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';

// ============================================================================
// Constants
// ============================================================================

/**
 * How far the mark presses into the surface, and how much light it loses down
 * there.
 *
 * **A scale-down on its own does not read as an impact** — the same shrink
 * describes an object simply moving away from the eye. Two things separate the
 * two readings, and both are compositor-only: the mark **dims** as it goes
 * under, because water above a thing is water that takes its light, and it goes
 * down eight times faster than it comes back up, which is the profile of
 * something struck rather than something travelling. The wave leaving at the
 * bottom of it is the third.
 */
const MARK_SINK_SCALE = 0.05;
const MARK_SINK_DIM = 0.12;
/**
 * Diameter of the mark that emits the wave, px. It was 56 and sat a third of
 * the way down the screen; product, 2026-08, wants the emitter *nailed in the
 * middle of the phone and bigger*, because the origin of a radial front is the
 * one thing on a wait screen that may not be off-centre.
 */
const MARK_SIZE = componentSizes.markHero;
/** Clear space between the mark's edge and the first word under it. */
const MARK_TO_WORDS = spacing['3xl'];

/**
 * When the content has landed and the impact loops may begin. The beat is
 * intrinsic to the wait now — the content's `entering` waits out
 * `FLOAT_DELAY_MS` so a wait arriving over a sinking step always keeps the
 * double gesture — so the float ends one beat *plus* one float after the
 * overlay mounts, and the mark cannot press into a surface it has not
 * reached yet.
 */
const CONTENT_LANDS_MS = FLOAT_DELAY_MS + FLOAT_IN_MS;

/** The crests alive at once, resolved once at module load. */
const CRESTS = crestTrain();

/**
 * The tip block's reserved geometry.
 *
 * Tips rotate, and they are not all the same length. Sized by its content the
 * block grew upward from its bottom anchor, so the label above it travelled
 * every time the text changed line count. Reserving the tallest case keeps the
 * label still and lets the sentence use the room below it.
 */
const TIP_LINE_HEIGHT = 20;
const MAX_TIP_LINES = 3;
/** The label's own line plus the gap under it. */
const TIP_LABEL_BLOCK_HEIGHT = 16 + spacing.sm;

/**
 * Side of the box each crest is *rasterised* into, pt.
 *
 * The DOM twin can lay the crest out at the front's full final diameter because
 * a browser composites a gradient layer with a shader. `react-native-svg` does
 * not: `RNSVGSvgView` is a UIView that draws into a backing store the size of
 * its bounds, so a crest laid out at the screen diagonal would allocate roughly
 * `(1000pt × 3)² × 4B ≈ 36MB` — per crest, on every wait, on every screen. The
 * crest is drawn into a fixed 512pt box instead and the scale is multiplied by
 * `ringSize / CREST_RASTER` to reach the same final size, which costs ~9MB and
 * looks identical: the sharpest feature in the band is the light-to-shadow ramp,
 * and a smooth ramp upscaled by a compositor is still a smooth ramp.
 */
const CREST_RASTER = 512;

/** The crest's box: a fixed raster, centred on the origin. */
function crestBox(origin: WavefrontPoint) {
  return {
    width: CREST_RASTER,
    height: CREST_RASTER,
    left: origin.x - CREST_RASTER / 2,
    top: origin.y - CREST_RASTER / 2,
  };
}

/**
 * One crest of the front, drawn as a **refraction crest** rather than an
 * outline: across the thickness of the band the crown returns light and both
 * flanks fall into shadow — a raised ridge of water seen from directly above.
 * The profile is symmetric because a radial gradient is isotropic and therefore
 * cannot honestly express a light direction. The shape lives in
 * `@salmon/shared` `motion/crest`, shared with the DOM twin.
 *
 * `react-native-svg` has no `FeTurbulence` and no `FeDisplacementMap` (both
 * return `null` and warn) but `RadialGradient` is fully implemented, and a
 * gradient is all this needs: the ramp is what makes the band read as *relief*
 * where a hairline reads as an *outline*.
 *
 * Drawn once into a fixed `CREST_RASTER` box inside a `100×100` viewBox and
 * never redrawn — the parent `Animated.View` scales it to the front's real size,
 * so the vector work happens on mount and every frame after that is a layer
 * transform on the compositor. The
 * band is a *stroke* rather than a fill so the rasterised area is the band and
 * not the whole disc, and `userSpaceOnUse` makes a gradient offset and a
 * fraction of the front's radius the same number on both platforms.
 */
function CrestArc({
  id,
  alpha,
  color,
  shadow,
}: {
  id: string;
  alpha: number;
  color: string;
  shadow: CrestShadow;
}) {
  const stops = crestStops(alpha, color, shadow);
  const inner = stops[0].offset;
  const outer = stops[stops.length - 1].offset;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} gradientUnits="userSpaceOnUse" cx="50" cy="50" r="50">
          {stops.map((stop) => (
            <Stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity}
            />
          ))}
        </RadialGradient>
      </Defs>
      <Circle
        cx="50"
        cy="50"
        r={((inner + outer) / 2) * 50}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={(outer - inner) * 50}
      />
    </Svg>
  );
}

/** Centre of a laid-out box, in its parent's coordinates plus an offset. */
function centreOf(
  layout: { x: number; y: number; width: number; height: number },
  offset: WavefrontPoint
): WavefrontPoint {
  return { x: offset.x + layout.x + layout.width / 2, y: offset.y + layout.y + layout.height / 2 };
}

// ============================================================================
// Component
// ============================================================================

export function LoadingScreen({
  visible,
  fullScreen = false,
  title,
  subtitle,
  tips = DEFAULT_WALLET_TIP_KEYS as unknown as string[],
  tipInterval = 4000,
  showTips = true,
  // Every wait is water. `waves` used to default to `false` and be passed only
  // by the transaction wait; product hit the account-recovery wait (2026-08)
  // and found it bare. The treatment is the wait now, not a decoration one
  // screen opts into. The prop survives so a surface that must show nothing
  // living through itself can still opt out.
  waves = true,
  bottomOffset = 0,
  onExited,
  onReady,
}: LoadingScreenProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { accent, water } = useSemantic();

  // Resolve tip keys through t() for i18n
  const resolvedTips = useMemo(() => tips.map((tipKey) => t(tipKey, tipKey)), [tips, t]);

  // State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(visible);
  /**
   * Where the front leaves from and how far it has to go, in the frame of the
   * screen. Filled by `onLayout` on mount and then never again — the origin
   * does not move, so the ring's size is a number and not a per-frame read.
   */
  const [geometry, setGeometry] = useState<{
    frame: { width: number; height: number };
    contentOffset: WavefrontPoint;
    origin: WavefrontPoint | null;
  }>({ frame: { width: 0, height: 0 }, contentOffset: { x: 0, y: 0 }, origin: null });

  // Animation values
  /** How deep the mark is pressed in: 0 at rest, 1 at the trough. */
  const sink = useSharedValue(0);
  /** The ring the impact throws — 0 → 1 is one crossing. */
  const ring = useSharedValue(0);
  const tipOpacity = useSharedValue(1);
  const overlayOpacity = useSharedValue(visible ? 1 : 0);
  /**
   * The wait's own sink-and-float exit: how far the mark, the words and the
   * tips have dropped on the way out, in dp. They float in with the overlay
   * (`floatEntering` on the content wrapper) and, when the wait resolves, they
   * sink together with the last wave — one gesture, delayed by the same
   * `holdMs` the overlay's ebb waits out, so the content goes down exactly as
   * the screen's light goes. Zero the whole time the wait is up.
   */
  const depart = useSharedValue(0);

  // Held in a ref so an inline callback cannot restart the exit timer on every
  // render — which would leave the screen up forever.
  const onExitedRef = useRef(onExited);
  useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);
  /**
   * The handoff, once and only once.
   *
   * A wallet may not depend on an animation callback to leave a screen: if the
   * completion never arrives — cancelled value, dropped frame callback — the
   * caller waiting on `onExited` would sit on the wait forever. The animation
   * fires this, and a hard timer at `wavefrontExitMs()` fires it too; whichever
   * gets there first wins and the other is a no-op.
   */
  const exitedRef = useRef(false);
  /**
   * The shell surfaces when the wait leaves. Every wait — unlock, wallet
   * switch, a send — hands Home its float back through this, so no call site
   * has to remember (owner, 2026-09-02). Outside a provider (onboarding) the
   * context default makes it a no-op. Held in a ref for the same reason
   * `onExited` is.
   */
  const { surface: surfaceShell } = useTaskChrome();
  const surfaceRef = useRef(surfaceShell);
  useEffect(() => {
    surfaceRef.current = surfaceShell;
  }, [surfaceShell]);
  /**
   * When the loop started, so the exit can ask where the front is without
   * reading an animation. The phase is `(now − startedAt) % period`, which is
   * all `planWavefrontExit` needs to keep the handoff pure and testable.
   */
  const startedAtRef = useRef(0);
  /**
   * When the overlay came up, so the exit can spend the owner's floor
   * (`motionMs.waitFloor`) before it plans anything. Measured from the same
   * moment the caller sees the wait appear, not from the loop's delayed start:
   * the floor is about how long the *screen* is up.
   */
  const shownAtRef = useRef(0);
  /**
   * True from the moment the exit is planned until the wait shows again.
   * The exit effect also re-runs when `geometry.origin` lands late while
   * `visible` is already false; without this guard that re-run re-plans the
   * exit from a fresh `Date.now()` and restarts the ebb mid-flight.
   */
  const exitArmedRef = useRef(false);
  const finishExit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    setIsVisible(false);
    surfaceRef.current();
    onExitedRef.current?.();
  }, []);

  // The overlay is an ordinary enter/exit. The pulse and the spin are loops:
  // their `*Cycle` lengths are revolutions, never resolved to 0, and under
  // reduce motion they are not started at all rather than run instantly.
  const isReduceMotionEnabled = useReducedMotion();
  const overlayIn = timing(motionMs.drift, isReduceMotionEnabled);
  const tipFade = timing(motionMs.drift, isReduceMotionEnabled);

  /** Final diameter of the ring: twice the distance to the farthest corner. */
  const ringSize = useMemo(() => {
    const { frame, origin } = geometry;
    if (!origin) return 0;
    return 2 * wavefrontRadius(origin, frame);
  }, [geometry]);

  /**
   * The wait, reporting that it is running.
   *
   * The front is the only part of this screen that cannot draw until a
   * measurement lands: `geometry.origin` comes from an `onLayout`, which is a
   * JS-thread event. Everything else — the overlay's fade, the cluster's
   * float, the sink and the ring — is already on the UI thread and survives a
   * blocked JS thread. So a caller that is about to take the thread has
   * exactly one thing to wait for, and this is it. Fired once per showing, and
   * armed again when the wait comes back.
   */
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  const readyRef = useRef(false);
  useEffect(() => {
    if (!visible) {
      readyRef.current = false;
      return;
    }
    if (readyRef.current) return;
    // A wait with no front has nothing to measure: it is running as soon as it
    // is committed.
    if (waves && (geometry.origin === null || ringSize <= 0)) return;
    readyRef.current = true;
    onReadyRef.current?.();
  }, [visible, waves, geometry.origin, ringSize]);

  const measureFrame = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setGeometry((previous) =>
      previous.frame.width === width && previous.frame.height === height
        ? previous
        : { ...previous, frame: { width, height } }
    );
  }, []);

  const measureContent = useCallback((event: LayoutChangeEvent) => {
    const { x, y } = event.nativeEvent.layout;
    setGeometry((previous) =>
      previous.contentOffset.x === x && previous.contentOffset.y === y
        ? previous
        : { ...previous, contentOffset: { x, y } }
    );
  }, []);

  const measureOrigin = useCallback((event: LayoutChangeEvent) => {
    const box = event.nativeEvent.layout;
    setGeometry((previous) => ({ ...previous, origin: centreOf(box, previous.contentOffset) }));
  }, []);

  // Start/stop animations based on visibility
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      exitedRef.current = false;
      exitArmedRef.current = false;
      shownAtRef.current = Date.now();
      // The loop starts one beat and one float after the overlay does — see
      // below — so the exit's phase arithmetic measures from the delayed
      // start, not the mount.
      startedAtRef.current = Date.now() + CONTENT_LANDS_MS;
      depart.value = 0;
      overlayOpacity.value = withTiming(1, overlayIn);

      // Loops are cycles, not transitions: their `*Cycle` lengths are never
      // resolved to 0, and under reduce motion they are not started at all
      // rather than run infinitely fast. Under reduce motion this screen is
      // simply still, and the *words* carry the state — a parallel mapping,
      // which is what the descent used to be here for before it was removed
      // for claiming a progress it never had.
      if (isReduceMotionEnabled) return;

      // The wave, looping for as long as the wait lasts. It costs nothing that
      // accumulates: `withRepeat(-1)` runs on the UI thread, there is no JS
      // timer behind it, and the cleanup below cancels every value so an
      // unmounted screen cannot leave one running.
      if (waves) {
        // The sink, and it is the *opposite* gesture to the swell it replaces:
        // the mark presses into the surface instead of rising off it. Fast down
        // on `sink` (accelerating — it arrives at the water at speed), slow back
        // up on `settle` (decelerating and monotonic, so it comes to rest
        // without the overshoot product had just had removed from the words).
        //
        // Both loops wait out `CONTENT_LANDS_MS` first: the content is still
        // arriving — one beat behind whatever sank to make room for it, then
        // one float up into place — and the mark cannot press into the
        // surface before it has landed on it. The float precedes the impact —
        // arrival, then work — rather than running through it, and one
        // constant holds the two together the same way `WAVEFRONT_SINK_MS`
        // holds the sink to the emission.
        sink.value = 0;
        sink.value = withDelay(
          CONTENT_LANDS_MS,
          withRepeat(
            withSequence(
              withTiming(1, { duration: WAVEFRONT_SINK_MS, easing: curve.sink }),
              withTiming(0, { duration: WAVEFRONT_RECOVER_MS, easing: curve.settle }),
              withTiming(0, {
                duration: WAVEFRONT_PERIOD_MS - WAVEFRONT_SINK_MS - WAVEFRONT_RECOVER_MS,
              })
            ),
            -1,
            false
          )
        );

        // `Easing.linear`, and it is the one place in this system that gets it.
        // The riders' delays are linear in distance, so the front's position is
        // linear in time — that is what `d = c·t` means. Eased on `current` the
        // front was measured covering 90% of the screen in the first 20% of the
        // crossing and then waiting off-screen for riders it had already
        // passed. This is a front's velocity, not an element arriving.
        //
        // The first leg is the *impact delay*: the front is thrown at the
        // bottom of the sink, not at the top of the period, so the ring waits
        // out exactly the descent before it starts to travel. One constant
        // holds the two together, and the rhythm falls out of it — the front
        // clears the corner `WAVEFRONT_REST_MS` before the next mark hits the
        // water. See `wavefrontCalmMs`.
        ring.value = 0;
        ring.value = withDelay(
          CONTENT_LANDS_MS,
          withRepeat(
            withSequence(
              withTiming(0, { duration: WAVEFRONT_SINK_MS }),
              withTiming(1, { duration: WAVEFRONT_CROSS_MS, easing: Easing.linear }),
              withTiming(0, { duration: 0 }),
              withTiming(0, {
                duration: WAVEFRONT_PERIOD_MS - WAVEFRONT_CROSS_MS - WAVEFRONT_SINK_MS,
              })
            ),
            -1,
            false
          )
        );
      }
      return undefined;
    }

    // The exit, and it waits for calm water. Product, 2026-08: *"que no se pase
    // a la siguiente screen hasta que la última onda salga de la pantalla, es
    // decir, justo cuando el agua está calma."*
    //
    // Nothing is cancelled. The front in flight is left running exactly as it
    // was and simply allowed to finish crossing — the previous model killed the
    // emission and started a fresh closing wave, which cut the visible ring in
    // half at the moment the user was most likely to be looking at it. The
    // ground holds for whatever that front has left to travel and then ebbs.
    // Nothing else has to be rescheduled: the words do not ride the wave, so
    // the hold is the whole exit.
    //
    // Because only one front is ever in flight (`WAVEFRONT_REST_MS`), a wait
    // that resolves during the rest has nothing to wait for and hands off on
    // the closing ramp alone.
    //
    // Once planned, the exit is never re-planned: a `geometry.origin`
    // measurement landing while the wait is already leaving would otherwise
    // re-run this branch and restart the ebb. The effect's cleanup has just
    // cleared the timers, so the watchdog is re-armed and — while the floor
    // below is still being spent — so is the floor's own timer, which lands
    // at the same absolute moment because it is measured from `shownAtRef`.
    //
    // **The floor comes first, and it is a hold rather than a transition.** A
    // wait stays up `motionMs.waitFloor` whether or not the work behind it has
    // already finished, and reduced motion does not shorten it — exactly as
    // the copy-feedback hold is not shortened. It is spent with the wave still
    // looping and nothing cancelled, so when the exit is finally planned it is
    // planned from the phase the water is genuinely in: the floor and the
    // calm-water hold are sequential, never double-counted. See DESIGN.md
    // §The wait.
    const floorMs = Math.max(0, motionMs.waitFloor - (Date.now() - shownAtRef.current));

    // The hard bound, unchanged in job: a wallet may never be stranded on a
    // wait by an animation callback that never arrives. It is the floor plus
    // the worst case of the plan below, so it can only ever fire *after* the
    // animation would have.
    const fallback = setTimeout(finishExit, floorMs + wavefrontExitMs(isReduceMotionEnabled));

    if (exitArmedRef.current) {
      return () => clearTimeout(fallback);
    }

    const planExit = () => {
      exitArmedRef.current = true;
      const riding = waves && !isReduceMotionEnabled && geometry.origin !== null;
      // Resolved while the content is still arriving: the loops are only
      // *scheduled* (they wait out CONTENT_LANDS_MS) and nothing has moved yet,
      // so cancel them and leave on ebb alone — calm water for real. Once the
      // descent has begun, nothing is cancelled: the plan holds through the
      // committed strike and the whole train's crossing.
      const preStart = riding && startedAtRef.current > 0 && Date.now() < startedAtRef.current;
      if (preStart) {
        cancelAnimation(sink);
        cancelAnimation(ring);
      }
      const { holdMs } = planWavefrontExit(
        riding && !preStart && startedAtRef.current
          ? Math.max(0, Date.now() - startedAtRef.current)
          : 0,
        !riding || preStart
      );

      // The content sinks with the wave that carries it out — mark, words and
      // tips together, on the same delayed window as the overlay's ebb, so the
      // wait leaves as one gesture rather than as a fade with stragglers. The
      // ramp is `WAVEFRONT_EBB_MS` — the sink half of the verb, per DESIGN.md
      // §Motion — shared with the exit plan so what the caller is told and what
      // the screen does stay the same number. Under reduce motion there is no
      // travel and no viscosity: the calm variant stays a short opacity step.
      const rampMs = isReduceMotionEnabled ? motionMs.ebb : WAVEFRONT_EBB_MS;
      if (!isReduceMotionEnabled) {
        depart.value = withDelay(
          holdMs,
          withTiming(SINK_FLOAT_TRAVEL, { duration: rampMs, easing: curve.sink })
        );
      }

      overlayOpacity.value = withDelay(
        holdMs,
        withTiming(0, { duration: rampMs, easing: curve.sink }, (finished) => {
          if (finished) {
            runOnJS(finishExit)();
          }
        })
      );
    };

    if (floorMs <= 0) {
      planExit();
      return () => clearTimeout(fallback);
    }
    const floorTimer = setTimeout(planExit, floorMs);
    return () => {
      clearTimeout(floorTimer);
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, waves, geometry.origin, overlayOpacity, sink, ring, isReduceMotionEnabled]);

  // Nothing may outlive the screen: an unmounted wait that left a repeating
  // value running is a loop with no way to stop it.
  useEffect(
    () => () => {
      [sink, ring, overlayOpacity, tipOpacity, depart].forEach(cancelAnimation);
    },
    [sink, ring, overlayOpacity, tipOpacity, depart]
  );

  // Helper function to advance to next tip
  const advanceToNextTip = useCallback(() => {
    setCurrentTipIndex((prev) => (prev + 1) % resolvedTips.length);
  }, [resolvedTips.length]);

  // Helper function to fade tip back in
  // Note: tipOpacity is a Reanimated SharedValue which is stable and doesn't need to be in dependencies
  const fadeInTip = useCallback(() => {
    tipOpacity.value = withTiming(1, tipFade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cycle through tips
  useEffect(() => {
    if (!visible || !showTips || resolvedTips.length <= 1) return;

    const interval = setInterval(() => {
      // Fade out current tip
      tipOpacity.value = withTiming(0, tipFade, (finished) => {
        if (finished) {
          // Change tip and fade in
          runOnJS(advanceToNextTip)();
          runOnJS(fadeInTip)();
        }
      });
    }, tipInterval);

    return () => clearInterval(interval);
  }, [
    visible,
    showTips,
    resolvedTips.length,
    tipInterval,
    tipOpacity,
    advanceToNextTip,
    fadeInTip,
    tipFade,
  ]);

  /** The mark pressed into the surface: smaller, and dimmer for being under. */
  const sinkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - sink.value * MARK_SINK_SCALE }],
    opacity: 1 - sink.value * MARK_SINK_DIM,
  }));

  /**
   * The front, drawn. Each crest is laid out at its *final* size and scaled down
   * to nothing, so the band never has to be repainted — only `transform` and
   * `opacity` ever change, and both stay on the compositor.
   *
   * A wave train, not one pulse: crest *n* runs `lag` of the crossing behind the
   * leading one, taken off the same shared value rather than driven by a second
   * animation, so the crests cannot drift out of step with each other.
   */
  // How much the fixed raster has to grow to become the full-size front.
  const crestScale = ringSize / CREST_RASTER;
  const crest0 = useAnimatedStyle(() => {
    const value = Math.max(0, ring.value - CRESTS[0].lag);
    return {
      opacity: interpolate(value, [0, 0.06, CREST_FADE_FROM, 1], [0, 1, 1, 0], 'clamp'),
      transform: [{ scale: Math.max(value * crestScale, 0.001) }],
    };
  });
  const crest1 = useAnimatedStyle(() => {
    const value = Math.max(0, ring.value - (CRESTS[1]?.lag ?? 0));
    return {
      opacity: CRESTS[1]
        ? interpolate(value, [0, 0.06, CREST_FADE_FROM, 1], [0, 1, 1, 0], 'clamp')
        : 0,
      transform: [{ scale: Math.max(value * crestScale, 0.001) }],
    };
  });
  const crestStyles = [crest0, crest1];

  const tipStyle = useAnimatedStyle(() => ({
    opacity: tipOpacity.value,
  }));

  /** The content's exit travel — zero for the whole life of the wait. */
  const departStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: depart.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Don't render if not visible
  if (!isVisible) return null;

  const wait = (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <View style={styles.container} onLayout={measureFrame}>
        {/* A wait is a screen, and a screen is water — the same pair the tab
            ground and the auth stack mount. It used to sit over a second,
            flat `[depth.abyss, surface.raised]` gradient of this screen's own,
            which `DepthBackground` covered entirely and which ran the opposite
            way to `water.gradient` in both modes. Dead paint, and a ground the
            DOM twin never had: the wait now takes its ground where every other
            screen takes it. */}
        <DepthBackground />
        <ScalesBackground variant="deepField" />

        {/* The front, drawn. Deliberately a sibling of the content rather than
            a child of the mark: a crest is an order of magnitude larger than
            the box that emits it, and a child that far outside its parent is
            the case Android clips inconsistently. It is anchored to the
            measured origin instead, which costs one subtraction. */}
        {waves && geometry.origin && ringSize > 0 && (
          <>
            {CRESTS.map(({ lag, alpha }, index) => (
              <Animated.View
                key={lag}
                pointerEvents="none"
                style={[
                  styles.crest,
                  crestBox(geometry.origin as WavefrontPoint),
                  crestStyles[index],
                ]}
              >
                <CrestArc
                  id={`crest-${index}`}
                  alpha={alpha}
                  color={accent.fill}
                  shadow={water.crestShadow}
                />
              </Animated.View>
            ))}
          </>
        )}

        <View style={styles.content} onLayout={measureContent}>
          {/* The sink and the float, on the wait itself: everything the wait
              owns — mark, words, tips — floats up into place as the overlay
              fades in (the impact loop waits for the landing; see the effect
              above), and sinks together with the departing wave on the way
              out (`departStyle`). The wave crests are outside this wrapper on
              purpose: the water is the ground, and the ground never travels.
              Absolute-fill so it is exactly the frame the cluster centres in;
              a transform moves no layout, so the measured origin stays
              honest. */}
          <Animated.View
            testID="loading-cluster"
            style={[StyleSheet.absoluteFillObject, styles.cluster, departStyle]}
            // The beat is intrinsic to the wait: whatever step gave way to it
            // is still sinking when this mounts, so the content always waits
            // out the sink plus the pause. Callers therefore never delay the
            // wait themselves — doing so would double-count the beat.
            entering={floatEntering(isReduceMotionEnabled, { delayMs: FLOAT_DELAY_MS })}
          >
            {/* The emitter, and the head of the cluster. It used to be pinned
              to the exact middle of the frame with the words hanging below
              it, which centred the *mark* and left the thing the eye actually
              reads — mark plus words — sitting under the middle of the phone.
              The cluster is centred as one column instead, so the wait's
              content is centred on both axes whatever number of lines the
              caller passes, and the front's origin is still measured from
              this box rather than assumed. The mark is the brand accent,
              `accent.fill`, the button's own salmon in both modes — same as the crest it emits (owner
              ruling, 2026-09-01, DESIGN.md §The wait). */}
            {waves && (
              <Animated.View
                style={[styles.emitter, sinkStyle]}
                onLayout={measureOrigin}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                testID="loading-emitter"
              >
                <Svg width={MARK_SIZE} height={MARK_SIZE} viewBox={markViewBoxAttr}>
                  {markPaths.map((d) => (
                    <Path key={d} d={d} fill={accent.fill} />
                  ))}
                </Svg>
              </Animated.View>
            )}

            {/* The words, the second half of the cluster. They do not move:
              product, 2026-08, "Unlocking Wallet sigue moviéndose y el div de
              tip también, cuando te dije que no debería." */}
            <View style={styles.words} pointerEvents="none">
              {title && <Text style={styles.title}>{title}</Text>}

              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>

            {/* The tips, stationary too. They used to be the far-field passenger
              that showed the front takes real time to get there; the crest
              itself shows that, and it is the only thing that should. */}
            {showTips && resolvedTips.length > 0 && (
              <View style={[styles.tipsContainer, { bottom: 80 + bottomOffset }]}>
                <Text style={styles.tipLabel}>{t('general.tip', 'Tip')}</Text>
                <Animated.Text style={[styles.tipText, tipStyle]} numberOfLines={MAX_TIP_LINES}>
                  {resolvedTips[currentTipIndex]}
                </Animated.Text>
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );

  if (!fullScreen) return wait;

  // Its own window, so the wait covers chrome that is drawn outside this
  // component's parent — the gate header above a settings panel, for one.
  // `animationType="none"` because the wait animates itself; letting the
  // window animate too would double the entrance.
  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => undefined}
    >
      {wait}
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    },
    container: {
      flex: 1,
    },
    /**
     * The wave's coordinate space, and it has to be **exactly the frame**.
     *
     * It carried `paddingHorizontal: spacing['2xl']`, and that single line was
     * the miscentring product saw on the device: Yoga resolves a percentage
     * `left` on an absolutely-positioned child against the parent's *content*
     * width (width minus padding) but lays it out from the parent's *border-box*
     * edge, so `left: '50%'` landed the emitter at `(W − 2·24)/2` instead of
     * `W/2` — 24dp to the left, measured at 73px on a 1280px-wide 3× capture.
     * The words and the tips were unaffected because they set explicit `left` and
     * `right` insets rather than a percentage, which is exactly why the title
     * looked centred next to a mark that was not.
     *
     * The padding was also dead weight: every child here is absolutely positioned
     * and carries its own horizontal inset. Nothing may reintroduce it — the
     * emitter's centre is both the visual centre of the screen and the origin the
     * whole front is measured from.
     */
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /**
     * The cluster — mark, then words — centred as one column in the frame.
     *
     * The wait's content is what the eye reads, so it is what has to be centred.
     * Pinning the mark to `top: 50%` and hanging the words below it centred the
     * emitter and left the cluster low by half the words' height, which is the
     * off-centre product saw on the swap wait (two lines) more than on the
     * one-line waits. Centring the column keeps the mark horizontally exact —
     * `alignItems: 'center'`, no percentage anchor, so the Yoga padding trap
     * documented on `content` cannot come back — and the front's origin is
     * measured from the mark's real box, so it follows the cluster honestly.
     */
    cluster: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    words: {
      alignSelf: 'stretch',
      paddingHorizontal: spacing['2xl'],
      alignItems: 'center',
    },
    title: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.semiBold,
      fontSize: s(fontSize.headline),
      lineHeight: fontSize.headline * lineHeight.snug,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.bodyLg),
      lineHeight: fontSize.bodyLg * lineHeight.tight,
      textAlign: 'center',
    },
    /**
     * The emitter, head of the cluster — see `styles.cluster`. The clear space
     * to the first word lives here rather than on the words, so a wait with no
     * mark (`waves={false}`) centres its words with no phantom gap above them.
     */
    emitter: {
      marginBottom: MARK_TO_WORDS,
      width: MARK_SIZE,
      height: MARK_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /**
     * The front, drawn — see `CrestArc` for what is inside it and why. The box is
     * a fixed `CREST_RASTER` square scaled up to the front's real size; this style
     * carries nothing but position, because everything that changes per frame has
     * to stay a transform.
     */
    crest: {
      position: 'absolute',
    },
    /**
     * `bottomOffset` clears the floating chrome, and it is applied *here* rather
     * than as padding on the container. As container padding it shortened the
     * surface the emitter centres itself in, pushing the mark up by half the
     * offset on exactly the screen where the wave matters most — the transaction
     * wait. The chrome only ever needed the tips out of its way.
     */
    tipsContainer: {
      position: 'absolute',
      left: 24,
      right: 24,
      alignItems: 'center',
      // The word "Tip" is a fixed landmark, so the block reserves room for the
      // longest tip instead of being sized by the current one. Anchored from the
      // bottom and sized by content, a two-line tip pushed the label up and a
      // one-line tip dropped it back down — the label moved every rotation,
      // which is the one thing on this screen that should not.
      height: TIP_LABEL_BLOCK_HEIGHT + TIP_LINE_HEIGHT * MAX_TIP_LINES,
      justifyContent: 'flex-start',
    },
    tipLabel: {
      color: t.accent.ink,
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.caption),
      lineHeight: fontSize.caption * lineHeight.snug,
      textTransform: 'uppercase',
      letterSpacing: letterSpacing.widest,
      marginBottom: spacing.sm,
    },
    tipText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: TIP_LINE_HEIGHT,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
  });

export default LoadingScreen;
