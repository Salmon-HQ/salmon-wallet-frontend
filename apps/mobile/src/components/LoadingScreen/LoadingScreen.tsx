/**
 * LoadingScreen — the wait, on the app's own ground. Native twin of
 * `packages/ui/src/components/LoadingScreen`; read that file's header for the
 * argument, which is one sentence: **the wait goes down and the success comes
 * up.** The Surfacing is the only climax this system has, so the wait is given
 * the opposite direction rather than a competing one.
 *
 * - **The descent** replaces the spinning ring: a hairline track with a segment
 *   of salmon *ink* running down it on `shimmerCycle`, decelerating into the end
 *   of every pass. The *pulsing logo* was removed with the ring and is back by
 *   decision (product, 2026-08): it is the emitter, and a front with no visible
 *   source reads as unrelated elements twitching.
 * - **The wave** (opt-in, `waves`) is the disturbed water. Each pulse launches a
 *   front; every element is displaced as the front reaches it, delayed in
 *   proportion to its *measured distance* from the mark and attenuated as 1/√d.
 *   That is `f(t − d/c)` — d'Alembert — so it is a physically correct radial
 *   front, which needs a delay and not a shader. It loops for as long as the
 *   wait lasts and ends on a closing wave that carries the screen off
 *   (`onExited`). The arithmetic lives in `@salmon/shared` `motion/wavefront`,
 *   shared with the DOM twin, so the two cannot drift and the timing is testable
 *   without a frame clock — the same split `surfacing.ts` already uses.
 * - It is deliberately *not* a distortion: `react-native-svg` implements neither
 *   `FeTurbulence` nor `FeDisplacementMap` (both return `null` and warn), and
 *   the only way to a real ripple shader is `@shopify/react-native-skia` — a
 *   native module, and therefore a store release rather than an OTA. Skia would
 *   not even solve it: it distorts pixels in its own canvas, it does not move
 *   real views.
 * - **Tips are off by default** — see `LoadingScreenBaseProps.showTips`.
 *
 * Uses react-native-reanimated for 60fps animations, all on the UI thread.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
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
  colors,
  componentSizes,
  DEFAULT_WALLET_TIP_KEYS,
  fontFamilyNative,
  letterSpacing,
  markPaths,
  markViewBoxAttr,
  motionEasing,
  motionMs,
  planWavefront,
  semantic,
  spacing,
  fontSize,
  wavefrontExitMs,
  wavefrontRadius,
  WAVEFRONT_CROSS_MS,
  WAVEFRONT_PERIOD_MS,
  type WavefrontPlan,
  type WavefrontPoint,
} from '@salmon/shared';

import { LoadingScreenProps } from './types';
import { curve, timing } from '../../utils/motion';
import { DepthBackground } from '../DepthBackground';
import { ScalesBackground } from '../ScalesBackground';

// ============================================================================
// Constants
// ============================================================================

/** 2% — the wave's swell, the quiet half of `swellIn`'s overshoot. */
const WAVE_SCALE = 0.02;
/** Diameter of the mark that emits the wave, px. */
const MARK_SIZE = 56;
/** Three riders: title, subtitle, descent. */
const RIDER_COUNT = 3;

const curveCurrent = motionEasing.current.native as [number, number, number, number];

/**
 * One wave passing one element: a displacement upward and a 2% swell. Shared by
 * every rider so the front cannot drift apart between them; only the amplitude
 * differs, and it differs because the wave attenuates, not because the elements
 * were tuned separately.
 */
function waveTransform(v: number, amplitude: number) {
  'worklet';
  return {
    transform: [{ translateY: -v * amplitude }, { scale: 1 + v * WAVE_SCALE }],
  };
}

