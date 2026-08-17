import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

// The shared barrel reaches the Solana ESM packages, which this Jest config
// does not transform. Only the motion tokens matter here.
jest.mock('@salmon/shared', () => ({
  opacity: { disabled: 0.5, full: 1 },
  motionMs: { swell: 180, pulseCycle: 1200 },
  motionEasing: {
    current: { native: [0.32, 0.72, 0, 1] },
    settle: { native: [0.22, 1, 0.36, 1] },
    sink: { native: [0.4, 0, 1, 1] },
    swellIn: { native: [0.34, 1.14, 0.64, 1] },
  },
  resolveMotionMs: (ms: number, reduced: boolean) => (reduced ? 0 : ms),
}));

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withRepeat: (animation: unknown) => animation,
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => () => 0 },
  };
});

import { PendingValue } from './PendingValue';

/**
 * The container is not what is loading. A value being recalculated stays
 * readable in place — it never gives way to a placeholder — and it survives the
 * transition from pending to settled without remounting, so a number that comes
 * back unchanged plays no arrival animation.
 */
describe('PendingValue', () => {
  it('keeps the value on screen while it is being recalculated', () => {
    render(
      <PendingValue pending>
        <Text>1.23 USDC</Text>
      </PendingValue>
    );

    expect(screen.getByText('1.23 USDC')).toBeTruthy();
  });

  it('does not remount the value when the refresh returns the same number', () => {
    const { rerender } = render(
      <PendingValue pending>
        <Text>1.23 USDC</Text>
      </PendingValue>
    );
    const before = screen.getByText('1.23 USDC');

    rerender(
      <PendingValue pending={false}>
        <Text>1.23 USDC</Text>
      </PendingValue>
    );

    expect(screen.getByText('1.23 USDC')).toBe(before);
  });
});
