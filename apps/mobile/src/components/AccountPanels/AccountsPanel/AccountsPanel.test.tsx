import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, _fallback?: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

const MONO = 'GeistMonoRegular';
const SALMON = '#FF5C45';
const GREEN = '#33D6A6';

jest.mock('@salmon/shared', () => ({
  semantic: {
    status: { success: GREEN, danger: '#FF6B85' },
    text: { primary: '#EDF1F7', secondary: '#A7B1C4' },
    accent: { ink: SALMON },
    state: { selectedEdge: SALMON },
    border: { default: '#58637B' },
  },
  colors: { background: { card: '#111' } },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12 },
  borderRadius: { r1: 4, r3: 12, full: 9999 },
  borderWidth: { thin: 1 },
  fontSize: { caption: 12, mono: 13, bodyLg: 16 },
  lineHeight: { none: 1, snug: 1.4, normal: 1.5 },
  fontFamilyNative: { mono: MONO, medium: 'System', regular: 'System', bold: 'System' },
  componentSizes: { iconSizeLarge: 40 },
  getAvatarColor: () => '#333',
  getInitials: (name: string) => name.slice(0, 2),
  getAccountAddress: () => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  getShortAddress: (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`,
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
    expect(StyleSheet.flatten(address.props.style).fontFamily).toBe(MONO);
  });
});

describe('AccountsPanel selected state', () => {
  it('marks the active account with the salmon check, not a status green', () => {
    renderPanel();

    const check = screen.UNSAFE_getAllByProps({ color: SALMON }).length;
    expect(check).toBeGreaterThan(0);
    expect(screen.UNSAFE_queryAllByProps({ color: GREEN })).toHaveLength(0);
  });
});
