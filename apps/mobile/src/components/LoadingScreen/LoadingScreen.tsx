/**
 * LoadingScreen - Animated loading overlay with pulsing logo and rotating spinner
 *
 * Features:
 * - Pulsing logo animation (breathing effect)
 * - Rotating spinner around the logo
 * - Cycling tips/advice at the bottom
 * - Smooth fade in/out transitions
 *
 * Uses react-native-reanimated for 60fps animations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Logo } from '@salmon/assets';
import { colors, DEFAULT_WALLET_TIP_KEYS, fontFamilyNative, letterSpacing, spacing, fontSize, } from '@salmon/shared';

import { LoadingScreenProps } from './types';

// ============================================================================
// Animation Constants
// ============================================================================

const PULSE_DURATION = 1200; // ms for one pulse cycle
const SPIN_DURATION = 2000; // ms for full rotation
const TIP_FADE_DURATION = 400; // ms for tip fade transition

// ============================================================================
// Component
// ============================================================================

export function LoadingScreen({
  visible,
  title,
  subtitle,
  tips = DEFAULT_WALLET_TIP_KEYS as unknown as string[],
  tipInterval = 4000,
  showTips = true,
  logoSize = 100,
  spinnerSize = 140,
  bottomOffset = 0,
}: LoadingScreenProps) {
  const { t } = useTranslation();

  // Resolve tip keys through t() for i18n
  const resolvedTips = useMemo(
    () => tips.map((tipKey) => t(tipKey, tipKey)),
    [tips, t],
  );

  // State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(visible);

  // Animation values
  const pulseScale = useSharedValue(1);
  const spinRotation = useSharedValue(0);
  const tipOpacity = useSharedValue(1);
  const overlayOpacity = useSharedValue(visible ? 1 : 0);

  // Start/stop animations based on visibility
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      overlayOpacity.value = withTiming(1, { duration: 300 });

      // Pulse animation - breathing effect
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: PULSE_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: PULSE_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1, // infinite
        false
      );

      // Spin animation - continuous rotation
      spinRotation.value = withRepeat(
        withTiming(360, {
          duration: SPIN_DURATION,
          easing: Easing.linear,
        }),
        -1, // infinite
        false
      );
    } else {
      overlayOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(setIsVisible)(false);
        }
      });
    }
  }, [visible, overlayOpacity, pulseScale, spinRotation]);

  // Helper function to advance to next tip
  const advanceToNextTip = useCallback(() => {
    setCurrentTipIndex((prev) => (prev + 1) % resolvedTips.length);
  }, [resolvedTips.length]);

  // Helper function to fade tip back in
  // Note: tipOpacity is a Reanimated SharedValue which is stable and doesn't need to be in dependencies
  const fadeInTip = useCallback(() => {
    tipOpacity.value = withTiming(1, { duration: TIP_FADE_DURATION });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cycle through tips
  useEffect(() => {
    if (!visible || !showTips || resolvedTips.length <= 1) return;

    const interval = setInterval(() => {
      // Fade out current tip
      tipOpacity.value = withTiming(0, { duration: TIP_FADE_DURATION }, (finished) => {
        if (finished) {
          // Change tip and fade in
          runOnJS(advanceToNextTip)();
          runOnJS(fadeInTip)();
        }
      });
    }, tipInterval);

    return () => clearInterval(interval);
  }, [visible, showTips, resolvedTips.length, tipInterval, tipOpacity, advanceToNextTip, fadeInTip]);

  // Animated styles
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinRotation.value}deg` }],
  }));

  const tipStyle = useAnimatedStyle(() => ({
    opacity: tipOpacity.value,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Don't render if not visible
  if (!isVisible) return null;

  const spinnerStrokeWidth = 3;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={[styles.container, { paddingBottom: bottomOffset }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.content}>
          {/* Title */}
          {title && <Text style={styles.title}>{title}</Text>}

          {/* Subtitle */}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {/* Logo + Spinner Container */}
          <View style={[styles.logoSpinnerContainer, { width: spinnerSize, height: spinnerSize }]}>
            {/* Rotating Spinner */}
            <Animated.View style={[styles.spinnerContainer, spinStyle]}>
              <SpinnerArc size={spinnerSize} strokeWidth={spinnerStrokeWidth} />
            </Animated.View>

            {/* Pulsing Logo */}
            <Animated.View style={[styles.logoContainer, pulseStyle]}>
              <Image
                source={Logo}
                style={[styles.logo, { width: logoSize, height: logoSize }]}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

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
// Spinner Arc Component (SVG-like arc using View borders)
// ============================================================================

interface SpinnerArcProps {
  size: number;
  strokeWidth: number;
}

function SpinnerArc({ size, strokeWidth }: SpinnerArcProps) {
  // Create a partial arc using border styling
  // This creates a ~270 degree arc by having 3 sides with color and 1 transparent
  return (
    <View
      style={[
        styles.spinnerArc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderTopColor: colors.accent.primary,
          borderRightColor: colors.accent.primary,
          borderBottomColor: colors.accent.primary,
          borderLeftColor: 'transparent',
        },
      ]}
    />
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
  logoSpinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['5xl'],
  },
  spinnerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerArc: {
    // Styles applied inline for dynamic sizing
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    // Size applied inline
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
