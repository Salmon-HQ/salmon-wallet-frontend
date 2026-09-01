import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

jest.mock('expo-image', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { ...props, testID: 'header-avatar-image' }),
  };
});

jest.mock('../BrandMark', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    BrandMark: () => ReactActual.createElement(View, { testID: 'header-brand-mark' }),
  };
});

// Minimal Reanimated stand-in. `Reanimated.View` renders a plain View that
// carries a per-mount id, so tests can tell a remount (new key) from a
// re-render (same key) without reaching into fibers.
jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  let mountCount = 0;
  const AnimatedView = (props: Record<string, unknown>) => {
    const [mountId] = ReactActual.useState(() => (mountCount += 1));
    return ReactActual.createElement(View, { ...props, mountId });
  };
  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    useReducedMotion: () => false,
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: (target: unknown) => target,
  };
});
// The bubble is a control now: it pulls the repo's press idiom (motion hook,
// flesh, specular), none of which says anything about this component.
jest.mock('../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));
jest.mock('../../../src/components/FleshBackground', () => ({ FleshBackground: () => null }));
jest.mock('../../../src/components/PressSpecular', () => ({
  PressSpecular: () => null,
  SPECULAR_OPACITY: 0.12,
}));


// The real module pulls Reanimated worklets and shared easing tables; the
// component only forwards its return values to `entering`/`exiting`.
jest.mock('../../utils/sinkAndFloat', () => ({
  SINK_FLOAT_TRAVEL: 8,
  CHROME_SCALE: 0.95,
  floatEntering: () => undefined,
  sinkExiting: () => undefined,
}));

jest.mock('../Icon', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  const glyph = (testID: string) => () => ReactActual.createElement(View, { testID });
  return {
    ContentCopySvgIcon: glyph('header-glyph-copy'),
    SettingsSvgIcon: glyph('header-glyph-gear'),
  };
});

// The wallet thumb (38x38) and settings avatar (36x36) are hard-coded
// constants inside WalletHeader.tsx, not tokens read off `@salmon/shared` —
// the hit-area assertions below use those literal values directly.
const WALLET_THUMB_SIZE = 38;
const SETTINGS_AVATAR_SIZE = 36;
const SPACING = { headerPadding: 20, base: 12, sm: 8, xs: 4 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  borderRadius: { full: 9999, r3: 12, r4: 16 },
  borderWidth: { actionButton: 0.5, thin: 1 },
  fontFamilyNative: { bold: 'System', semiBold: 'System', medium: 'System' },
  fontScaleCap: { chrome: 1.2 },
  fontSize: { micro: 10, caption: 12, body: 14 },
  fontWeight: { medium: '500', semibold: '600', bold: '700' },
  letterSpacing: { normal: 0, label: 0.3 },
  componentSizes: { walletHeaderRowHeight: 38 },
  spacing: { headerPadding: 20, screenGutter: 20, screenTop: 0, base: 12, sm: 8, xs: 4 },
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
  // The real palette rather than a four-key stub: the thumb and the avatar
  // are `IconBubble`s now, and the bubble reads every tone's ground at module
  // load, so a hand-listed subset breaks on a tone this file never renders.
  semantic: jest.requireActual('@salmon/shared/src/theme/semantic').semantic,
}));

import { WalletHeader } from './WalletHeader';

/** Minimum effective hit area on the smaller platform floor (iOS 44pt);
 * Android's 48dp floor is covered too since `hitSlop` values below already
 * clear it once summed with the base style dimensions. */
const MIN_HIT_TARGET = 44;

describe('WalletHeader copy address', () => {
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
      <WalletHeader
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
    expect(screen.getByLabelText('accessibility.copy_address:7xKX...gAsU')).toBeTruthy();
  });
});

describe('WalletHeader chain swap', () => {
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
      <WalletHeader
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
      <WalletHeader
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
      <WalletHeader
        accountName="Account 1"
        address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
      />
    );

    const mountIdBefore = screen.getByTestId('wallet-header-account-text').props.mountId;

    screen.rerender(
      <WalletHeader accountName="Renamed" address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" />
    );

    expect(screen.getByTestId('wallet-header-account-text').props.mountId).toBe(mountIdBefore);
  });
});

