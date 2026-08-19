import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockOpenURL = jest.fn();
const mockCheckPassword = jest.fn();
const mockAddAccount = jest.fn();
const mockUnlockAccounts = jest.fn();
const mockGetStashItem = jest.fn();
const mockRemoveStashItem = jest.fn();
const mockCreateAccount = jest.fn();
const mockUseAccountsContext = jest.fn();
/**
 * The wait's exit handoff, captured instead of auto-fired: navigation now
 * waits for the LoadingScreen's `onExited` (the wave must leave the screen
 * first), so the tests drive that moment explicitly.
 */
const mockWaitOnExited: { current?: () => void } = {};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: (...args: unknown[]) => mockBack(...args),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('@salmon/assets', () => ({
  Logo: 1,
}));

jest.mock('@salmon/shared', () => ({
  // Real tokens rather than a hand-listed subset — see test-utils/themeTokens.
  ...jest.requireActual('../../test-utils/themeTokens'),
  createAccount: (...args: unknown[]) => mockCreateAccount(...args),
  generateAccountName: () => 'Account 3',
  getMirrorNetworks: jest.fn().mockResolvedValue({ 'solana-mainnet': 'solana-devnet' }),
  getScanNetworks: jest.fn().mockResolvedValue(['solana-mainnet']),
  getStashItem: (...args: unknown[]) => mockGetStashItem(...args),
  PASSWORD_CONSTRAINTS: { MIN_LENGTH: 12, MAX_LENGTH: 128 },
  removeStashItem: (...args: unknown[]) => mockRemoveStashItem(...args),
  STASH_KEYS: { PENDING_MNEMONIC: 'pending-mnemonic' },
  trackOnboardingEvent: jest.fn(async () => undefined),
  useAccountsContext: () => mockUseAccountsContext(),
  validatePassword: (value: string) => ({
    isValid: value.length >= 12,
    strength: value.length >= 12 ? 'strong' : 'medium',
  }),
  getPasswordIssue: (v: { isValid?: boolean }) => (v?.isValid ? null : 'too_short'),
}));

