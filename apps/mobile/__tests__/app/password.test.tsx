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
const mockSetStashItem = jest.fn();
const mockCreateAccount = jest.fn();
const mockUseAccountsContext = jest.fn();
const mockProtectWallet = jest.fn();
const mockRemoveAllAccounts = jest.fn();
const mockDisarm = jest.fn();
const mockSeedVaultSelection = jest.fn((): unknown => null);
const mockTrackOnboarding = jest.fn(async () => undefined);
const mockRemember = jest.fn();
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

// The passage into the wait pulls Reanimated, which has no native Worklets
// under Jest; the mock only has to let the entering/exiting props exist.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useReducedMotion: () => false,
    withTiming: (toValue: unknown) => toValue,
    withDelay: (_delayMs: number, animation: unknown) => animation,
    Easing: { bezier: (...coefficients: number[]) => coefficients },
  };
});

jest.mock('@salmon/shared', () =>
  require('../../test-utils/sharedWith').sharedWith({
    // The phrase check (DEV-208) is never due here.
    usePhraseBackup: () => ({
      needsBackup: false,
      requireBackup: async () => true,
      openBackup: () => {},
    }),
    // Real tokens rather than a hand-listed subset — see test-utils/themeTokens.
    ...jest.requireActual('../../test-utils/themeTokens'),
    // The real wait-exit hook: the passage into the wait composes it.
    ...jest.requireActual('../../../../packages/shared/src/hooks/useWaitExit'),
    // The real form hook: the checks and the wait it raises are what the tests assert.
    ...jest.requireActual('../../../../packages/shared/src/hooks/useSetupPasswordForm'),
    createAccount: (...args: unknown[]) => mockCreateAccount(...args),
    generateAccountName: () => 'Account 3',
    getMirrorNetworks: jest.fn().mockResolvedValue({ 'solana-mainnet': 'solana-devnet' }),
    getScanNetworks: jest.fn().mockResolvedValue(['solana-mainnet']),
    getPendingSeedVaultSelection: () => mockSeedVaultSelection(),
    getStashItem: (...args: unknown[]) => mockGetStashItem(...args),
    removeStashItem: (...args: unknown[]) => mockRemoveStashItem(...args),
    setStashItem: (...args: unknown[]) => mockSetStashItem(...args),
    STASH_KEYS: { PENDING_MNEMONIC: 'pending-mnemonic' },
    trackOnboardingEvent: (...args: unknown[]) => mockTrackOnboarding(...(args as [])),
    useAccountsContext: () => mockUseAccountsContext(),
  })
);

// The refusal dialog and the reset behind it are the real ones, over the
// shared stand-in sheet.
jest.mock('../../src/components/ConfirmSheet', () => ({
  ConfirmSheet: jest.requireActual('../../test-utils/confirmSheetStandIn').ConfirmSheetStandIn,
}));

jest.mock('../../src/components', () => {
  const React = require('react');
  const { TextInput, Text, TouchableOpacity } = require('react-native');

  const { View } = require('react-native');

  // The real ReservedSlot: the reservation behavior is what the tests below
  // assert, so it must not be stubbed away.
  const { ReservedSlot } = jest.requireActual('../../src/components/OnboardingLayout/ReservedSlot');

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
    SecondaryButton: ({
      children,
      onPress,
      testID,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
    }) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID, accessibilityRole: 'button' },
        React.createElement(Text, null, children)
      ),
    // The kit's sheet, as the screen drives it: confirm runs the action and
    // then closes, as the real sheet does.
    ConfirmSheet: ({
      visible,
      title,
      message,
      onConfirm,
      onClose,
    }: {
      visible: boolean;
      title: string;
      message: string;
      onConfirm: () => Promise<void> | void;
      onClose: () => void;
    }) =>
      visible
        ? React.createElement(
            View,
            null,
            React.createElement(Text, null, title),
            React.createElement(Text, null, message),
            React.createElement(TouchableOpacity, {
              testID: 'sheet-confirm',
              onPress: async () => {
                await onConfirm();
                onClose();
              },
            }),
            React.createElement(TouchableOpacity, { testID: 'sheet-cancel', onPress: onClose })
          )
        : null,
    VaultRefusedDialog: jest.requireActual('../../src/components/ResetConfirm').VaultRefusedDialog,
    ScreenHeader: ({
      onBack,
      stepIndicator,
    }: {
      onBack?: () => void;
      stepIndicator?: { currentStep: number; totalSteps: number };
    }) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          TouchableOpacity,
          { onPress: onBack, accessibilityRole: 'button' },
          React.createElement(Text, null, 'Back')
        ),
        stepIndicator
          ? React.createElement(
              Text,
              { testID: 'step-dots' },
              `${stepIndicator.currentStep} of ${stepIndicator.totalSteps}`
            )
          : null
      ),
  };
});

