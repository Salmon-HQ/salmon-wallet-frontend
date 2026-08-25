import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const mockAddAccount = jest.fn();
const mockScanDerivedAccounts = jest.fn();
const mockCreateAccount = jest.fn();
const mockImportAccountFromPrivateKey = jest.fn();
const mockImportWatchOnlyAccount = jest.fn();
const SHEET_PASSWORD = 'correct-horse';
const mockCheckPassword = jest.fn();
const mockIsVaultKeyCached = jest.fn();
const mockValidatePrivateKey = jest.fn();
const mockValidateWatchOnly = jest.fn();
const mockPrivateKeyImport: {
  value: string;
  setValue: jest.Mock;
  error: string | null;
  address: string | null;
  privateKey: string | null;
  validating: boolean;
  hasInput: boolean;
  validate: jest.Mock;
  reset: jest.Mock;
  networkId: string;
} = {
  value: '',
  setValue: jest.fn(),
  error: null,
  address: null,
  privateKey: null,
  validating: false,
  hasInput: false,
  validate: mockValidatePrivateKey,
  reset: jest.fn(),
  networkId: 'solana-mainnet',
};
const mockWatchOnlyImport: {
  value: string;
  setValue: jest.Mock;
  error: string | null;
  address: string | null;
  hasInput: boolean;
  validate: jest.Mock;
  reset: jest.Mock;
  networkId: string;
} = {
  value: '',
  setValue: jest.fn(),
  error: null,
  address: null,
  hasInput: false,
  validate: mockValidateWatchOnly,
  reset: jest.fn(),
  networkId: 'solana-mainnet',
};
const mockHeaderOverride = jest.fn();

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

