import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockAddAccount = jest.fn();
const mockScanDerivedAccounts = jest.fn();
const mockCreateAccount = jest.fn();
const mockHeaderOverride = jest.fn();

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'settings.account_add.default_name') {
        return `Account ${options?.number}`;
      }
      return key;
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@salmon/shared', () => ({
  semantic: {
    status: { success: '#33D6A6', danger: '#FF6B85', warning: '#FFB020' },
    text: { primary: '#EDF1F7', secondary: '#A7B1C4', tertiary: '#8B96AD', accent: '#FF5C45' },
    surface: { shelf: '#10131C', raised: '#161C2D', crest: '#1B2233' },
    depth: { column: '#0B0F19', abyss: '#070911' },
    accent: { fill: '#FF5C45', ink: '#FF5C45', tint: 'rgba(255,92,69,0.10)' },
    border: { default: '#58637B', raised: '#6F7B95' },
  },
  tabularNums: { native: { fontVariant: ['tabular-nums'] }, css: {} },
  colors: {
    accent: { primary: '#0f0' },
    background: { card: '#111', tertiary: '#222' },
    border: { default: '#444' },
    status: { error: '#f00' },
    text: { primary: '#fff', secondary: '#999', tertiary: '#777' },
  },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '3xl': 32 },
  borderRadius: { lg: 16, md: 12 },
  borderWidth: { thin: 1 },
  fontSize: { sm: 14, md: 18 },
  fontFamilyNative: { medium: 'System', regular: 'System' },
  useAccountsContext: () => [
    {
      accounts: [{ id: 'a1' }, { id: 'a2' }],
      activeAccount: { mnemonic: 'owner mnemonic' },
    },
    { addAccount: mockAddAccount },
  ],
  getScanNetworks: jest.fn().mockResolvedValue(['solana-mainnet']),
  scanDerivedAccounts: (...args: unknown[]) => mockScanDerivedAccounts(...args),
  validateMnemonic: (value: string) => value === 'valid seed phrase',
  normalizeMnemonic: (value: string) => value.trim().replace(/\s+/g, ' '),
  createAccount: (...args: unknown[]) => mockCreateAccount(...args),
  trackEvent: jest.fn(),
  NETWORK_DISPLAY: { 'solana-mainnet': { blockchain: 'solana' } },
  EncryptionMaterialMissingError: class EncryptionMaterialMissingError extends Error {
    constructor(message?: string) {
      super(message ?? 'Cannot re-encrypt vault');
      this.name = 'EncryptionMaterialMissingError';
      Object.setPrototypeOf(this, EncryptionMaterialMissingError.prototype);
    }
  },
}));

jest.mock('../../SettingsScreenLayout', () => ({
  SettingsScreenLayout: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../SettingsHeaderContext', () => ({
  useSettingsHeaderOverride: (...args: unknown[]) => mockHeaderOverride(...args),
}));

jest.mock('../../Button', () => ({
  PrimaryButton: ({
    children,
    onPress,
    disabled,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
  }) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(
      TouchableOpacity,
      { onPress, disabled },
      React.createElement(Text, null, children)
    );
  },
}));

jest.mock('../../DerivedAccountCard', () => ({
  DerivedAccountCard: ({ address, onToggle }: { address: string; onToggle?: () => void }) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(
      TouchableOpacity,
      { onPress: onToggle },
      React.createElement(Text, null, address)
    );
  },
}));

jest.mock('../../LoadingScreen', () => ({
  LoadingScreen: () => null,
}));

import { AccountAddPanel } from './AccountAddPanel';

describe('AccountAddPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScanDerivedAccounts.mockResolvedValue({
      accounts: [
        {
          networkId: 'solana-mainnet',
          networkName: 'Solana',
          address: 'Derived11111111111111111111111111111',
          path: "m/44'/501'/0'/0'",
          balanceFormatted: '0 SOL',
          balance: 0,
          index: 4,
        },
      ],
      failedNetworks: [],
    });
    mockCreateAccount.mockResolvedValue({ account: { id: 'account-1' } });
    mockAddAccount.mockResolvedValue(undefined);
  });

  it('shows validation error for invalid seed phrase', async () => {
    render(<AccountAddPanel onComplete={jest.fn()} onBack={jest.fn()} />);

    fireEvent.press(screen.getByText('settings.account_add.import_seed'));
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.account_add.seed_placeholder'),
      'bad seed'
    );
    fireEvent.press(screen.getByText('actions.continue'));

    expect(screen.getByText('wallet.create.invalidSeed')).toBeTruthy();
  });

  it('imports a valid seed phrase and completes account creation', async () => {
    const onComplete = jest.fn();

    render(<AccountAddPanel onComplete={onComplete} onBack={jest.fn()} />);

    fireEvent.press(screen.getByText('settings.account_add.import_seed'));
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.account_add.seed_placeholder'),
      '  valid   seed phrase  '
    );
    fireEvent.press(screen.getByText('actions.continue'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Account 3')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('settings.account_add.confirm'));

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Account 3',
          mnemonic: 'valid seed phrase',
          startIndex: 0,
        })
      );
    });

    expect(mockAddAccount).toHaveBeenCalledWith({ id: 'account-1' });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows the session_expired alert when addAccount throws EncryptionMaterialMissingError', async () => {
    const { EncryptionMaterialMissingError } = jest.requireMock('@salmon/shared');
    mockAddAccount.mockRejectedValueOnce(new EncryptionMaterialMissingError());

    render(<AccountAddPanel onComplete={jest.fn()} onBack={jest.fn()} />);
    fireEvent.press(screen.getByText('settings.account_add.import_seed'));
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.account_add.seed_placeholder'),
      'valid seed phrase'
    );
    fireEvent.press(screen.getByText('actions.continue'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Account 3')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('settings.account_add.confirm'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'general.error',
        'settings.account_add.session_expired'
      );
    });
  });

  it('falls back to the generic creation_error alert when addAccount throws another error', async () => {
    mockAddAccount.mockRejectedValueOnce(new Error('boom'));

    render(<AccountAddPanel onComplete={jest.fn()} onBack={jest.fn()} />);
    fireEvent.press(screen.getByText('settings.account_add.import_seed'));
    fireEvent.changeText(
      screen.getByPlaceholderText('settings.account_add.seed_placeholder'),
      'valid seed phrase'
    );
    fireEvent.press(screen.getByText('actions.continue'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Account 3')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('settings.account_add.confirm'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'general.error',
        'settings.account_add.creation_error'
      );
    });
  });

  it('scans derived accounts and creates from selected derivation index', async () => {
    render(<AccountAddPanel onComplete={jest.fn()} onBack={jest.fn()} />);

    fireEvent.press(screen.getByText('settings.account_add.create_new'));

    await waitFor(() => {
      expect(mockScanDerivedAccounts).toHaveBeenCalledWith('owner mnemonic', ['solana-mainnet']);
    });

    fireEvent.press(screen.getByText('Derived11111111111111111111111111111'));
    fireEvent.press(screen.getByText('actions.continue'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Account 3')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('settings.account_add.confirm'));

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          mnemonic: 'owner mnemonic',
          startIndex: 4,
        })
      );
    });
  });
});
