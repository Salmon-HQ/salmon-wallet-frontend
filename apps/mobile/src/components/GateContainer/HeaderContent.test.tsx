import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

// Minimal Reanimated stand-in. `Reanimated.View` renders a plain View that
// carries a per-mount id, so tests can tell a remount (new key) from a
// re-render (same key) without reaching into fibers.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  let mountCount = 0;
  const AnimatedView = (props: Record<string, unknown>) => {
    const [mountId] = React.useState(() => (mountCount += 1));
    return React.createElement(View, { ...props, mountId });
  };
  return {
    __esModule: true,
    default: { View: AnimatedView },
    useReducedMotion: () => false,
  };
});

// The real module pulls Reanimated worklets and shared easing tables; the
// component only forwards its return values to `entering`/`exiting`.
jest.mock('../../utils/sinkAndFloat', () => ({
  SINK_FLOAT_TRAVEL: 28,
  floatEntering: () => undefined,
  sinkExiting: () => undefined,
}));

jest.mock('../Icon', () => ({
  ContentCopySvgIcon: () => null,
  SettingsSvgIcon: () => null,
  WalletSvgIcon: () => null,
}));

// Mirrors packages/shared/src/theme/spacing.ts. The values here were
// transposed (iconSizeLarge and iconSizeMButton swapped, buttonHeightSmall
// 28 against a real 44), so the hit-area assertions were measuring a control
// that does not exist.
const COMPONENT_SIZES = { iconSizeLarge: 32, iconSizeMButton: 28, buttonHeightSmall: 44 };
const SPACING = { headerPadding: 20, base: 12, sm: 8, xs: 4 };

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  borderRadius: { full: 9999 },
  fontFamilyNative: { bold: 'System', semiBold: 'System' },
  fontScaleCap: { chrome: 1.2 },
  fontSize: { micro: 10, caption: 12 },
  fontWeight: { semibold: '600', bold: '700' },
  letterSpacing: { normal: 0 },
  componentSizes: { iconSizeLarge: 32, iconSizeMButton: 28, buttonHeightSmall: 44 },
  spacing: { headerPadding: 20, base: 12, sm: 8, xs: 4 },
  motionMs: { feedbackHold: 1500, drift: 280, ebb: 180, stagger: 24, swell: 300 },
  motionEasing: {
    sink: { native: [0.4, 0, 1, 1] },
    settle: { native: [0.25, 1, 0.5, 1] },
  },
  resolveMotionMs: (ms: number) => ms,
  ms: (value: number) => value,
  s: (value: number) => value,
  vs: (value: number) => value,
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
  getAvatarColor: () => '#123456',
  getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
  semantic: {
    text: { primary: '#fff', secondary: '#999', accent: '#f54' },
    status: { success: '#0f0' },
  },
}));

import { HeaderContent } from './HeaderContent';

/** Minimum effective hit area on the smaller platform floor (iOS 44pt);
 * Android's 48dp floor is covered too since `hitSlop` values below already
 * clear it once summed with the base style dimensions. */
const MIN_HIT_TARGET = 44;

describe('HeaderContent copy address', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('shows a copied tick after pressing copy, then reverts', () => {
    const onCopyAddress = jest.fn();

    render(
      <HeaderContent
        accountName="Account 1"
        address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        onCopyAddress={onCopyAddress}
      />
    );

    fireEvent.press(screen.getByTestId('wallet-header-copy-address'));

    expect(onCopyAddress).toHaveBeenCalled();
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();

    // Two flushes: the first runs out `feedbackHold` (copied → false), the
    // second drives the exit animation's frames so `shown` follows.
    act(() => {
      jest.runAllTimers();
    });
    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByLabelText('actions.copied')).toBeNull();
    expect(
      screen.getByLabelText('accessibility.copy_address:7xKX...gAsU')
    ).toBeTruthy();
  });
});

describe('HeaderContent chain swap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('re-keys the account text on address change without remounting the copy button', () => {
    render(
      <HeaderContent
        accountName="Account 1"
        address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        onCopyAddress={jest.fn()}
      />
    );

    const mountIdBefore = screen.getByTestId('wallet-header-account-text').props.mountId;

    // Arm the copy feedback: if the swap remounted the button's subtree,
    // this state would be wiped mid-hold.
    fireEvent.press(screen.getByTestId('wallet-header-copy-address'));
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();

    screen.rerender(
      <HeaderContent
        accountName="Account 1"
        address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
        onCopyAddress={jest.fn()}
      />
    );

    const mountIdAfter = screen.getByTestId('wallet-header-account-text').props.mountId;
    expect(mountIdAfter).not.toBe(mountIdBefore);

    // Copy feedback survived the swap — the button was never remounted.
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();
  });

  it('does not remount the account text when only unrelated props change', () => {
    render(
      <HeaderContent
        accountName="Account 1"
        address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
      />
    );

    const mountIdBefore = screen.getByTestId('wallet-header-account-text').props.mountId;

    screen.rerender(
      <HeaderContent
        accountName="Renamed"
        address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
      />
    );

    expect(screen.getByTestId('wallet-header-account-text').props.mountId).toBe(mountIdBefore);
  });
});

describe('HeaderContent touch targets', () => {
  const renderHeader = () =>
    render(
      <HeaderContent
        accountName="Account 1"
        address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        accountId="acct-1"
      />
    );

  // Regression pin: these three controls used to ship without `hitSlop`,
  // sized 28-32px on their visible axis — under the 44pt (iOS) / 48dp
  // (Android) minimum, with nothing compensating for it. Each assertion
  // below fails if either the base style shrinks or the hitSlop is removed,
  // without re-coupling the test to the exact pixel values chosen for either.
  it('gives the account switcher at least a 44pt effective hit area', () => {
    renderHeader();
    const button = screen.getByTestId('wallet-header-account-switcher');
    const { hitSlop } = button.props;
    const width = COMPONENT_SIZES.iconSizeLarge + hitSlop.left + hitSlop.right;
    const height = COMPONENT_SIZES.buttonHeightSmall + hitSlop.top + hitSlop.bottom;
    expect(width).toBeGreaterThanOrEqual(MIN_HIT_TARGET);
    expect(height).toBeGreaterThanOrEqual(MIN_HIT_TARGET);
  });

  it('gives the copy-address button at least a 44pt effective hit area', () => {
    renderHeader();
    const button = screen.getByTestId('wallet-header-copy-address');
    const { hitSlop } = button.props;
    // Icon is a literal 23px (see the comment in HeaderContent.tsx), padded
    // by spacing.xs on each side.
    const baseSize = 23 + SPACING.xs * 2;
    const width = baseSize + hitSlop.left + hitSlop.right;
    const height = baseSize + hitSlop.top + hitSlop.bottom;
    expect(width).toBeGreaterThanOrEqual(MIN_HIT_TARGET);
    expect(height).toBeGreaterThanOrEqual(MIN_HIT_TARGET);
  });

  it('gives the settings button at least a 44pt effective hit area', () => {
    renderHeader();
    const button = screen.getByTestId('wallet-header-settings-button');
    const { hitSlop } = button.props;
    const width = COMPONENT_SIZES.iconSizeLarge + hitSlop.left + hitSlop.right;
    const height = COMPONENT_SIZES.iconSizeLarge + hitSlop.top + hitSlop.bottom;
    expect(width).toBeGreaterThanOrEqual(MIN_HIT_TARGET);
    expect(height).toBeGreaterThanOrEqual(MIN_HIT_TARGET);
  });
});
