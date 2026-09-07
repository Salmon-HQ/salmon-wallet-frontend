/**
 * LockOverlay — the lock screen's own plane, and the gate.
 *
 * While the wallet is locked it covers the whole app, above everything, and
 * swallows every touch aimed at what is behind it. Unlocking lifts it: the
 * plane rises out of frame over `motionMs.rise`, uncovering the app from the
 * bottom up, which is the gate DESIGN.md §Motion has always described. It
 * used to simply unmount — a hard cut from the lock screen to whatever was
 * behind it, the flicker the owner reported (2026-09-07).
 *
 * The lock content mounts its own ground; the overlay owns the coverage, the
 * touch block and the rise.
 */
import { motionMs } from '@salmon/shared';
import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useReducedMotion,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';

import { curve } from '../../utils/motion';
import type { LockOverlayProps } from './types';

export type { LockOverlayProps };

/**
 * The gate's rise: the whole plane travels one screen height up on `sink`'s
 * accelerating curve — a gate takes its weight to start and then goes. No
 * fade: the plane is opaque and a gate does not become transparent, it leaves.
 *
 * @param height - the travel, one full screen.
 */
function riseExiting(height: number): EntryExitAnimationFunction {
  return () => {
    'worklet';
    return {
      initialValues: { transform: [{ translateY: 0 }] },
      animations: {
        transform: [
          { translateY: withTiming(-height, { duration: motionMs.rise, easing: curve.sink }) },
        ],
      },
    };
  };
}

export function LockOverlay({ children }: LockOverlayProps): React.ReactElement {
  const { height } = useWindowDimensions();
  const isReduceMotionEnabled = useReducedMotion();

  return (
    <Animated.View
      testID="lock-overlay"
      pointerEvents="auto"
      style={styles.overlay}
      exiting={isReduceMotionEnabled ? undefined : riseExiting(height)}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Above every other plane the shell paints: the water, the tab content,
    // the header slot and any sheet that was open when the lock landed.
    zIndex: 1000,
  },
});

export default LockOverlay;
