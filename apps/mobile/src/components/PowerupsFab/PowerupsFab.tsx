/**
 * PowerupsFab — the `+` floating action button that opens the Powerups
 * launcher sheet.
 *
 * It is a pressable accent `IconBubble` and nothing else: the circle, the
 * flesh, the specular and the press scale all come from the primitive, so this
 * file owns only what makes a FAB a FAB — where it floats and the glow that
 * lifts it off the water column.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { motionMs, s, shadows, spacing } from '@salmon/shared';
import { PlusIcon } from '../../icons';
import { curve, timing } from '../../utils/motion';
import { IconBubble } from '../IconBubble';
import type { PowerupsFabProps } from './types';

const FAB_SIZE = 42;
const FAB_ICON_SIZE = 22;
/** The plus becomes the close mark by turning an eighth of a turn. */
const OPEN_ROTATION = 45;

export const PowerupsFab: React.FC<PowerupsFabProps> = ({
  onPress,
  open = false,
  bottomOffset,
  style,
  testID = 'powerups-fab',
}) => {
  const { t } = useTranslation();
  const isReduceMotionEnabled = useReducedMotion();

  // A plus turned 45 degrees IS the close mark — the same glyph, not a swap,
  // so the launcher's open state is legible on the control that opened it.
  // It is a state change in place, so it runs on `swell` (reduce motion:
  // `timing` resolves to a cut and the mark still ends up rotated).
  //
  // The config is built here, on the JS thread, and only the resulting plain
  // object crosses into the worklet. Calling `timing()` inside
  // `useAnimatedStyle` crashed the app at launch: "[Worklets] Tried to
  // synchronously call a non-worklet function 'timing' on the UI thread".
  const rotateTiming = useMemo(
    () => timing(motionMs.swell, isReduceMotionEnabled, curve.settle),
    [isReduceMotionEnabled]
  );
  const rotation = useSharedValue(open ? OPEN_ROTATION : 0);
  useEffect(() => {
    rotation.value = withTiming(open ? OPEN_ROTATION : 0, rotateTiming);
  }, [open, rotateTiming, rotation]);

  return (
    <IconBubble
      testID={testID}
      size={FAB_SIZE}
      tone="accent"
      icon={PlusIcon}
      iconWeight="bold"
      iconSize={FAB_ICON_SIZE}
      onPress={onPress}
      accessibilityLabel={
        open
          ? t('accessibility.close_powerups', 'Close Powerups')
          : t('accessibility.open_powerups', 'Open Powerups')
      }
      rotation={rotation}
      style={[styles.fab, { right: s(spacing.screenGutter), bottom: bottomOffset }, style]}
    />
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    ...shadows.button,
  },
});

export default PowerupsFab;
