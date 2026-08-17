/**
 * LoadingScreen — the wait, on the app's own ground. Native twin of
 * `packages/ui/src/components/LoadingScreen`; read that file's header for the
 * argument, which is one sentence: **the wait goes down and the success comes
 * up.** The Surfacing is the only climax this system has, so the wait is given
 * the opposite direction rather than a competing one.
 *
 * - **The descent** replaces the spinning ring and the pulsing logo: a hairline
 *   track with a segment of salmon *ink* running down it on `shimmerCycle`,
 *   decelerating into the end of every pass.
 * - **The wave** (opt-in, `waves`) is a distance-based stagger — each element
 *   displaced `waveAmplitude` with a delay proportional to its rank down the
 *   column. Three emissions, then still. It is deliberately *not* a distortion:
 *   `react-native-svg` implements neither `FeTurbulence` nor `FeDisplacementMap`
 *   (they are listed under "not supported yet" in its USAGE.md), and the only
 *   way to a real ripple shader is `@shopify/react-native-skia` — a native
 *   module, ~4–6 MB of download, and therefore a store release rather than an
 *   OTA. Not worth 3px of displacement.
 * - **Tips are off by default** — see `LoadingScreenBaseProps.showTips`.
 *
 * Uses react-native-reanimated for 60fps animations, all on the UI thread.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
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
  motionEasing,
  motionMs,
  semantic,
  spacing,
  fontSize,
} from '@salmon/shared';

import { LoadingScreenProps } from './types';
import { curve, timing } from '../../utils/motion';
import { DepthBackground } from '../DepthBackground';
import { ScalesBackground } from '../ScalesBackground';

// ============================================================================
// Constants
// ============================================================================

/** Three emissions, then the water is still. See the header. */
const WAVE_EMISSIONS = 3;
/** 2% — the wave's swell, the quiet half of `swellIn`'s overshoot. */
const WAVE_SCALE = 0.02;

const curveCurrent = motionEasing.current.native as [number, number, number, number];

/**
 * One wave passing one element: a small displacement upward and a 2% swell.
 * Shared by every rider so the front cannot drift apart between them.
 */
function waveTransform(v: number) {
  'worklet';
  return {
    transform: [{ translateY: -v * componentSizes.waveAmplitude }, { scale: 1 + v * WAVE_SCALE }],
  };
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
}: LoadingScreenProps) {
  const { t } = useTranslation();

  // Resolve tip keys through t() for i18n
  const resolvedTips = useMemo(() => tips.map((tipKey) => t(tipKey, tipKey)), [tips, t]);

  // State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(visible);

  // Animation values
  const descent = useSharedValue(0);
  // One rider per rank down the column: the delay is proportional to the
  // element's distance from the top, which is what makes the eye read a front
  // crossing the screen rather than three things twitching at once.
  const wave0 = useSharedValue(0);
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const tipOpacity = useSharedValue(1);
  const overlayOpacity = useSharedValue(visible ? 1 : 0);

  // The overlay is an ordinary enter/exit. The pulse and the spin are loops:
  // their `*Cycle` lengths are revolutions, never resolved to 0, and under
  // reduce motion they are not started at all rather than run instantly.
  const isReduceMotionEnabled = useReducedMotion();
  const overlayIn = timing(motionMs.drift, isReduceMotionEnabled);
  const overlayOut = timing(motionMs.ebb, isReduceMotionEnabled, curve.sink);
  const tipFade = timing(motionMs.drift, isReduceMotionEnabled);

  // Start/stop animations based on visibility
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
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

      // The wave: `WAVE_EMISSIONS` passes and then the water is still. A wait of
      // thirty seconds cannot be a show of thirty seconds, or it takes weight
      // from the one moment that is supposed to have it.
      if (waves) {
        [wave0, wave1, wave2].forEach((rider, rank) => {
          rider.value = 0;
          rider.value = withDelay(
            rank * motionMs.stagger,
            withRepeat(
              withSequence(
                withTiming(1, {
                  duration: motionMs.swell / 2,
                  easing: Easing.bezier(...curveCurrent),
                }),
                withTiming(0, {
                  duration: motionMs.swell / 2,
                  easing: Easing.bezier(...curveCurrent),
                }),
                withTiming(0, { duration: motionMs.pulseCycle - motionMs.swell })
              ),
              WAVE_EMISSIONS,
              false
            )
          );
        });
      }
    } else {
      overlayOpacity.value = withTiming(0, overlayOut, (finished) => {
        if (finished) {
          runOnJS(setIsVisible)(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, waves, overlayOpacity, descent, wave0, wave1, wave2, isReduceMotionEnabled]);

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

  const titleWave = useAnimatedStyle(() => waveTransform(wave0.value));
  const subtitleWave = useAnimatedStyle(() => waveTransform(wave1.value));
  const descentWave = useAnimatedStyle(() => waveTransform(wave2.value));

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
      >
        {/* A wait is a screen, and a screen is water — the same pair the tab
            ground and the auth stack mount, over this overlay's own flat
            gradient rather than instead of it, so the wait keeps the exact
            enter and exit it had. Nothing below is redrawn. */}
        <DepthBackground />
        <ScalesBackground variant="deepField" />

        <View style={styles.content}>
          {/* Title */}
          {title && (
            <Animated.View style={titleWave}>
              <Text style={styles.title}>{title}</Text>
            </Animated.View>
          )}

          {/* Subtitle */}
          {subtitle && (
            <Animated.View style={subtitleWave}>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </Animated.View>
          )}

          {/* The descent. Salmon as ink, running down — the opposite direction
              to The Surfacing, which is what keeps the wait from reading as a
              second climax. */}
          <Animated.View style={[styles.descentTrack, descentWave]} testID="loading-descent">
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
