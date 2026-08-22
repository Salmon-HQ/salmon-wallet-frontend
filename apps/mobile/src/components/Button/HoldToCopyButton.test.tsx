/**
 * The copy must cost a hold: a tap that never became a hold does nothing,
 * and holding for the full window commits exactly once.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
}));

jest.mock('react-native-reanimated', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: { View, Text, createAnimatedComponent: (c: unknown) => c },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    withTiming: (value: unknown) => value,
    withDelay: (_delay: number, value: unknown) => value,
    withSpring: (value: unknown) => value,
    withRepeat: (value: unknown) => value,
    withSequence: (value: unknown) => value,
    runOnJS: (fn: unknown) => fn,
    interpolate: () => 0,
    Easing: {
      in: (fn: unknown) => fn,
      out: (fn: unknown) => fn,
      inOut: (fn: unknown) => fn,
      linear: (t: number) => t,
      ease: (t: number) => t,
      cubic: (t: number) => t,
      bezier: (...args: number[]) => args,
    },
  };
});

import { HoldToCopyButton } from './HoldToCopyButton';

describe('HoldToCopyButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not commit on a plain tap', () => {
    const onCopy = jest.fn();
    render(
      <HoldToCopyButton onCopy={onCopy} testID="hold-copy">
        Hold to copy
      </HoldToCopyButton>
    );
    fireEvent.press(screen.getByTestId('hold-copy'));
    expect(onCopy).not.toHaveBeenCalled();
  });

  it('commits once after being held for the full window', () => {
    const onCopy = jest.fn();
    render(
      <HoldToCopyButton onCopy={onCopy} testID="hold-copy">
        Hold to copy
      </HoldToCopyButton>
    );
    fireEvent(screen.getByTestId('hold-copy'), 'touchStart');
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('cancels when released early', () => {
    const onCopy = jest.fn();
    render(
      <HoldToCopyButton onCopy={onCopy} testID="hold-copy">
        Hold to copy
      </HoldToCopyButton>
    );
    const button = screen.getByTestId('hold-copy');
    fireEvent(button, 'touchStart');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    fireEvent(button, 'touchEnd');
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onCopy).not.toHaveBeenCalled();
  });
});
