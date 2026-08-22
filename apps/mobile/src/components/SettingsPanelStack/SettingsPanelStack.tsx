/**
 * SettingsPanelStack – React Native panel stack speaking the sink-and-float.
 *
 * Renders the settings panels on top of the menu using navigation/animation
 * state owned by the parent sheet. Includes swipe-right gesture to pop.
 *
 * Push/pop used to slide horizontally (shared-axis). DESIGN.md §Motion replaced
 * shared-axis for content swaps — "shared-axis has a left and a right, and the
 * water does not" — so the stack speaks the verb: the panel on screen sinks
 * (`curve.sink`, SINK_OUT_MS), and only then does the next one float up.
 *
 * The two halves are **strictly sequential**, never overlapping: exactly one
 * panel is on screen at a time, and the incoming one is not even mounted until
 * the outgoing one has finished sinking — a push raises the rendered depth
 * from the sink's own completion callback, not from a hand-tuned delay that
 * could drift out of step with `SINK_OUT_MS`. Between the two halves the
 * content area is genuinely empty for one beat (`REVEAL_BEAT_MS`); that beat
 * is what makes the eye read two gestures instead of a crossfade.
 *
 * A pop is the mirror and needs no callback: the sheet already sinks the top
 * panel across its own `ebb` window and shortens the stack afterwards, so the
 * revealed panel mounts after the sink either way.
 *
 * The values are driven `withTiming`s rather than Reanimated entering/exiting
 * props because the sheet owns the mount/unmount clock (its `route`/`ebb`
 * bookkeeping timers): a layout `exiting` would only start at the unmount the
 * sheet schedules, adding one dead `ebb` of lag. So the shapes here are
 * rebuilt from the shared constants rather than borrowed from `floatEntering`
 * / `sinkExiting`, and any re-weighting of the verb has to be applied to them
 * by hand — including the depth reading (scale carries the Z, travel is the
 * accent), which the panels speak at full content depth, not chrome's.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  runOnJS,
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
  SINK_EXIT_SCALE,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
} from '../../utils/sinkAndFloat';

const SWIPE_THRESHOLD = 80;
/**
 * The empty beat between the sink and the float. The sink is no longer waited
 * out by the delay — the arriving panel does not exist until it is over — so
 * only the pause itself remains (see `FLOAT_DELAY_MS`'s derivation: sink + 90).
 */
const REVEAL_BEAT_MS = FLOAT_DELAY_MS - SINK_OUT_MS;

/** What the panel currently on screen is doing on its way out. */
type SinkKind = 'push' | 'pop' | null;

export function SettingsPanelStack({
  panelRegistry,
  stack,
  onNavigate,
  onBack,
  animating,
  slideDirection,
}: MobileSettingsPanelStackProps): React.ReactElement {
  const isReduceMotionEnabled = useReducedMotion();
  // How deep into `stack` the screen has actually caught up. A push grows
  // `stack` immediately; this follows only once the outgoing panel has sunk.
  const [shownDepth, setShownDepth] = useState(stack.length);

  // A push waits for the sink. Everything else settles at once: a pop (the
  // sheet sank the top before shortening the stack), the sheet's first panels
  // (nothing on screen to sink), a close/reset, and reduce motion (a cut).
  const waitsForSink = stack.length > shownDepth && shownDepth > 0 && !isReduceMotionEnabled;

  useEffect(() => {
    if (!waitsForSink && stack.length !== shownDepth) {
      setShownDepth(stack.length);
    }
  }, [stack.length, shownDepth, waitsForSink]);

  // The sink's own completion — a push adds exactly one entry, so the depth
  // steps by one and the pushed panel mounts on the very next render.
  const revealPushedPanel = useCallback(() => {
    setShownDepth((depth) => depth + 1);
  }, []);

  // Whether a panel was already on screen when this one mounts. It carries the
  // value committed for the previous panel: true after a sink (push or pop) —
  // the arrival floats — and false for the sheet's first panel, which has
  // nothing to follow and simply appears. `PanelSlide` reads it once, at mount.
  const [hasShownPanel, setHasShownPanel] = useState(false);
  useEffect(() => {
    setHasShownPanel(shownDepth > 0);
  }, [shownDepth]);

  const index = shownDepth - 1;
  const entry = index >= 0 ? stack[index] : undefined;
  if (!entry) return <View style={styles.container} />;

  const sink: SinkKind =
    animating && slideDirection === 'out' ? 'pop' : waitsForSink ? 'push' : null;

  return (
    <View style={styles.container}>
      <PanelSlide
        key={`${entry.screen}-${index}`}
        enter={hasShownPanel ? 'float' : 'rest'}
        sink={sink}
        onSinkEnd={revealPushedPanel}
        onSwipeRight={onBack}
        canSwipe={!animating && !waitsForSink}
      >
        {panelRegistry[entry.screen]?.({
          onBack: sink ? () => {} : onBack,
          onNavigate: sink ? () => {} : onNavigate,
          ...(entry.props || {}),
        })}
      </PanelSlide>
    </View>
  );
}

