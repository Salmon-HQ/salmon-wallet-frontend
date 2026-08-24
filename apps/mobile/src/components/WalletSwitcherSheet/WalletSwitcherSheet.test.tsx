import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// The switcher asks its host to push account panels. The host itself pulls in
// Reanimated and the whole panel stack, neither of which this suite needs:
// what matters here is which screen the switcher asks for. Null stands for
// "mounted without a host", the fallback the props still cover.
const mockPanelPush = jest.fn();
let mockPanelNavigation: { push: jest.Mock; pop: jest.Mock; canGoBack: boolean } | null = null;
jest.mock('../PanelHost', () => ({
  usePanelNavigation: () => mockPanelNavigation,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 8, right: 0, bottom: 12, left: 0 }),
}));

jest.mock('@salmon/shared', () => ({
  // "Deep Water" semantic tokens. Components read these directly now; the
  // legacy `colors` map below still covers everything not yet migrated.
  semantic: {
    accent: { fill: '#FF5C45', onFill: '#070911', ink: '#FF5C45', tint: 'rgba(255,92,69,0.1)' },
    text: {
      primary: '#F6F8FB',
      secondary: '#A7B1C4',
      tertiary: '#8B96AD',
      disabled: '#6F7B95',
      accent: '#FF5C45',
      onAccent: '#070911',
      onGlass: '#F6F8FB',
    },
    border: { default: '#58637B', raised: '#6F7B95', strong: '#8B96AD' },
    surface: { shelf: '#10131C', raised: '#161C2D', crest: '#1B2233', bedrock: '#0B0F19' },
    status: { success: '#33D6A6', danger: '#FF6B85', warning: '#FFB020' },
    state: { hover: 'rgba(199,211,232,0.06)', press: 'rgba(199,211,232,0.10)' },
  },
  colors: {
    background: { primary: '#000', card: '#111' },
    text: { primary: '#fff', secondary: '#999', disabled: '#666' },
    border: { default: '#333' },
    status: { error: '#f00', success: '#0f0' },
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    '3xl': 32,
  },
  borderRadius: {
    sm: 8,
    tokenIcon: 22,
  },
  fontSize: {
    sm: 14,
    bodyLg: 18,
  },
  lineHeight: {
    none: 1,
    normal: 1.4,
  },
  componentSizes: {
    sheetFadeGradientHeight: 24,
    headerHeight: 56,
  },
  getAvatarColor: () => '#123456',
  getShortAddress: () => 'Abcd...Wxyz',
  getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
  getAccountAddress: (account: { id: string }) => `${account.id}-address`,
  fontFamilyNative: {
    bold: 'System',
    medium: 'System',
    regular: 'System',
  },
  borderWidth: {
    thin: 1,
  },
  opacity: {
    disabled: 0.5,
  },
}));

import { WalletSwitcherSheet } from './WalletSwitcherSheet';

const ACCOUNTS = [
  { id: 'wallet-1', name: 'Primary Wallet', avatar: null },
  { id: 'wallet-2', name: 'Trading Wallet', avatar: null },
] as any;

describe('WalletSwitcherSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('selects a different account and closes the sheet', async () => {
    const onSelectAccount = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <WalletSwitcherSheet
        visible
        onClose={onClose}
        accounts={ACCOUNTS}
        activeAccountId="wallet-1"
        onSelectAccount={onSelectAccount}
        onAddAccount={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText('Trading Wallet'));

    await waitFor(() => {
      expect(onSelectAccount).toHaveBeenCalledWith('wallet-2');
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back to the caller when mounted without a panel host', () => {
    mockPanelNavigation = null;
    mockPanelPush.mockClear();
    const onAddAccount = jest.fn();
    const onClose = jest.fn();

    render(
      <WalletSwitcherSheet
        visible
        onClose={onClose}
        accounts={ACCOUNTS}
        activeAccountId="wallet-1"
        onSelectAccount={jest.fn().mockResolvedValue(undefined)}
        onAddAccount={onAddAccount}
      />
    );

    fireEvent.press(screen.getByLabelText('settings.wallets.add_new_wallet'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAddAccount).toHaveBeenCalledTimes(1);
  });

  it('opens the add-account flow in place when there is a host', () => {
    mockPanelNavigation = { push: mockPanelPush, pop: jest.fn(), canGoBack: false };
    mockPanelPush.mockClear();
    const onAddAccount = jest.fn();
    const onClose = jest.fn();

    render(
      <WalletSwitcherSheet
        visible
        onClose={onClose}
        accounts={ACCOUNTS}
        activeAccountId="wallet-1"
        onSelectAccount={jest.fn().mockResolvedValue(undefined)}
        onAddAccount={onAddAccount}
      />
    );

    fireEvent.press(screen.getByLabelText('settings.wallets.add_new_wallet'));

    expect(mockPanelPush).toHaveBeenCalledWith('account-add');
    // The surface the user is on stays put: it used to close and hand over to
    // settings for a flow that has nothing to do with settings.
    expect(onClose).not.toHaveBeenCalled();
    expect(onAddAccount).not.toHaveBeenCalled();
  });

  it('disables deletion when only one account remains', () => {
    const onDeleteAccount = jest.fn();

    render(
      <WalletSwitcherSheet
        visible
        onClose={jest.fn()}
        accounts={[ACCOUNTS[0]]}
        activeAccountId="wallet-1"
        onSelectAccount={jest.fn().mockResolvedValue(undefined)}
        onAddAccount={jest.fn()}
        onDeleteAccount={onDeleteAccount}
      />
    );

    const deleteButton = screen.getByLabelText('accessibility.delete_account');

    expect(deleteButton.props.accessibilityState).toEqual({ disabled: true });

    fireEvent.press(deleteButton);

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(onDeleteAccount).not.toHaveBeenCalled();
  });
});