/** The ring's box: laid out at its final size, centred on the origin. */
function ringBox(origin: WavefrontPoint, size: number) {
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    left: origin.x - size / 2,
    top: origin.y - size / 2,
  };
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
  title,
  subtitle,
  tips = DEFAULT_WALLET_TIP_KEYS as unknown as string[],
  tipInterval = 4000,
  showTips = false,
  waves = false,
  bottomOffset = 0,
  onExited,
}: LoadingScreenProps) {
  const { t } = useTranslation();

  // Resolve tip keys through t() for i18n
  const resolvedTips = useMemo(() => tips.map((tipKey) => t(tipKey, tipKey)), [tips, t]);

  // State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(visible);
  /**
   * Everything the wave needs to know about where things are, in the frame of
   * the screen. Filled by `onLayout` on mount and then never again — the
   * passengers do not move and neither does the origin, which is exactly why
   * `f(t − d/c)` collapses into a delay instead of needing a value read on
   * every frame.
   */
  const [geometry, setGeometry] = useState<{
    frame: { width: number; height: number };
    contentOffset: WavefrontPoint;
    origin: WavefrontPoint | null;
    riders: Record<number, WavefrontPoint>;
  }>({ frame: { width: 0, height: 0 }, contentOffset: { x: 0, y: 0 }, origin: null, riders: {} });

  // Animation values
  const descent = useSharedValue(0);
  // One rider per element the front passes over.
  const wave0 = useSharedValue(0);
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  /** The emitter's beat and the ring it throws — 0 → 1 is one crossing. */
  const pulse = useSharedValue(0);
  const ring = useSharedValue(0);
  const tipOpacity = useSharedValue(1);
  const overlayOpacity = useSharedValue(visible ? 1 : 0);

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
  const finishExit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    setIsVisible(false);
    onExitedRef.current?.();
  }, []);

  // The overlay is an ordinary enter/exit. The pulse and the spin are loops:
  // their `*Cycle` lengths are revolutions, never resolved to 0, and under
  // reduce motion they are not started at all rather than run instantly.
  const isReduceMotionEnabled = useReducedMotion();
  const overlayIn = timing(motionMs.drift, isReduceMotionEnabled);
  const overlayOut = timing(motionMs.ebb, isReduceMotionEnabled, curve.sink);
  const tipFade = timing(motionMs.drift, isReduceMotionEnabled);

  /**
   * One plan per rider: `null` until the layout pass has run, and `null` for
   * good under reduce motion — nothing is started at all, rather than started
   * at zero length.
   */
  const plans = useMemo<(WavefrontPlan | null)[]>(() => {
    const { frame, origin, riders } = geometry;
    if (!waves || !origin) return [null, null, null];
    return Array.from({ length: RIDER_COUNT }, (_, index) => {
      const point = riders[index];
      if (!point) return null;
      return planWavefront(point, origin, frame, isReduceMotionEnabled);
    });
  }, [waves, geometry, isReduceMotionEnabled]);

  /** Final diameter of the ring: twice the distance to the farthest corner. */
  const ringSize = useMemo(() => {
    const { frame, origin } = geometry;
    if (!origin) return 0;
    return 2 * wavefrontRadius(origin, frame);
  }, [geometry]);

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

  const measureRider = useCallback(
    (index: number) => (event: LayoutChangeEvent) => {
      const box = event.nativeEvent.layout;
      setGeometry((previous) => ({
        ...previous,
        riders: { ...previous.riders, [index]: centreOf(box, previous.contentOffset) },
      }));
    },
    []
  );

  const riderLayoutHandlers = useMemo(
    () => Array.from({ length: RIDER_COUNT }, (_, index) => measureRider(index)),
    [measureRider]
  );

  // Start/stop animations based on visibility
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      exitedRef.current = false;
      overlayOpacity.value = withTiming(1, overlayIn);

      // Loops are cycles, not transitions: their `*Cycle` lengths are never
      // resolved to 0, and under reduce motion they are not started at all
      // rather than run infinitely fast. The descent's resting position under
      // reduce motion is mid-track — a still indicator reads as a hung process,
      // so the state moves into the words instead.
      if (isReduceMotionEnabled) {
        descent.value = 0.5;
        return;
      }

      // The descent: one pass down the track per `shimmerCycle`, decelerating
      // into the end of it on `current`. A pass with rhythm reads as shorter
      // than a constant-speed rotation of the same length (Harrison, Yeo &
      // Hudson, CHI 2010) — the ring this replaced was the worst case measured.
      descent.value = 0;
      descent.value = withRepeat(
        withTiming(1, { duration: motionMs.shimmerCycle, easing: Easing.bezier(...curveCurrent) }),
        -1,
        false
      );

      // The wave, looping for as long as the wait lasts. It costs nothing that
      // accumulates: `withRepeat(-1)` runs on the UI thread, there is no JS
      // timer behind it, and the cleanup below cancels every value so an
      // unmounted screen cannot leave one running.
      if (waves) {
        pulse.value = 0;
        pulse.value = withRepeat(
          withSequence(
            withTiming(1, { duration: motionMs.swell / 2, easing: Easing.bezier(...curveCurrent) }),
            withTiming(0, { duration: motionMs.swell / 2, easing: Easing.bezier(...curveCurrent) }),
            withTiming(0, { duration: WAVEFRONT_PERIOD_MS - motionMs.swell })
          ),
          -1,
          false
        );

        // `Easing.linear`, and it is the one place in this system that gets it.
        // The riders' delays are linear in distance, so the front's position is
        // linear in time — that is what `d = c·t` means. Eased on `current` the
        // front was measured covering 90% of the screen in the first 20% of the
        // crossing and then waiting off-screen for riders it had already
        // passed. This is a front's velocity, not an element arriving.
        ring.value = 0;
        ring.value = withRepeat(
          withSequence(
            withTiming(1, { duration: WAVEFRONT_CROSS_MS, easing: Easing.linear }),
            withTiming(0, { duration: 0 }),
            withTiming(0, { duration: WAVEFRONT_PERIOD_MS - WAVEFRONT_CROSS_MS })
          ),
          -1,
          false
        );

        [wave0, wave1, wave2].forEach((rider, index) => {
          const plan = plans[index];
          rider.value = 0;
          if (!plan) return;
          // The whole front, in one line: the same curve for everyone, started
          // `delayMs` later in proportion to distance.
          rider.value = withDelay(
            plan.delayMs,
            withRepeat(
              withSequence(
                withTiming(1, {
                  duration: plan.durationMs / 2,
                  easing: Easing.bezier(...curveCurrent),
                }),
                withTiming(0, {
                  duration: plan.durationMs / 2,
                  easing: Easing.bezier(...curveCurrent),
                }),
                withTiming(0, { duration: WAVEFRONT_PERIOD_MS - plan.durationMs })
              ),
              -1,
              false
            )
          );
        });
      }
      return undefined;
    }

    // The closing wave. Pending emissions are cancelled and the last front goes
    // out *now* — waiting for the emission in flight to clear would put up to a
    // whole `pulseCycle` between the decision and the receipt, which this
    // system's own rule (exit faster than enter) forbids. The handoff lands at
    // `wavefrontExitMs()`, fixed and testable.
    const closing = waves && !isReduceMotionEnabled && plans.some(Boolean);
    if (!closing) {
      overlayOpacity.value = withTiming(0, overlayOut, (finished) => {
        if (finished) {
          runOnJS(finishExit)();
        }
      });
      const fallback = setTimeout(finishExit, wavefrontExitMs(isReduceMotionEnabled));
      return () => clearTimeout(fallback);
    }

    cancelAnimation(pulse);
    cancelAnimation(ring);
    pulse.value = withSequence(
      withTiming(1, { duration: motionMs.swell / 2, easing: Easing.bezier(...curveCurrent) }),
      withTiming(0, { duration: motionMs.swell / 2, easing: Easing.bezier(...curveCurrent) })
    );
    ring.value = 0;
    ring.value = withTiming(1, { duration: WAVEFRONT_CROSS_MS, easing: Easing.linear });

    [wave0, wave1, wave2].forEach((rider, index) => {
      const plan = plans[index];
      cancelAnimation(rider);
      rider.value = 0;
      if (!plan) return;
      // No return trip: the front reaches the element and carries it off.
      rider.value = withDelay(
        plan.delayMs,
        withTiming(1, { duration: plan.durationMs, easing: curve.sink })
      );
    });

    // The ground outlives the riders by one crossing, then ebbs.
    // `WAVEFRONT_CROSS_MS + ebb` is exactly `wavefrontExitMs(false)`.
    overlayOpacity.value = withDelay(
      WAVEFRONT_CROSS_MS,
      withTiming(0, { duration: motionMs.ebb, easing: curve.sink }, (finished) => {
        if (finished) {
          runOnJS(finishExit)();
        }
      })
    );
    const fallback = setTimeout(finishExit, wavefrontExitMs(false));
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, waves, plans, overlayOpacity, descent, wave0, wave1, wave2, isReduceMotionEnabled]);

  // Nothing may outlive the screen: an unmounted wait that left a repeating
  // value running is a loop with no way to stop it.
  useEffect(
    () => () => {
      [descent, wave0, wave1, wave2, pulse, ring, overlayOpacity, tipOpacity].forEach(
        cancelAnimation
      );
    },
    [descent, wave0, wave1, wave2, pulse, ring, overlayOpacity, tipOpacity]
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

  // Animated styles
  const descentStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          -componentSizes.descentSegmentHeight +
          descent.value * (componentSizes.descentTrackHeight + componentSizes.descentSegmentHeight),
      },
    ],
  }));

  // The amplitude a rider was planned with, or the token value before the
  // layout pass has run. `isClosing` is read as a value rather than a prop so
  // the fade on exit belongs to the same worklet as the displacement.
  const amplitudes = plans.map((plan) => plan?.amplitude ?? componentSizes.waveAmplitude);
  const leaving = !visible;

  const titleWave = useAnimatedStyle(() => ({
    ...waveTransform(wave0.value, amplitudes[0]),
    opacity: leaving ? 1 - wave0.value : 1,
  }));
  const subtitleWave = useAnimatedStyle(() => ({
    ...waveTransform(wave1.value, amplitudes[1]),
    opacity: leaving ? 1 - wave1.value : 1,
  }));
  const descentWave = useAnimatedStyle(() => ({
    ...waveTransform(wave2.value, amplitudes[2]),
    opacity: leaving ? 1 - wave2.value : 1,
  }));

  /** The emitter's beat — the same 2% swell it puts into the water. */
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * WAVE_SCALE }],
  }));

  /**
   * The front, drawn. The ring is laid out at its *final* size and scaled down
   * to nothing, so the stroke never has to animate — only `transform` and
   * `opacity` ever change, and both stay on the compositor.
   */
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.06, 1], [0, 1, 0], 'clamp'),
    transform: [{ scale: Math.max(ring.value, 0.001) }],
  }));

  const haloStyle = useAnimatedStyle(() => {
    // The glow trails the crest by one `flick`, expressed as a fraction of the
    // crossing rather than as a second animation to keep in step.
    const trailed = Math.max(0, ring.value - motionMs.flick / WAVEFRONT_CROSS_MS);
    return {
      opacity: interpolate(trailed, [0, 0.06, 1], [0, 1, 0], 'clamp'),
      transform: [{ scale: Math.max(trailed, 0.001) }],
    };
  });

  const tipStyle = useAnimatedStyle(() => ({
    opacity: tipOpacity.value,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={[styles.container, { paddingBottom: bottomOffset }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        onLayout={measureFrame}
      >
        {/* A wait is a screen, and a screen is water — the same pair the tab
            ground and the auth stack mount, over this overlay's own flat
            gradient rather than instead of it, so the wait keeps the exact
            enter and exit it had. Nothing below is redrawn. */}
        <DepthBackground />
        <ScalesBackground variant="deepField" />

        {/* The front, drawn. Deliberately a sibling of the content rather than
            a child of the mark: the ring is an order of magnitude larger than
            the 56px box that emits it, and a child that far outside its parent
            is the case Android clips inconsistently. It is anchored to the
            measured origin instead, which costs one subtraction. */}
        {waves && geometry.origin && ringSize > 0 && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[styles.ring, styles.ringHalo, ringBox(geometry.origin, ringSize), haloStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.ring, styles.ringCrest, ringBox(geometry.origin, ringSize), ringStyle]}
            />
          </>
        )}

        <View style={styles.content} onLayout={measureContent}>
          {/* The emitter and the front it launches. The mark is salmon as
              *ink*, tinted and never filled, so it does not spend the one
              living fill a screen is allowed — the descent below already holds
              it, and they are the same element seen twice. */}
          {waves && (
            <Animated.View
              style={[styles.emitter, pulseStyle]}
              onLayout={measureOrigin}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              testID="loading-emitter"
            >
              <Svg width={MARK_SIZE} height={MARK_SIZE} viewBox={markViewBoxAttr}>
                {markPaths.map((d) => (
                  <Path key={d} d={d} fill={semantic.text.accent} />
                ))}
              </Svg>
            </Animated.View>
          )}

          {/* Title */}
          {title && (
            <Animated.View style={titleWave} onLayout={riderLayoutHandlers[0]}>
              <Text style={styles.title}>{title}</Text>
            </Animated.View>
          )}

          {/* Subtitle */}
          {subtitle && (
            <Animated.View style={subtitleWave} onLayout={riderLayoutHandlers[1]}>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </Animated.View>
          )}

          {/* The descent. Salmon as ink, running down — the opposite direction
              to The Surfacing, which is what keeps the wait from reading as a
              second climax. */}
          <Animated.View
            style={[styles.descentTrack, descentWave]}
            onLayout={riderLayoutHandlers[2]}
            testID="loading-descent"
          >
            <Animated.View style={[styles.descentSegment, descentStyle]} />
          </Animated.View>

          {/* Tips Section */}
          {showTips && resolvedTips.length > 0 && (
            <View style={styles.tipsContainer}>
              <Text style={styles.tipLabel}>{t('general.tip', 'Tip')}</Text>
              <Animated.Text style={[styles.tipText, tipStyle]}>
                {resolvedTips[currentTipIndex]}
              </Animated.Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  title: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize['2xl'],
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.md,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  emitter: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3xl'],
  },
  /**
   * The front, drawn. Two concentric rings — a bright hairline crest and a
   * wider, dimmer halo behind it. The halo is what makes the ring *luminous*
   * rather than a hairline circle, and it is a second ring rather than a shadow
   * because `shadowRadius` is iOS-only and `elevation` cannot be coloured: two
   * views read identically on both platforms and both stay on the compositor.
   *
   * This is a light event during a wait, which DESIGN.md used to forbid
   * outright ("one light event, and it is The Surfacing"). The rule has been
   * amended in that document rather than quietly broken here — an unlit
   * hairline was not legible as a wavefront, and a wave nobody can see is not a
   * cheaper wave, it is none. It stays rationed: salmon ink at low alpha, alive
   * only while the wait is, travelling outward and down while The Surfacing
   * travels up.
   */
  ring: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  ringCrest: {
    borderWidth: 1.5,
    borderColor: semantic.accent.ink,
  },
  ringHalo: {
    borderWidth: 6,
    borderColor: semantic.accent.tint,
  },
  descentTrack: {
    width: componentSizes.descentTrackWidth,
    height: componentSizes.descentTrackHeight,
    borderRadius: componentSizes.descentTrackWidth,
    backgroundColor: semantic.border.hairline,
    overflow: 'hidden',
    marginBottom: spacing['5xl'],
  },
  descentSegment: {
    width: '100%',
    height: componentSizes.descentSegmentHeight,
    borderRadius: componentSizes.descentTrackWidth,
    // Salmon as *ink*, which DESIGN.md does not ration — not a fill, which is
    // rationed to one living element per screen and must not be spent here.
    backgroundColor: semantic.text.accent,
  },
  tipsContainer: {
    position: 'absolute',
    bottom: 80,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  tipLabel: {
    color: colors.accent.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.sm,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.widest,
    marginBottom: spacing.sm,
  },
  tipText: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.base,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});

export default LoadingScreen;
