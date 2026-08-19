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
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
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

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  colors: {
    background: { primary: '#000', card: '#111' },
    text: { primary: '#fff' },
    border: { default: '#222' },
    dialog: { overlay: 'rgba(0,0,0,0.5)' },
  },
  fontFamilyNative: { bold: 'DMSansBold', semiBold: 'DMSansSemi' },
  fontScaleCap: { chrome: 1.2 },
  fontSize: { xs: 10, sm: 14, lg: 18 },
  fontWeight: { semibold: '600', bold: '700' },
  letterSpacing: { header: 0 },
  borderRadius: { '2xl': 24, header: 24, iconLg: 20 },
  componentSizes: {
    headerHeight: 56,
    iconSizeLarge: 28,
    iconSizeMButton: 32,
    buttonHeightSmall: 28,
  },
  motionMs: { feedbackHold: 1500 },
  shadows: {
    topSheet: {},
    header: { shadowColor: '#000', shadowOffset: {}, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  },
  spacing: { lg: 16, md: 12, headerPadding: 16, base: 12, sm: 8, xs: 4 },
  ms: (value: number) => value,
  s: (value: number) => value,
  vs: (value: number) => value,
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
  getAvatarColor: () => '#123456',
  getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
  semantic: {
    text: { primary: '#fff', secondary: '#999', accent: '#f54' },
    status: { success: '#0f0' },
    border: { raised: '#333', default: '#222' },
  },
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
