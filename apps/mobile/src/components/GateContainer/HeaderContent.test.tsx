import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-image', () => ({
  Image: () => null,
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
  colors: { text: { primary: '#fff' } },
  fontFamilyNative: { bold: 'System', semiBold: 'System' },
  fontScaleCap: { chrome: 1.2 },
  fontSize: { xs: 10, sm: 14 },
  fontWeight: { semibold: '600', bold: '700' },
  letterSpacing: { header: 0 },
  componentSizes: { iconSizeLarge: 32, iconSizeMButton: 28, buttonHeightSmall: 44 },
  spacing: { headerPadding: 20, base: 12, sm: 8, xs: 4 },
  motionMs: { feedbackHold: 1500 },
  ms: (value: number) => value,
  s: (value: number) => value,
  vs: (value: number) => value,
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
  getAvatarColor: () => '#123456',
  getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
  semantic: {
    text: { secondary: '#999', accent: '#f54' },
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

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByLabelText('actions.copied')).toBeNull();
    expect(
      screen.getByLabelText('accessibility.copy_address:7xKX...gAsU')
    ).toBeTruthy();
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
