/**
 * Regression: the copy-address checkmark must show through the real mounting
 * path.
 *
 * `HeaderContent.test.tsx` renders `HeaderContent` directly and passed while
 * the app did not — it never exercises the wrapper `GateContainer` actually
 * mounts it inside (the reanimated `Animated.View` header bar, the opacity
 * fade). This test goes through `GateContainer` itself, the way
 * `app/(app)/(tabs)/_layout.tsx` really renders it, so a regression in the
 * wrapping tree fails here even when `HeaderContent` in isolation is fine.
 */
import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { GateContainer } from '../src/components/GateContainer/GateContainer';
import { HeaderContent } from '../src/components/GateContainer/HeaderContent';

jest.useFakeTimers();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    withTiming: (target: number) => target,
    Easing: {
      in: (fn: unknown) => fn,
      out: (fn: unknown) => fn,
      cubic: (t: number) => t,
      bezier: (...args: number[]) => args,
    },
    runOnJS: (fn: unknown) => fn,
  };
});

// The bubble is a control now: it pulls the repo's press idiom (motion hook,
// flesh, specular), none of which says anything about this component.
jest.mock('../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));
jest.mock('../src/components/FleshBackground', () => ({ FleshBackground: () => null }));
jest.mock('../src/components/PressSpecular', () => ({
  PressSpecular: () => null,
  SPECULAR_OPACITY: 0.12,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('../src/components/Icon', () => ({
  ContentCopySvgIcon: () => null,
  SettingsSvgIcon: () => null,
  WalletSvgIcon: () => null,
}));
jest.mock('../src/components/BrandMark', () => ({
  BrandMark: () => null,
}));

// The gate's ground. Its own suite asserts the material; here it only has to
// mount without pulling the scales field's tokens through the mocked barrel.
jest.mock('../src/components/Thermocline', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Thermocline: (props: { tier?: string; style?: unknown }) => (
      <View testID="gate-thermocline" {...props} />
    ),
  };
});

// Real design tokens (theme is self-contained; scalers are identities) so a
// component reading a token this mock never anticipated fails on the
// component, not on the mock. See test-utils/themeTokens.ts.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../test-utils/themeTokens'),
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
}));

describe('GateContainer + HeaderContent (real mounting path)', () => {
  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  it('shows the copied tick after pressing copy through GateContainer', () => {
    render(
      <GateContainer
        state="collapsed"
        lockContent={<Text testID="lock-content">lock</Text>}
        headerContent={
          <HeaderContent
            accountName="Account 1"
            address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
            onCopyAddress={jest.fn()}
          />
        }
        settingsContent={<Text testID="settings-content">settings</Text>}
        walletsContent={<Text testID="wallets-content">wallets</Text>}
      />
    );

    fireEvent.press(screen.getByTestId('wallet-header-copy-address'));

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
  });
});
