/**
 * Plain-JS stand-in for `react-native-reanimated`, for a test that renders a
 * component which animates but asserts nothing about the motion. The real
 * module loads a native one Jest does not have.
 *
 *   jest.mock('react-native-reanimated', () =>
 *     require('<path>/test-utils/reanimatedStub')
 *   );
 */
import React from 'react';
import { View } from 'react-native';

const identity = (value: unknown) => value;

module.exports = {
  __esModule: true,
  default: {
    View,
    createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
      React.forwardRef(function Animated(props: Record<string, unknown>, ref: unknown) {
        return React.createElement(Component, { ...props, ref });
      }),
  },
  useSharedValue: (value: unknown) => ({ value }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  useReducedMotion: () => false,
  withTiming: identity,
  withSpring: identity,
  Easing: { bezier: () => identity },
};