// ============================================================================
// PanelSlide — animated panel wrapper
// ============================================================================

interface PanelSlideProps {
  children: React.ReactNode;
  /** `float` rises from depth after the beat; `rest` is already surfaced. */
  enter: 'float' | 'rest';
  sink: SinkKind;
  /** Called when a push's sink finishes — the cue to mount the next panel. */
  onSinkEnd: () => void;
  canSwipe?: boolean;
  onSwipeRight?: () => void;
}

function PanelSlide({
  children,
  enter,
  sink,
  onSinkEnd,
  canSwipe = false,
  onSwipeRight,
}: PanelSlideProps): React.ReactElement {
  const startsSunk = enter === 'float';
  const translateY = useSharedValue(startsSunk ? SINK_FLOAT_TRAVEL : 0);
  const opacity = useSharedValue(startsSunk ? 0 : 1);
  const scale = useSharedValue(startsSunk ? FLOAT_ENTER_SCALE : 1);

  const isReduceMotionEnabled = useReducedMotion();
  // The float: the panel arrives from depth — scale releases from
  // FLOAT_ENTER_SCALE with the travel accent, both coming to rest on `settle`,
  // while the light returns on `sink`'s accelerating bezier (Beer–Lambert).
  // floatEntering's shape, driven by hand because the sheet, not the mount,
  // owns the clock here.
  const floatTravel = timing(FLOAT_IN_MS, isReduceMotionEnabled, curve.settle);
  const floatLight = timing(FLOAT_IN_MS, isReduceMotionEnabled, curve.sink);
  // The covered panel's sink — sinkExiting's shape on its own duration. The
  // recession lands on `settle` while travel and light accelerate on `sink`,
  // the same split the factory makes: the depth is where the panel comes to
  // rest, the drop and the darkening are what it does on the way.
  const sinkOut = timing(SINK_OUT_MS, isReduceMotionEnabled, curve.sink);
  const recedeOut = timing(SINK_OUT_MS, isReduceMotionEnabled, curve.settle);
  // The popped panel's sink is pinned to `ebb`, not SINK_OUT_MS: the owning
  // sheet unmounts the panel on its `ebb` bookkeeping timer (out of this
  // component's reach), and a 360ms sink would be cut mid-flight at 180.
  const popSink = timing(motionMs.ebb, isReduceMotionEnabled, curve.sink);
  const popRecede = timing(motionMs.ebb, isReduceMotionEnabled, curve.settle);

  // Arriving: float up after the beat the sink left empty. Reduce motion has
  // no beat to keep — the delay is dropped and the timings resolve to a cut.
  useEffect(() => {
    if (enter !== 'float') return;
    const rise = (toValue: number, config: typeof floatTravel) =>
      isReduceMotionEnabled
        ? withTiming(toValue, config)
        : withDelay(REVEAL_BEAT_MS, withTiming(toValue, config));
    translateY.value = rise(0, floatTravel);
    scale.value = rise(1, floatTravel);
    opacity.value = rise(1, floatLight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving: sinking. A push reports the end of its sink so the next panel can
  // mount; a pop is timed by the sheet, which unmounts this panel itself.
  useEffect(() => {
    if (!sink) return;
    const config = sink === 'pop' ? popSink : sinkOut;
    const recede = sink === 'pop' ? popRecede : recedeOut;
    translateY.value = withTiming(SINK_FLOAT_TRAVEL, config, () => {
      // Fires cut short as well as completed: a sink that was interrupted must
      // still hand over, or the stack would stay on the panel that left.
      'worklet';
      if (sink === 'push') runOnJS(onSinkEnd)();
    });
    scale.value = withTiming(SINK_EXIT_SCALE, recede);
    opacity.value = withTiming(0, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sink]);

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
      style={[styles.panel, animatedStyle]}
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
