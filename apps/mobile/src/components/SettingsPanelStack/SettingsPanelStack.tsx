/**
 * SettingsPanelStack – React Native panel stack with reanimated slide animations.
 *
 * Renders stacked panels on top of the settings menu using navigation/animation
 * state owned by the parent sheet. Includes swipe-right gesture to pop.
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';

import { colors, motionMs } from '@salmon/shared';

import type { MobileSettingsPanelStackProps } from './types';
import { curve, timing } from '../../utils/motion';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;

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
  const translateX = useSharedValue(direction === 'in' && animating ? SCREEN_WIDTH : 0);

  // A pushed panel is a route: it arrives on `route` and leaves on `ebb`. The
  // owning sheet clears its animating flag off the same two tokens, so the two
  // cannot drift apart the way 300/200 in two files could.
  const isReduceMotionEnabled = useReducedMotion();
  const push = timing(motionMs.route, isReduceMotionEnabled);
  const pop = timing(motionMs.ebb, isReduceMotionEnabled, curve.sink);

  useEffect(() => {
    if (!isTop) {
      translateX.value = 0;
      return;
    }

    if (animating && direction === 'in') {
      translateX.value = SCREEN_WIDTH;
      const frame = requestAnimationFrame(() => {
        translateX.value = withTiming(0, push);
      });

      return () => cancelAnimationFrame(frame);
    }

    if (animating && direction === 'out') {
      translateX.value = withTiming(SCREEN_WIDTH, pop);
      return;
    }

    translateX.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animating, isTop, direction, translateX, isReduceMotionEnabled]);

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
    transform: [{ translateX: translateX.value }],
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