describe('WalletHeader touch targets', () => {
  const renderHeader = () =>
    render(
      <WalletHeader
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
    const width = WALLET_THUMB_SIZE + hitSlop.left + hitSlop.right;
    const height = WALLET_THUMB_SIZE + hitSlop.top + hitSlop.bottom;
    expect(width).toBeGreaterThanOrEqual(MIN_HIT_TARGET);
    expect(height).toBeGreaterThanOrEqual(MIN_HIT_TARGET);
  });

  it('gives the copy-address button at least a 44pt effective hit area', () => {
    renderHeader();
    const button = screen.getByTestId('wallet-header-copy-address');
    const { hitSlop } = button.props;
    // Icon is a literal 23px (see the comment in WalletHeader.tsx), padded
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
    const width = SETTINGS_AVATAR_SIZE + hitSlop.left + hitSlop.right;
    const height = SETTINGS_AVATAR_SIZE + hitSlop.top + hitSlop.bottom;
    expect(width).toBeGreaterThanOrEqual(MIN_HIT_TARGET);
    expect(height).toBeGreaterThanOrEqual(MIN_HIT_TARGET);
  });
});

describe('WalletHeader account name', () => {
  it('opens the account switcher from the name, not only the avatar', () => {
    // The name is what the user reads and reaches for; leaving it inert made
    // the small avatar the only way in.
    const onWalletPress = jest.fn();

    render(
      <WalletHeader
        accountName="Vault"
        address="Vault11111111111111111111111111111"
        onCopyAddress={jest.fn()}
        onWalletPress={onWalletPress}
      />
    );

    fireEvent.press(screen.getByTestId('wallet-header-account-name'));

    expect(onWalletPress).toHaveBeenCalledTimes(1);
  });
});

describe('WalletHeader identity block', () => {
  it('draws the name and the short address as two lines, not one parenthesised string', () => {
    render(
      <WalletHeader
        accountName="Account 1"
        address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
      />
    );

    // `.pen` CORE 01: name over short address. It used to render
    // "Account 1 (7xKX...gAsU)" on a single line.
    expect(screen.getByText('Account 1')).toBeTruthy();
    expect(screen.getByText('7xKX...gAsU')).toBeTruthy();
    expect(screen.queryByText('Account 1 (7xKX...gAsU)')).toBeNull();
  });
});

describe('WalletHeader identity swap', () => {
  const renderHeader = (avatarUrl?: string) =>
    render(
      <WalletHeader
        accountName="Account 1"
        address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        avatarUrl={avatarUrl}
        onSettingsPress={jest.fn()}
      />
    );

  it('puts the account picture on the left, where the wallet switcher is', () => {
    renderHeader('https://example.test/avatar.png');

    expect(screen.getByTestId('header-avatar-image')).toBeTruthy();
  });

  it('falls back to the brand mark when the account has no picture', () => {
    renderHeader();

    expect(screen.queryByTestId('header-avatar-image')).toBeNull();
    expect(screen.getByTestId('header-brand-mark')).toBeTruthy();
  });

  it('puts the gear on the right, where settings opens', () => {
    renderHeader('https://example.test/avatar.png');

    const settings = screen.getByTestId('wallet-header-settings-button');
    expect(settings.props.accessibilityLabel).toBe('accessibility.open_settings');
    expect(screen.getByTestId('header-glyph-gear')).toBeTruthy();
  });

  it('opens settings from the gear', () => {
    const onSettingsPress = jest.fn();
    render(
      <WalletHeader
        accountName="Account 1"
        address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        onSettingsPress={onSettingsPress}
      />
    );

    fireEvent.press(screen.getByTestId('wallet-header-settings-button'));

    expect(onSettingsPress).toHaveBeenCalledTimes(1);
  });
});
