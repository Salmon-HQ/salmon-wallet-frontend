import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, screen, fireEvent } from '@testing-library/react-native';

const mockSetStringAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: unknown[]) => mockSetStringAsync(...args),
}));

jest.mock('../../utils/haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  // `IconBubble` and `KeyValueRow` pull tokens (componentSizes, fontScaleCap,
  // tabularNums, semantic.*, borderRadius.r3/r4/full, …) this row never used
  // to reach directly — the shared token mock is the one place that keeps
  // all of them (plus the motion vocabulary the mobile wrapper hook reads)
  // in sync, with `s`/`ms`/`vs` as identities instead of the real
  // `Dimensions`-backed scalers.
  ...jest.requireActual('../../../test-utils/themeTokens'),
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
}));

// No worklets runtime in Jest: `IconBubble`'s animated touchable and its
// press hook need plain-JS stand-ins (same shape as `IconBubble.test.tsx`).
jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RNView,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
  };
});

jest.mock('../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

import { AddressCopyRow } from './AddressCopyRow';

describe('AddressCopyRow copy feedback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('announces the copy confirmation and reverts to the copy label', async () => {
    render(<AddressCopyRow label="From" address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('tx-detail-copy-address-From'));
    });

    expect(mockSetStringAsync).toHaveBeenCalled();
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();

    act(() => {
      jest.runAllTimers();
    });
    // The hold has expired; the tick is now playing its exit (`ebb`) before
    // unmounting, so run the timer the exit effect scheduled.
    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByLabelText('actions.copied')).toBeNull();
    expect(screen.getByLabelText('transactions.detail.copyAddressLabel:From')).toBeTruthy();
  });

  it('sets the address in mono at the address size', () => {
    render(<AddressCopyRow label="From" address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" />);

    const address = StyleSheet.flatten(screen.getByText('7xKXtg...osgAsU').props.style);

    expect(address.fontFamily).toBe('GeistMonoRegular');
    expect(address.fontSize).toBe(13);
  });
});