jest.mock('@salmon/shared', () => ({
  // The real design tokens: hand-listing the subset a screen happens to read
  // breaks this test whenever the panel starts reading one more (see
  // test-utils/themeTokens).
  ...jest.requireActual('../../../../test-utils/themeTokens'),
  useAccountsContext: () => [
    {
      accounts: [{ id: 'a1' }, { id: 'a2' }],
      activeAccount: { secret: { kind: 'mnemonic', mnemonic: 'owner mnemonic' } },
    },
    { addAccount: mockAddAccount, checkPassword: mockCheckPassword },
  ],
  getScanNetworks: jest.fn().mockResolvedValue(['solana-mainnet']),
  SHORT_PHRASE: 12,
  scanDerivedAccounts: (...args: unknown[]) => mockScanDerivedAccounts(...args),
  validateMnemonic: (value: string) => value === 'valid seed phrase',
  normalizeMnemonic: (value: string) => value.trim().replace(/\s+/g, ' '),
  createAccount: (...args: unknown[]) => mockCreateAccount(...args),
  importAccountFromPrivateKey: (...args: unknown[]) => mockImportAccountFromPrivateKey(...args),
  importWatchOnlyAccount: (...args: unknown[]) => mockImportWatchOnlyAccount(...args),
  isVaultKeyCached: () => mockIsVaultKeyCached(),
  ...jest.requireActual('@salmon/shared/src/utils/account-secret'),
  // Stubbed rather than requireActual'd: the real hooks reach @solana/kit,
  // whose ESM build Jest cannot parse here. Their own behaviour (parsing,
  // duplicate rejection) is covered in packages/shared.
  useImportPrivateKey: () => mockPrivateKeyImport,
  useImportWatchOnly: () => mockWatchOnlyImport,
  getShortAddress: (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`,
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

// The failure notice renders through ConfirmSheet; the stub shows its title
// and message as plain text only while visible, like the real sheet does.
jest.mock('../../ConfirmSheet', () => ({
  ConfirmSheet: ({
    visible,
    title,
    message,
    acknowledgeOnly,
    requirePassword,
    validatePassword,
    onConfirm,
  }: {
    visible: boolean;
    title: string;
    message: string;
    acknowledgeOnly?: boolean;
    requirePassword?: boolean;
    validatePassword?: (password: string) => Promise<boolean>;
    onConfirm?: (password?: string) => Promise<void>;
  }) => {
    if (!visible) return null;
    const React = require('react');
    const { Text, View, TouchableOpacity } = require('react-native');
    const testID = requirePassword
      ? 'confirm-sheet-password'
      : acknowledgeOnly
        ? 'confirm-sheet-acknowledge'
        : 'confirm-sheet';
    return React.createElement(
      View,
      { testID },
      React.createElement(Text, null, title),
      React.createElement(Text, null, message),
      // Stands in for the sheet's own gate: it verifies the password before
      // handing it to onConfirm, exactly as the real component does.
      React.createElement(
        TouchableOpacity,
        {
          testID: 'confirm-sheet-submit',
          onPress: async () => {
            if (requirePassword && validatePassword) {
              if (!(await validatePassword(SHEET_PASSWORD))) return;
            }
            await onConfirm?.(requirePassword ? SHEET_PASSWORD : undefined);
          },
        },
        React.createElement(Text, null, 'submit')
      )
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

// Captured so the tests can drive the wait's contract: `visible` says whether
// the wave is up, and invoking `onExited` stands in for the wave leaving the
// screen (the real component's watchdog guarantees it fires).
const mockLoadingScreenProps: { visible?: boolean; onExited?: () => void } = {};
jest.mock('../../LoadingScreen', () => ({
  LoadingScreen: (props: { visible: boolean; onExited?: () => void }) => {
    mockLoadingScreenProps.visible = props.visible;
    mockLoadingScreenProps.onExited = props.onExited;
    return null;
  },
}));

// The passage hook pulls Reanimated and the motion vocabulary, neither of
// which this file's narrow `@salmon/shared` mock carries. Its composition has
// its own unit test (`src/utils/useWaitPassage.test.ts`); here it only has to
// hand back the exit-report callback the panel parks `onComplete` behind.
jest.mock('../../../utils/useWaitPassage', () => ({
  useWaitPassage: (showWait: boolean) => ({
    held: showWait,
    onExited: jest.fn(),
    exiting: undefined,
    entering: undefined,
  }),
}));

jest.mock('../../../../hooks/useSecretScreen', () => ({
  useSecretScreen: jest.fn(),
}));

// The seed is entered through the shared grid, not a free-text field. The stub
// exposes one input that splits its text into the grid's words array — the
// panel only consumes the joined result.
jest.mock('../../SeedPhrase', () => ({
  SeedPhraseEntry: ({
    testID,
    onChange,
  }: {
    testID?: string;
    onChange: (words: string[]) => void;
  }) => {
    const React = require('react');
    const { TextInput } = require('react-native');
    return React.createElement(TextInput, {
      testID: `${testID}-entry`,
      onChangeText: (text: string) => onChange(text.split(' ')),
    });
  },
}));

import { AccountAddPanel } from './AccountAddPanel';

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
  mockImportAccountFromPrivateKey.mockResolvedValue({ account: { id: 'imported-1' } });
  mockAddAccount.mockResolvedValue(undefined);
  mockPrivateKeyImport.value = '';
  mockPrivateKeyImport.error = null;
  mockPrivateKeyImport.address = null;
  mockPrivateKeyImport.privateKey = null;
  mockPrivateKeyImport.hasInput = false;
  mockValidatePrivateKey.mockResolvedValue(true);
  mockCheckPassword.mockResolvedValue(true);
  mockIsVaultKeyCached.mockResolvedValue(true);
});

describe('AccountAddPanel', () => {
  it('keeps the user on the key step when the key does not validate', async () => {
    mockPrivateKeyImport.hasInput = true;
    mockValidatePrivateKey.mockResolvedValue(false);

    render(<AccountAddPanel onComplete={jest.fn()} onBack={jest.fn()} />);

    fireEvent.press(screen.getByText('settings.account_add.import_private_key'));
    fireEvent.press(screen.getByText('actions.continue'));

    await waitFor(() => {
      expect(mockValidatePrivateKey).toHaveBeenCalled();
    });
    // No name step: an unusable key must not reach the point of being stored.
    expect(screen.queryByTestId('account-add-name-input')).toBeNull();
  });

  it('imports a wallet from a private key without going through createAccount', async () => {
    mockPrivateKeyImport.hasInput = true;

    render(<AccountAddPanel onComplete={jest.fn()} onBack={jest.fn()} />);

    fireEvent.press(screen.getByText('settings.account_add.import_private_key'));
    // The field is masked by default — PasswordInput owns the reveal toggle.
    expect(screen.getByTestId('account-add-private-key-input')).toBeTruthy();

    mockPrivateKeyImport.privateKey = 'base58-secret-key';
    fireEvent.press(screen.getByText('actions.continue'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Account 3')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('settings.account_add.confirm'));

    await waitFor(() => {
      expect(mockImportAccountFromPrivateKey).toHaveBeenCalledWith({
        name: 'Account 3',
        privateKey: 'base58-secret-key',
        networkId: 'solana-mainnet',
      });
    });

    // A private key derives nothing, so the mnemonic fan-out must stay out of it.
    expect(mockCreateAccount).not.toHaveBeenCalled();
    expect(mockAddAccount).toHaveBeenCalledWith({ id: 'imported-1' }, undefined);
    // The key does not linger in component state after the account is stored.
    expect(mockPrivateKeyImport.reset).toHaveBeenCalled();
  });

  it('shows validation error for invalid seed phrase', async () => {
    render(<AccountAddPanel onComplete={jest.fn()} onBack={jest.fn()} />);

    fireEvent.press(screen.getByText('settings.account_add.import_seed'));

    // The free-text seed field is gone — the grid is the only entry surface.
    expect(screen.queryByTestId('account-add-seed-input')).toBeNull();

    fireEvent.changeText(screen.getByTestId('account-add-seed-entry'), 'bad seed');
    fireEvent.press(screen.getByText('actions.continue'));

    expect(screen.getByText('wallet.create.invalidSeed')).toBeTruthy();
  });

  it('imports a valid seed phrase and completes account creation', async () => {
    const onComplete = jest.fn();

    render(<AccountAddPanel onComplete={onComplete} onBack={jest.fn()} />);

    fireEvent.press(screen.getByText('settings.account_add.import_seed'));
    fireEvent.changeText(screen.getByTestId('account-add-seed-entry'), '  valid   seed phrase  ');
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

    expect(mockAddAccount).toHaveBeenCalledWith({ id: 'account-1' }, undefined);

    // The completion is parked behind the wait's exit: dropping `loading`
    // starts the wave's exit, and only its report hands the panel back.
    expect(mockLoadingScreenProps.visible).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => {
      mockLoadingScreenProps.onExited?.();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    await act(async () => {
      mockLoadingScreenProps.onExited?.();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('falls back to the generic creation_error notice when addAccount throws another error', async () => {
    mockAddAccount.mockRejectedValueOnce(new Error('boom'));

    render(<AccountAddPanel onComplete={jest.fn()} onBack={jest.fn()} />);
    fireEvent.press(screen.getByText('settings.account_add.import_seed'));
    fireEvent.changeText(screen.getByTestId('account-add-seed-entry'), 'valid seed phrase');
    fireEvent.press(screen.getByText('actions.continue'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Account 3')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('settings.account_add.confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-sheet-acknowledge')).toBeTruthy();
      expect(screen.getByText('settings.account_add.creation_error')).toBeTruthy();
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

async function reachConfirmWithPrivateKey() {
  mockPrivateKeyImport.hasInput = true;

  render(<AccountAddPanel onComplete={jest.fn()} onBack={jest.fn()} />);

  fireEvent.press(screen.getByText('settings.account_add.import_private_key'));
  await act(async () => {
    fireEvent.press(screen.getByText('actions.continue'));
  });
  // The hook resolves the key only once it has validated it, mirroring how the
  // real one behaves.
  mockPrivateKeyImport.privateKey = 'base58-secret-key';
  await waitFor(() => expect(screen.getByDisplayValue('Account 3')).toBeTruthy());
  // Awaited: confirm is async now (it probes the vault key first), and a press
  // left in flight lands its effects in whichever test runs next.
  await act(async () => {
    fireEvent.press(screen.getByText('settings.account_add.confirm'));
  });
}

describe('AccountAddPanel expired vault key', () => {
  it('asks for the password on its own screen, before doing any work', async () => {
    // The vault key expires on inactivity. Finding out at the write means
    // showing a wait and then a dead end for something knowable up front.
    mockIsVaultKeyCached.mockResolvedValue(false);

    await reachConfirmWithPrivateKey();

    await waitFor(() => {
      expect(screen.getByTestId('account-add-reauth-password')).toBeTruthy();
    });
    expect(screen.getByText('settings.account_add.reauth_body')).toBeTruthy();
    // Nothing was built or written yet — the question came first.
    expect(mockImportAccountFromPrivateKey).not.toHaveBeenCalled();
    expect(mockAddAccount).not.toHaveBeenCalled();
  });

  it('completes the add with the verified password, keeping what was entered', async () => {
    mockIsVaultKeyCached.mockResolvedValue(false);

    await reachConfirmWithPrivateKey();
    await waitFor(() => expect(screen.getByTestId('account-add-reauth-password')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('account-add-reauth-password'), SHEET_PASSWORD);
    fireEvent.press(screen.getByText('settings.account_add.reauth_confirm'));

    await waitFor(() => {
      // The private key is still the one the user pasted; nothing was retyped.
      expect(mockImportAccountFromPrivateKey).toHaveBeenCalledWith(
        expect.objectContaining({ privateKey: 'base58-secret-key' })
      );
    });
    expect(mockAddAccount).toHaveBeenCalledWith({ id: 'imported-1' }, SHEET_PASSWORD);
  });

  it('never writes the vault under a password it has not verified', async () => {
    mockIsVaultKeyCached.mockResolvedValue(false);
    // Encrypting under a wrong password would lock the user out of every
    // account they own.
    mockCheckPassword.mockResolvedValue(false);

    await reachConfirmWithPrivateKey();
    await waitFor(() => expect(screen.getByTestId('account-add-reauth-password')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('account-add-reauth-password'), SHEET_PASSWORD);
    fireEvent.press(screen.getByText('settings.account_add.reauth_confirm'));

    await waitFor(() => expect(mockCheckPassword).toHaveBeenCalledWith(SHEET_PASSWORD));
    expect(mockAddAccount).not.toHaveBeenCalled();
    expect(screen.getByText('errors.invalid_password')).toBeTruthy();
  });
});

describe('AccountAddPanel failure notice', () => {
  it('falls back to the generic heading only when the cause is not one it knows', async () => {
    mockPrivateKeyImport.hasInput = true;
    mockPrivateKeyImport.privateKey = 'base58-secret-key';
    mockAddAccount.mockRejectedValueOnce(new Error('disk on fire'));

    render(<AccountAddPanel onComplete={jest.fn()} onBack={jest.fn()} />);

    fireEvent.press(screen.getByText('settings.account_add.import_private_key'));
    fireEvent.press(screen.getByText('actions.continue'));
    await waitFor(() => expect(screen.getByDisplayValue('Account 3')).toBeTruthy());
    fireEvent.press(screen.getByText('settings.account_add.confirm'));

    await waitFor(() => {
      expect(screen.getByText('general.error')).toBeTruthy();
    });
    expect(screen.getByText('settings.account_add.creation_error')).toBeTruthy();
  });
});