jest.mock('../../src/contexts/EnrolmentPasswordContext', () => ({
  useEnrolmentPassword: () => ({ remember: (...args: unknown[]) => mockRemember(...args) }),
}));

jest.mock('../../src/contexts/BiometricContext', () => ({
  useBiometric: () => ({ disarm: (...args: unknown[]) => mockDisarm(...args) }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const { useLocalSearchParams } = jest.requireMock('expo-router') as {
  useLocalSearchParams: jest.Mock;
};

import PasswordScreen from '../../app/(auth)/password';
import { finishClosing } from '../../test-utils/confirmSheetStandIn';
import { Linking } from 'react-native';
import {
  DuplicateAccountError,
  VaultReadRefusedError,
  IncorrectPasswordError,
  UnlockThrottledError,
} from '@salmon/shared';

describe('PasswordScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (Linking.openURL as unknown as jest.Mock | undefined) = mockOpenURL as never;
    mockGetStashItem.mockResolvedValue('seed words seed words seed words');
    mockRemoveStashItem.mockResolvedValue(undefined);
    mockSetStashItem.mockResolvedValue(undefined);
    mockCreateAccount.mockResolvedValue({ account: { id: 'account-1' } });
    mockAddAccount.mockResolvedValue(undefined);
    mockUnlockAccounts.mockResolvedValue(true);
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

  // Create: warning, phrase, networks, password. Recover: phrase, networks,
  // password. Seed Vault asks no network question: account, password.
  it.each([
    ['create', '4 of 4'],
    ['recover', '3 of 3'],
    ['seed-vault', '2 of 2'],
  ])('draws the password as the last step of the %s flow', (type, dots) => {
    useLocalSearchParams.mockReturnValue({ type });
    if (type === 'seed-vault') {
      mockSeedVaultSelection.mockReturnValue({
        authToken: 1,
        derivationPath: 'bip32:/m/44',
        address: 'SeedVaultAddress',
      });
    }

    render(<PasswordScreen />);

    expect(screen.getByTestId('step-dots').props.children).toBe(dots);
  });

  describe('the phrase in the stash', () => {
    const PHRASE = 'seed words seed words seed words';
    const stash = new Map<string, unknown>();

    const submit = async () => {
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
    };

    beforeEach(() => {
      stash.clear();
      stash.set('pending-mnemonic', PHRASE);
      mockGetStashItem.mockImplementation(async (key: string) => stash.get(key) ?? null);
      mockRemoveStashItem.mockImplementation(async (key: string) => void stash.delete(key));
      mockSetStashItem.mockImplementation(async (key: string, value: unknown) => {
        stash.set(key, value);
      });
    });

    // Back from the password lands on the network question, whose choice opens
    // a new password screen: it must find the phrase where the last one did.
    it('puts the phrase back when the screen is left backwards, so the next one finds it', async () => {
      const first = render(<PasswordScreen />);
      await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));

      fireEvent.press(screen.getByText('Back'));
      first.unmount();
      await act(async () => {});
      expect(stash.get('pending-mnemonic')).toBe(PHRASE);

      render(<PasswordScreen />);
      await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));
      await submit();

      await waitFor(() =>
        expect(mockCreateAccount).toHaveBeenCalledWith(
          expect.objectContaining({ mnemonic: PHRASE })
        )
      );
    });

    // A phrase another flow left there is not this screen's to take or keep.
    it.each(['protect', 'seed-vault'])('never touches the phrase on the %s flow', async (type) => {
      useLocalSearchParams.mockReturnValue({ type });
      mockSeedVaultSelection.mockReturnValue(null);
      const view = render(<PasswordScreen />);
      await act(async () => {});

      view.unmount();
      await act(async () => {});

      expect(mockGetStashItem).not.toHaveBeenCalled();
      expect(mockRemoveStashItem).not.toHaveBeenCalled();
      expect(mockSetStashItem).not.toHaveBeenCalled();
      expect(stash.get('pending-mnemonic')).toBe(PHRASE);
    });

    it('reads the phrase when no flow is named, as recover', async () => {
      useLocalSearchParams.mockReturnValue({});
      render(<PasswordScreen />);

      await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));
    });

    it('logs, and does not throw, when the phrase cannot be put back', async () => {
      mockSetStashItem.mockRejectedValue(new Error('stash gone'));
      const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
      const view = render(<PasswordScreen />);
      await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));

      view.unmount();
      await act(async () => {});

      expect(quiet).toHaveBeenCalledWith(
        'Failed to put the recovery phrase back:',
        expect.any(Error)
      );
      quiet.mockRestore();
    });

    it('puts the phrase back when the screen is left after a refused save', async () => {
      mockAddAccount.mockRejectedValueOnce(new Error('disk full'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const view = render(<PasswordScreen />);
      await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));
      await submit();
      await waitFor(() => expect(screen.getByText('wallet.create.recovery_error')).toBeTruthy());

      view.unmount();
      await act(async () => {});

      expect(stash.get('pending-mnemonic')).toBe(PHRASE);
    });

    it('drops the phrase once the save resolves: no second save, nothing put back', async () => {
      const view = render(<PasswordScreen />);
      await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));
      await submit();
      await waitFor(() => expect(mockUnlockAccounts).toHaveBeenCalled());

      fireEvent.press(screen.getByText('wallet.recover_wallet'));
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(mockAddAccount).toHaveBeenCalledTimes(1);

      view.unmount();
      await act(async () => {});
      expect(stash.has('pending-mnemonic')).toBe(false);
    });

    it('retries a refused save with the same wallet id and avatar', async () => {
      mockAddAccount.mockRejectedValueOnce(new Error('disk full'));
      mockCreateAccount.mockImplementation(async ({ id, avatar }) => ({ account: { id, avatar } }));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<PasswordScreen />);
      await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));
      await submit();
      await waitFor(() => expect(screen.getByText('wallet.create.recovery_error')).toBeTruthy());

      fireEvent.press(screen.getByText('wallet.recover_wallet'));
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      await waitFor(() => expect(mockAddAccount).toHaveBeenCalledTimes(2));

      const [first, second] = mockAddAccount.mock.calls.map(([account]) => account);
      expect(first).toEqual({ id: expect.any(String), avatar: expect.any(String) });
      expect(second).toEqual(first);
    });

    it.each([
      [
        'a wallet already in the list',
        new DuplicateAccountError(),
        'wallet.import.errors.duplicate',
      ],
      [
        'a password that does not open the vault',
        new IncorrectPasswordError(),
        'wallet.create.invalid_password',
      ],
      [
        'a password check still waiting out a penalty',
        new UnlockThrottledError(5000),
        'errors.password_throttled',
      ],
    ])('says so for %s', async (_, refusal, key) => {
      mockAddAccount.mockRejectedValueOnce(refusal);
      jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<PasswordScreen />);
      await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));

      await submit();

      await waitFor(() => expect(screen.getByText(key)).toBeTruthy());
      expect(screen.queryByText('wallet.create.recovery_error')).toBeNull();
    });

    describe('when storage refuses the save', () => {
      const press = (testID: string) =>
        act(async () => fireEvent.press(screen.getByTestId(testID)));
      const leave = () => act(() => finishClosing());

      /** Presses `testID`; `next` shows only once the pressed sheet has left. */
      async function pressThenLeave(testID: string, next: string) {
        await press(testID);
        expect(screen.queryByText(next)).toBeNull();
        await leave();
        expect(screen.getByText(next)).toBeTruthy();
      }

      beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        mockRemoveAllAccounts.mockResolvedValue(undefined);
        mockDisarm.mockResolvedValue(undefined);
        mockAddAccount.mockRejectedValue(
          new VaultReadRefusedError(
            'The stored wallet secrets read absent while wallets are stored'
          )
        );
        mockUseAccountsContext.mockReturnValue([
          { requiredLock: false, counter: 2 },
          {
            checkPassword: mockCheckPassword,
            addAccount: mockAddAccount,
            unlockAccounts: mockUnlockAccounts,
            removeAllAccounts: mockRemoveAllAccounts,
          },
        ]);
      });

      async function refuse() {
        render(<PasswordScreen />);
        await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));
        await submit();
        await waitFor(() => expect(screen.getByText('lock.vault_refused_title')).toBeTruthy());
      }

      it('shows the refusal instead of the seed-phrase message', async () => {
        await refuse();
        expect(screen.queryByText('wallet.create.recovery_error')).toBeNull();
      });

      it('closes on close and erases nothing', async () => {
        await refuse();
        await press('vault-refused-close-button');
        await leave();

        expect(screen.queryByText('lock.vault_refused_title')).toBeNull();
        expect(mockRemoveAllAccounts).not.toHaveBeenCalled();
      });

      it('resets Salmon after both reset sheets, once, as the lock screen does', async () => {
        await refuse();
        await pressThenLeave('vault-refused-reset-button', 'lock.reset_wallet_title');
        await pressThenLeave('confirm-dialog-confirm', 'lock.confirm_title');
        expect(mockRemoveAllAccounts).not.toHaveBeenCalled();
        await press('confirm-dialog-confirm');

        expect(mockDisarm).toHaveBeenCalledTimes(1);
        expect(mockRemoveAllAccounts).toHaveBeenCalledTimes(1);
        expect(mockReplace).toHaveBeenCalledWith('/(auth)');
      });

      it.each([1, 2])('erases nothing when the reset is cancelled at step %i', async (step) => {
        await refuse();
        await pressThenLeave('vault-refused-reset-button', 'lock.reset_wallet_title');
        if (step === 2) await pressThenLeave('confirm-dialog-confirm', 'lock.confirm_title');
        await press('confirm-dialog-cancel');
        await leave();

        expect(screen.queryByText('lock.reset_wallet_title')).toBeNull();
        expect(screen.queryByText('lock.confirm_title')).toBeNull();
        expect(mockRemoveAllAccounts).not.toHaveBeenCalled();
      });

      it('keeps the seed-phrase message and no dialog for any other failure', async () => {
        mockAddAccount.mockRejectedValue(new Error('disk full'));
        render(<PasswordScreen />);
        await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));
        await submit();

        await waitFor(() => expect(screen.getByText('wallet.create.recovery_error')).toBeTruthy());
        expect(screen.queryByText('lock.vault_refused_title')).toBeNull();
      });
    });

    it('marks a wallet created here through the save', async () => {
      useLocalSearchParams.mockReturnValue({ type: 'create' });
      render(<PasswordScreen />);
      await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));

      fireEvent.changeText(
        screen.getByPlaceholderText('wallet.create.passwordNew'),
        'pw-fixture-valid'
      );
      fireEvent.changeText(
        screen.getByPlaceholderText('wallet.create.passwordRepeat'),
        'pw-fixture-valid'
      );
      fireEvent.press(screen.getByText('wallet.create_wallet'));
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() =>
        expect(mockAddAccount).toHaveBeenCalledWith(expect.anything(), 'pw-fixture-valid', {
          unconfirmed: true,
        })
      );
    });

    // Success leads to the consent question the deferred creation event waits on.
    it('goes to success, without enrolment, when the unlock after the save fails', async () => {
      mockUnlockAccounts.mockResolvedValue(false);
      render(<PasswordScreen />);
      await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));
      await submit();
      await waitFor(() => expect(mockUnlockAccounts).toHaveBeenCalled());

      act(() => {
        mockWaitOnExited.current?.();
      });

      expect(mockReplace).toHaveBeenCalledWith('/(auth)/success');
      expect(mockRemember).not.toHaveBeenCalled();
      expect(screen.queryByText('wallet.create.recovery_error')).toBeNull();
    });

    it.each([
      [
        'the enrolment hand-off',
        () =>
          mockRemember.mockImplementationOnce(() => {
            throw new Error('enrolment gone');
          }),
      ],
      [
        'analytics',
        () =>
          mockTrackOnboarding.mockImplementationOnce(() => {
            throw new Error('analytics down');
          }),
      ],
    ])('keeps the route to biometric setup when %s throws', async (_, breakIt) => {
      breakIt();
      jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<PasswordScreen />);
      await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));
      await submit();
      await waitFor(() => expect(mockUnlockAccounts).toHaveBeenCalled());

      act(() => {
        mockWaitOnExited.current?.();
      });

      expect(mockReplace).toHaveBeenCalledWith('/(auth)/biometric-setup');
      expect(screen.queryByText('wallet.create.recovery_error')).toBeNull();
    });

    it('leaves the stash empty once the wallet is written', async () => {
      const view = render(<PasswordScreen />);
      await waitFor(() => expect(stash.has('pending-mnemonic')).toBe(false));
      await submit();
      await waitFor(() => expect(mockUnlockAccounts).toHaveBeenCalled());

      view.unmount();
      await act(async () => {});

      expect(stash.has('pending-mnemonic')).toBe(false);
    });
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

    expect(mockAddAccount).toHaveBeenCalledWith({ id: 'account-1' }, 'pw-fixture-valid', {
      unconfirmed: false,
    });
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
    expect(screen.getByText(/^strength:/, { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(/^strength:/)).toBeNull();

    fireEvent.changeText(screen.getByPlaceholderText('wallet.create.passwordNew'), 'a');

    // The same slot, now revealed — nothing was added to the tree.
    expect(screen.getByText(/^strength:/)).toBeTruthy();
  });

  describe('protecting a wallet stored without a password', () => {
    const ADDRESSES = ['AddressOne111', 'AddressTwo222'];

    beforeEach(() => {
      mockGetStashItem.mockResolvedValue(null);
      mockProtectWallet.mockResolvedValue(true);
      useLocalSearchParams.mockReturnValue({ type: 'protect' });
      mockUseAccountsContext.mockReturnValue([
        // A cleartext vault opens unlocked, with no lock required.
        { requiredLock: false, counter: 1, unprotectedAddresses: ADDRESSES },
        {
          checkPassword: mockCheckPassword,
          addAccount: mockAddAccount,
          unlockAccounts: mockUnlockAccounts,
          protectWallet: mockProtectWallet,
          removeAllAccounts: mockRemoveAllAccounts,
        },
      ]);
    });

    // A wallet the owner does not recognise has a way out that is not a
    // password: removing it, the same removal as removing every wallet,
    // after a sheet that says what that costs.
    it('removes the wallet only once its sheet is confirmed, then opens the welcome screen', async () => {
      mockRemoveAllAccounts.mockResolvedValue(undefined);
      mockDisarm.mockResolvedValue(undefined);
      render(<PasswordScreen />);

      fireEvent.press(screen.getByText('wallet.protect.remove_button'));
      expect(screen.getByText('wallet.protect.remove_title')).toBeTruthy();
      expect(screen.getByText('wallet.protect.remove_message')).toBeTruthy();
      expect(mockRemoveAllAccounts).not.toHaveBeenCalled();

      await act(async () => fireEvent.press(screen.getByTestId('sheet-confirm')));

      expect(mockDisarm).toHaveBeenCalledTimes(1);
      expect(mockRemoveAllAccounts).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/(auth)');
      expect(mockProtectWallet).not.toHaveBeenCalled();
    });

    it('keeps the wallet when its sheet is dismissed', () => {
      render(<PasswordScreen />);

      fireEvent.press(screen.getByText('wallet.protect.remove_button'));
      fireEvent.press(screen.getByTestId('sheet-cancel'));

      expect(screen.queryByText('wallet.protect.remove_title')).toBeNull();
      expect(mockRemoveAllAccounts).not.toHaveBeenCalled();
    });

    it('lists the addresses the wallet holds', () => {
      render(<PasswordScreen />);

      for (const address of ADDRESSES) expect(screen.getByText(address)).toBeTruthy();
      expect(screen.getByText('wallet.protect.body')).toBeTruthy();
    });

    it('protects the wallet with the confirmed password, then opens it', async () => {
      render(<PasswordScreen />);

      fireEvent.changeText(
        screen.getByPlaceholderText('wallet.create.passwordNew'),
        'pw-fixture-valid'
      );
      fireEvent.changeText(
        screen.getByPlaceholderText('wallet.create.passwordRepeat'),
        'pw-fixture-valid'
      );
      fireEvent.press(screen.getByText('wallet.protect.button'));

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => expect(mockProtectWallet).toHaveBeenCalledWith('pw-fixture-valid'));
      expect(mockCreateAccount).not.toHaveBeenCalled();
      expect(mockAddAccount).not.toHaveBeenCalled();
      expect(mockCheckPassword).not.toHaveBeenCalled();

      act(() => {
        mockWaitOnExited.current?.();
      });
      expect(mockReplace).toHaveBeenCalledWith('/(app)/(tabs)');
    });

    it('takes the addresses from the wallet, never from the link that opened the screen', () => {
      mockUseAccountsContext.mockReturnValue([
        { requiredLock: true, counter: 1, unprotectedAddresses: null },
        { protectWallet: mockProtectWallet },
      ]);

      render(<PasswordScreen />);

      expect(screen.queryByText('wallet.protect.button')).toBeNull();
      expect(screen.queryByText('wallet.protect.remove_button')).toBeNull();
    });
  });
});
