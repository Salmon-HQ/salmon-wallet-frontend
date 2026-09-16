/**
 * PowerupsFab — the salmon that opens the Powerups catalogue over Home (and,
 * while it is up, closes it).
 *
 * It is a pressable accent `IconBubble` and nothing else: the circle, the
 * flesh, the specular and the press scale all come from the primitive, so this
 * file owns only what makes a FAB a FAB — where it floats, the glow that lifts
 * it off the water column, the leap on a tap and the close mark while the
 * catalogue is open (`fabLeap` in the theme says the numbers).
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Reanimated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { fabLeap, motionMs, s, shadows, spacing } from '@salmon/shared';
import { XIcon } from '../../icons';
import { useSemantic } from '../../theme/useThemedStyles';
import { curve, timing } from '../../utils/motion';
import { BrandMark } from '../BrandMark';
import { IconBubble } from '../IconBubble';
import type { PowerupsFabProps } from './types';

const FAB_SIZE = 42;
const FAB_ICON_SIZE = 22;

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
  const fadeTiming = useMemo(
    () => timing(motionMs.drift, isReduceMotionEnabled, curve.current),
    [isReduceMotionEnabled]
  );

  // 0 at rest, 1 at the top of the leap: the wrapper lifts and tilts by it.
  const leap = useSharedValue(0);
  // 0 with the salmon showing, 1 with the close mark: the two glyphs sit on
  // the same spot and trade opacity, so the state is legible on the control
  // that set it.
  const openness = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    openness.value = withTiming(open ? 1 : 0, fadeTiming);
  }, [open, fadeTiming, openness]);

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
  const markStyle = useAnimatedStyle(() => ({ opacity: 1 - openness.value }));
  const closeStyle = useAnimatedStyle(() => ({ opacity: openness.value }));

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
          <Reanimated.View testID="powerups-fab-mark-slot" style={[styles.glyph, markStyle]}>
            <BrandMark testID="powerups-fab-mark" size={s(FAB_ICON_SIZE)} color={accent.onFill} />
          </Reanimated.View>
          <Reanimated.View testID="powerups-fab-close-slot" style={[styles.glyph, closeStyle]}>
            <XIcon size={s(FAB_ICON_SIZE)} color={accent.onFill} weight="bold" />
          </Reanimated.View>
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
  glyph: {
    position: 'absolute',
  },
});

export default PowerupsFab;
