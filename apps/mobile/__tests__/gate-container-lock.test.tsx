/**
 * Regression: locking must leave nothing behind the lock screen.
 *
 * The gate keeps a `lastExpandedContent` snapshot so settings/wallets stay
 * painted while the panel slides closed. A background lock is not a close, so
 * the snapshot used to survive it: the lock content and the expanded panel
 * rendered as siblings, splitting the screen, and every row in the panel
 * (Backup Seed Phrase, Private Key, delete account) stayed tappable without a
 * password.
 */
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { GateContainer } from '../src/components/GateContainer/GateContainer';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// The real module needs the native Worklets runtime. `withTiming` deliberately
// never calls its completion callback here: the animation must not be what
// clears the snapshot, or the lock assertions below would pass for the wrong
// reason.
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

// The real barrel pulls @solana/kit, which Jest cannot parse. Only design
// tokens are needed here.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  colors: {
    background: { primary: '#000', card: '#111' },
    text: { primary: '#fff' },
    border: { default: '#222' },
    dialog: { overlay: 'rgba(0,0,0,0.5)' },
  },
  fontFamilyNative: { bold: 'DMSansBold' },
  fontSize: { lg: 18 },
  spacing: { lg: 16, md: 12, headerPadding: 16 },
  borderRadius: { '2xl': 24, header: 24, iconLg: 20 },
  componentSizes: { headerHeight: 56 },
  shadows: {
    topSheet: {},
    header: { shadowColor: '#000', shadowOffset: {}, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  },
  s: (value: number) => value,
  vs: (value: number) => value,
}));

const renderGate = (state: 'locked' | 'collapsed' | 'settings' | 'wallets') =>
  render(
    <GateContainer
      state={state}
      lockContent={<Text testID="lock-content">lock</Text>}
      headerContent={<Text testID="header-content">header</Text>}
      settingsContent={<Text testID="settings-content">settings</Text>}
      walletsContent={<Text testID="wallets-content">wallets</Text>}
      expandedHeader={{ title: 'Settings', onClose: jest.fn() }}
    />
  );

describe('GateContainer lock state', () => {
  it('unmounts the settings panel when the app locks from the settings state', () => {
    const { queryByTestId, rerender, getByTestId } = renderGate('settings');
    expect(getByTestId('settings-content')).toBeTruthy();

    rerender(
      <GateContainer
        state="locked"
        lockContent={<Text testID="lock-content">lock</Text>}
        headerContent={<Text testID="header-content">header</Text>}
        settingsContent={<Text testID="settings-content">settings</Text>}
        walletsContent={<Text testID="wallets-content">wallets</Text>}
        expandedHeader={{ title: 'Settings', onClose: jest.fn() }}
      />
    );

    expect(getByTestId('lock-content')).toBeTruthy();
    expect(queryByTestId('settings-content')).toBeNull();
    // The close affordances of the dead panel must go with it.
    expect(queryByTestId('sheet-close-button')).toBeNull();
    expect(queryByTestId('header-content')).toBeNull();
  });

  it('unmounts the wallets panel when the app locks from the wallets state', () => {
    const { queryByTestId, rerender } = renderGate('wallets');

    rerender(
      <GateContainer
        state="locked"
        lockContent={<Text testID="lock-content">lock</Text>}
        headerContent={<Text testID="header-content">header</Text>}
        settingsContent={<Text testID="settings-content">settings</Text>}
        walletsContent={<Text testID="wallets-content">wallets</Text>}
        expandedHeader={{ title: 'Wallets', onClose: jest.fn() }}
      />
    );

    expect(queryByTestId('wallets-content')).toBeNull();
  });

  it('does not restore the pre-lock panel when the user unlocks', () => {
    const { queryByTestId, rerender } = renderGate('settings');

    const gate = (state: 'locked' | 'collapsed') => (
      <GateContainer
        state={state}
        lockContent={<Text testID="lock-content">lock</Text>}
        headerContent={<Text testID="header-content">header</Text>}
        settingsContent={<Text testID="settings-content">settings</Text>}
        walletsContent={<Text testID="wallets-content">wallets</Text>}
        expandedHeader={{ title: 'Settings', onClose: jest.fn() }}
      />
    );

    rerender(gate('locked'));
    rerender(gate('collapsed'));

    expect(queryByTestId('settings-content')).toBeNull();
    expect(queryByTestId('header-content')).toBeTruthy();
  });
});
