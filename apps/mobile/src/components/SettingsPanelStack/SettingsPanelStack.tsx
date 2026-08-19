/**
 * SettingsPanelStack – React Native panel stack speaking the sink-and-float.
 *
 * Renders stacked panels on top of the settings menu using navigation/animation
 * state owned by the parent sheet. Includes swipe-right gesture to pop.
 *
 * Push/pop used to slide horizontally (shared-axis). DESIGN.md §Motion replaced
 * shared-axis for content swaps — "shared-axis has a left and a right, and the
 * water does not" — so the stack now speaks the verb: the covered panel sinks
 * (`curve.sink`, SINK_OUT_MS), the incoming panel floats up after one beat
 * (`FLOAT_DELAY_MS`), and a pop is the mirror — the top panel sinks and the
 * revealed one floats back. The values are driven `withTiming`s rather than
 * Reanimated entering/exiting props because the sheet owns the mount/unmount
 * clock (its `route`/`ebb` bookkeeping timers): a layout `exiting` would only
 * start at the unmount the sheet schedules, adding one dead `ebb` of lag.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors, motionMs } from '@salmon/shared';

import type { MobileSettingsPanelStackProps } from './types';
import { curve, timing } from '../../utils/motion';
import {
  FLOAT_DELAY_MS,
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
} from '../../utils/sinkAndFloat';

const SWIPE_THRESHOLD = 80;
/**
 * The beat a revealed panel waits before floating back — the sink that
 * uncovers it has already played inside the sheet's `ebb` window, so only the
 * pause itself remains (see `FLOAT_DELAY_MS`'s derivation: sink + 90).
 */
const REVEAL_BEAT_MS = FLOAT_DELAY_MS - SINK_OUT_MS;

export function SettingsPanelStack({
  panelRegistry,
  stack,
  onNavigate,
  onBack,
  animating,
  slideDirection,
}: MobileSettingsPanelStackProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {stack.map((entry, idx) => {
        const isTop = idx === stack.length - 1;
        // Only render top 2 panels for performance
        if (idx < stack.length - 2) return null;
        const isExiting = isTop && animating && slideDirection === 'out';
        return (
          <PanelSlide
            key={`${entry.screen}-${idx}`}
            direction={isTop && animating ? slideDirection : 'idle'}
            isTop={isTop}
            animating={animating && isTop}
            onSwipeRight={onBack}
            canSwipe={isTop && !animating}
          >
            {panelRegistry[entry.screen]?.({
              onBack: isExiting ? () => {} : onBack,
              onNavigate: isExiting ? () => {} : onNavigate,
              ...(entry.props || {}),
            })}
          </PanelSlide>
        );
      })}
    </View>
  );
}

// ============================================================================
// PanelSlide — animated panel wrapper
// ============================================================================

interface PanelSlideProps {
  children: React.ReactNode;
  direction: 'in' | 'out' | 'idle';
  isTop: boolean;
  animating: boolean;
  canSwipe?: boolean;
  onSwipeRight?: () => void;
}

function PanelSlide({
  children,
  direction,
  isTop,
  animating,
  canSwipe = false,
  onSwipeRight,
}: PanelSlideProps): React.ReactElement {
  // A panel mounting as the pushed top starts under the surface; a panel
  // mounting as the covered one below starts (and stays) sunk; a panel
  // mounted with no animation (the sheet's initial panels) starts at rest.
  const startsSunk = (isTop && animating && direction === 'in') || !isTop;
  const translateY = useSharedValue(startsSunk ? SINK_FLOAT_TRAVEL : 0);
  const opacity = useSharedValue(startsSunk ? 0 : 1);
  const scale = useSharedValue(startsSunk ? FLOAT_ENTER_SCALE : 1);

  const isReduceMotionEnabled = useReducedMotion();
  // The float: travel and scale come to rest on `settle`, the light returns
  // on `sink`'s accelerating bezier (Beer–Lambert) — floatEntering's shape,
  // driven by hand because the sheet, not the mount, owns the clock here.
  const floatTravel = timing(FLOAT_IN_MS, isReduceMotionEnabled, curve.settle);
  const floatLight = timing(FLOAT_IN_MS, isReduceMotionEnabled, curve.sink);
  // The covered panel's sink — sinkExiting's shape on its own duration.
  const sinkOut = timing(SINK_OUT_MS, isReduceMotionEnabled, curve.sink);
  // The popped panel's sink is pinned to `ebb`, not SINK_OUT_MS: the owning
  // sheet unmounts the panel on its `ebb` bookkeeping timer (out of this
  // component's reach), and a 360ms sink would be cut mid-flight at 180.
  const popSink = timing(motionMs.ebb, isReduceMotionEnabled, curve.sink);

  const prevIsTopRef = useRef(isTop);
  useEffect(() => {
    const wasTop = prevIsTopRef.current;
    prevIsTopRef.current = isTop;

    const float = (delayMs: number) => {
      const rise = (toValue: number, config: typeof floatTravel) =>
        delayMs > 0 && !isReduceMotionEnabled
          ? withDelay(delayMs, withTiming(toValue, config))
          : withTiming(toValue, config);
      translateY.value = rise(0, floatTravel);
      scale.value = rise(1, floatTravel);
      opacity.value = rise(1, floatLight);
    };

    if (!isTop) {
      if (wasTop) {
        // A push covered this panel: it sinks while the new one floats.
        translateY.value = withTiming(SINK_FLOAT_TRAVEL, sinkOut);
        scale.value = withTiming(FLOAT_ENTER_SCALE, sinkOut);
        opacity.value = withTiming(0, sinkOut);
      }
      // Mounted as the covered panel: the initial values already hold it sunk.
      return;
    }

    if (animating && direction === 'out') {
      // Pop: leaving is sinking.
      translateY.value = withTiming(SINK_FLOAT_TRAVEL, popSink);
      opacity.value = withTiming(0, popSink);
      return;
    }

    if (animating && direction === 'in') {
      // Push: arriving is floating — never before the outgoing surface's
      // full sink plus the beat (owner: the ordering is non-negotiable;
      // FLOAT_DELAY_MS = SINK_OUT_MS + 90 is exactly that grammar).
      float(FLOAT_DELAY_MS);
      return;
    }

    if (!wasTop) {
      // A pop revealed this panel: it floats back from where it sank,
      // waiting out only the beat — the uncovering sink already played.
      float(REVEAL_BEAT_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animating, isTop, direction, isReduceMotionEnabled]);

  // Swipe-right gesture to pop — useMemo so the responder updates when deps change
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (
          _e: GestureResponderEvent,
          gestureState: PanResponderGestureState
        ) => {
          return canSwipe && gestureState.dx > 10 && Math.abs(gestureState.dy) < 30;
        },
        onPanResponderRelease: (
          _e: GestureResponderEvent,
          gestureState: PanResponderGestureState
        ) => {
          if (gestureState.dx > SWIPE_THRESHOLD && onSwipeRight) {
            onSwipeRight();
          }
        },
      }),
    [canSwipe, onSwipeRight]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.panel, { zIndex: isTop ? 2 : 1 }, animatedStyle]}
      {...(canSwipe ? panResponder.panHandlers : {})}
    >
      {/* No scales: settings panels are rows of labels, inputs and the
          private-key and seed-phrase surfaces. */}
      <View style={styles.panelBackground} />
      <View style={styles.panelContent}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  panel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.primary,
    overflow: 'hidden',
  },
  panelBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.primary,
  },
  panelContent: {
    flex: 1,
  },
});

export default SettingsPanelStack;