jest.mock('../../src/components', () => {
  const React = require('react');
  const { TextInput, Text, TouchableOpacity } = require('react-native');

  const { View } = require('react-native');

  // The real ReservedSlot: the reservation behavior is what the tests below
  // assert, so it must not be stubbed away.
  const { ReservedSlot } = jest.requireActual(
    '../../src/components/OnboardingLayout/ReservedSlot'
  );

  return {
    ReservedSlot,
    LoadingScreen: ({ onExited }: { onExited?: () => void }) => {
      mockWaitOnExited.current = onExited;
      return null;
    },
    OnboardingTitle: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(Text, null, children),
    OnboardingDescription: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(Text, null, children),
    OnboardingLayout: (props: Record<string, React.ReactNode>) =>
      React.createElement(
        View,
        null,
        props.chrome,
        props.title,
        props.description,
        props.body,
        props.assist,
        props.secondary,
        props.action
      ),
    PasswordInput: ({
      value,
      onChangeText,
      placeholder,
      onSubmitEditing,
      error,
      editable = true,
    }: {
      value: string;
      onChangeText: (value: string) => void;
      placeholder: string;
      onSubmitEditing?: () => void;
      error?: string;
      editable?: boolean;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement(TextInput, {
          value,
          onChangeText,
          placeholder,
          editable,
          onSubmitEditing,
        }),
        error ? React.createElement(Text, null, error) : null
      ),
    PasswordStrengthBar: ({ strength }: { strength: string }) =>
      React.createElement(Text, null, `strength:${strength}`),
    PrimaryButton: ({
      children,
      onPress,
      disabled,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      disabled?: boolean;
    }) =>
      React.createElement(
        TouchableOpacity,
        { onPress, disabled, accessibilityRole: 'button' },
        React.createElement(Text, null, children)
      ),
    ScreenHeader: ({ onBack }: { onBack?: () => void }) =>
      React.createElement(
        TouchableOpacity,
        { onPress: onBack, accessibilityRole: 'button' },
        React.createElement(Text, null, 'Back')
      ),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const { useLocalSearchParams } = jest.requireMock('expo-router') as {
  useLocalSearchParams: jest.Mock;
};

import PasswordScreen from '../../app/(auth)/password';
import { Linking } from 'react-native';

describe('PasswordScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (Linking.openURL as unknown as jest.Mock | undefined) = mockOpenURL as never;
    mockGetStashItem.mockResolvedValue('seed words seed words seed words');
    mockRemoveStashItem.mockResolvedValue(undefined);
    mockCreateAccount.mockResolvedValue({ account: { id: 'account-1' } });
    mockAddAccount.mockResolvedValue(undefined);
    mockUnlockAccounts.mockResolvedValue(undefined);
    mockCheckPassword.mockResolvedValue(true);
    useLocalSearchParams.mockReturnValue({ type: 'recover' });
    mockUseAccountsContext.mockReturnValue([
      { requiredLock: false, counter: 2 },
      {
        checkPassword: mockCheckPassword,
        addAccount: mockAddAccount,
        unlockAccounts: mockUnlockAccounts,
      },
    ]);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('submits recover flow and navigates to biometric setup', async () => {
    render(<PasswordScreen />);

    await waitFor(() => {
      expect(mockGetStashItem).toHaveBeenCalled();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText('wallet.create.passwordNew'),
      'pw-fixture-valid'
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('wallet.create.passwordRepeat'),
      'pw-fixture-valid'
    );

    fireEvent.press(screen.getByText('wallet.recover_wallet'));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Account 3',
          mnemonic: 'seed words seed words seed words',
          startIndex: 0,
        })
      );
    });

    expect(mockAddAccount).toHaveBeenCalledWith({ id: 'account-1' }, 'pw-fixture-valid');
    expect(mockUnlockAccounts).toHaveBeenCalledWith('pw-fixture-valid');

    // The route is parked until the wait has fully left the screen — the wave
    // finishes crossing and the content sinks before anything navigates.
    expect(mockReplace).not.toHaveBeenCalled();
    act(() => {
      mockWaitOnExited.current?.();
    });
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/biometric-setup');
  });

  it('verifies existing password in single-input flow and blocks on wrong password', async () => {
    mockUseAccountsContext.mockReturnValue([
      { requiredLock: true, counter: 1 },
      {
        checkPassword: mockCheckPassword,
        addAccount: mockAddAccount,
        unlockAccounts: mockUnlockAccounts,
      },
    ]);
    useLocalSearchParams.mockReturnValue({ type: 'create' });
    mockCheckPassword.mockResolvedValue(false);

    render(<PasswordScreen />);

    await waitFor(() => {
      expect(mockGetStashItem).toHaveBeenCalled();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText('wallet.create.enter_your_password'),
      'pw-fixture-invalid'
    );
    fireEvent.press(screen.getByText('wallet.create_wallet'));

    await waitFor(() => {
      expect(mockCheckPassword).toHaveBeenCalledWith('pw-fixture-invalid');
    });

    expect(screen.getByText('wallet.create.invalid_password')).toBeTruthy();
    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  /**
   * "Nothing moves under the finger": the strength meter's slot is reserved
   * from the first frame (mounted but hidden inside ReservedSlot), so typing
   * the first character reveals it in place instead of shoving the
   * confirmation field down.
   */
  it('reserves the strength meter slot before the first keystroke', async () => {
    render(<PasswordScreen />);

    await waitFor(() => {
      expect(mockGetStashItem).toHaveBeenCalled();
    });

    // Mounted from the first frame — hidden (out of the a11y tree), not absent.
    expect(screen.getByText('strength:medium', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('strength:medium')).toBeNull();

    fireEvent.changeText(screen.getByPlaceholderText('wallet.create.passwordNew'), 'a');

    // The same slot, now revealed — nothing was added to the tree.
    expect(screen.getByText('strength:medium')).toBeTruthy();
  });
});
