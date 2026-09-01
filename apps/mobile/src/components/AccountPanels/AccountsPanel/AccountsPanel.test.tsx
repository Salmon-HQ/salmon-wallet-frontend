import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, _fallback?: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

// The theme folder imports nothing but itself, so the real tokens can be
// pulled in directly — the barrel would drag in `@solana/kit`, which
// jest-expo does not transform. See `test-utils/themeTokens.ts`.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../../test-utils/themeTokens'),
  getAvatarColor: () => '#333',
  getInitials: (name: string) => name.slice(0, 2),
  getAccountAddress: () => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  getShortAddress: (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`,
  isWatchOnlyAccount: () => false,
}));

jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: View };
});

jest.mock('../../SettingsScreenLayout', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SettingsScreenLayout: ({ children }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, null, children),
  };
});

jest.mock('../../ConfirmSheet', () => ({ ConfirmSheet: () => null }));

// No worklets runtime in Jest: `IconBubble` (the avatar, rename, delete and
// active-check wells this panel renders) needs the same plain-JS stand-ins
// as the IconBubble suite itself.
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

jest.mock('../../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

jest.mock('../../FleshBackground', () => ({ FleshBackground: () => null }));
jest.mock('../../PressSpecular', () => ({ PressSpecular: () => null, SPECULAR_OPACITY: 0.12 }));

import { AccountsPanel } from './AccountsPanel';

const accounts = [
  { id: 'a1', name: 'Main' },
  { id: 'a2', name: 'Savings' },
] as never;

function renderPanel() {
  return render(
    <AccountsPanel
      accounts={accounts}
      activeAccountId="a1"
      onSelectAccount={() => {}}
      onEditAccount={() => {}}
      onDeleteAccount={async () => {}}
      onAddAccount={() => {}}
      onBack={() => {}}
    />
  );
}

describe('AccountsPanel address', () => {
  it('renders the account address in mono, the position-critical face', () => {
    renderPanel();

    const address = screen.getAllByText('7xKX...gAsU')[0];
    const { semantic, fontFamilyNative } = jest.requireActual('../../../../test-utils/themeTokens');
    expect(StyleSheet.flatten(address.props.style).fontFamily).toBe(fontFamilyNative.mono);
    // Sanity: the fixture's mono face is distinct from body text.
    expect(fontFamilyNative.mono).not.toBe(fontFamilyNative.bold);
    void semantic;
  });
});

describe('AccountsPanel selected state', () => {
  it('marks the active account with the salmon check, not a status green', () => {
    renderPanel();

    const { semantic } = jest.requireActual('../../../../test-utils/themeTokens');
    const check = screen.UNSAFE_getAllByProps({ color: semantic.accent.ink }).length;
    expect(check).toBeGreaterThan(0);
    expect(screen.UNSAFE_queryAllByProps({ color: semantic.status.success })).toHaveLength(0);
  });
});
