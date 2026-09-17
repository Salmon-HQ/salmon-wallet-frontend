/**
 * PowerupsFab — the salmon that opens the Powerups catalogue over Home (and,
 * while it is up, closes it).
 *
 * It is a pressable accent `IconBubble` and nothing else: the circle, the
 * flesh, the specular and the press scale all come from the primitive, so
 * this file owns only what makes a FAB a FAB — where it floats, the glow
 * that lifts it off the water column, and the leap on a tap (`fabLeap` in
 * the theme says the numbers). The salmon mark is the icon in both the open
 * and closed state — no cross-fade to a close glyph (owner, 2026-09-17).
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Reanimated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { componentSizes, fabLeap, motionMs, s, shadows, spacing } from '@salmon/shared';
import { useSemantic } from '../../theme/useThemedStyles';
import { curve, timing } from '../../utils/motion';
import { BrandMark } from '../BrandMark';
import { IconBubble } from '../IconBubble';
import type { PowerupsFabProps } from './types';

/**
 * The FAB reads as iOS 26's detached tab-bar search button: a round Liquid
 * Glass control at the trailing edge of the band a tab bar occupies, sized
 * to that bar's height (Apple HIG, "Tab bars": the standard iOS tab bar
 * content height is 49pt — https://developer.apple.com/design/human-interface-guidelines/tab-bars —
 * and iOS 26 keeps that height for the floating bar and its detached search
 * tab; Apple has not republished exact new-bar geometry, so this borrows the
 * app's existing 48px control height, `buttonHeightMedium`, one point off
 * rather than minting a near-duplicate token). The glyph keeps the same
 * ratio to the bubble as before (22/42), rounded to the nearest icon token.
 */
const FAB_SIZE = componentSizes.buttonHeightMedium;
const FAB_ICON_SIZE = componentSizes.iconSizeMedium;

export const PowerupsFab: React.FC<PowerupsFabProps> = ({
  onPress,
  open = false,
  bottomOffset,
  style,
  testID = 'powerups-fab',
}) => {
  const { t } = useTranslation();
  const { accent } = useSemantic();
  const isReduceMotionEnabled = useReducedMotion();

  // The configs are built here, on the JS thread, and only the resulting
  // plain objects cross into the worklet: calling `timing()` inside a worklet
  // crashed the app at launch.
  const riseTiming = useMemo(
    () => timing(motionMs.swell, isReduceMotionEnabled, curve.current),
    [isReduceMotionEnabled]
  );
  const landTiming = useMemo(
    () => timing(motionMs.ebb, isReduceMotionEnabled, curve.sink),
    [isReduceMotionEnabled]
  );

  // 0 at rest, 1 at the top of the leap: the wrapper lifts and tilts by it.
  const leap = useSharedValue(0);

  // A plain function: the compiler's lint refuses a shared-value write
  // inside a memoised callback, and there is nothing here worth memoising.
  const handlePress = () => {
    if (!isReduceMotionEnabled) {
      leap.value = withSequence(withTiming(1, riseTiming), withTiming(0, landTiming));
    }
    onPress();
  };

  const leapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -leap.value * fabLeap.risePx },
      { rotate: `${-leap.value * fabLeap.tiltDeg}deg` },
    ],
  }));

  return (
    <Reanimated.View
      testID={`${testID}-leap`}
      style={[
        styles.fab,
        { right: s(spacing.screenGutter), bottom: bottomOffset },
        leapStyle,
        style,
      ]}
    >
      <IconBubble
        testID={testID}
        size={FAB_SIZE}
        tone="accent"
        onPress={handlePress}
        accessibilityLabel={
          open
            ? t('accessibility.close_powerups', 'Close Powerups')
            : t('accessibility.open_powerups', 'Open Powerups')
        }
      >
        <View style={styles.glyphs} pointerEvents="none">
          <BrandMark testID="powerups-fab-mark" size={s(FAB_ICON_SIZE)} color={accent.onFill} />
        </View>
      </IconBubble>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    ...shadows.button,
  },
  glyphs: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PowerupsFab;
