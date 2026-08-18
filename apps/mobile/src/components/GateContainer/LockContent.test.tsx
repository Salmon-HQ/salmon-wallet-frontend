import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, AppState } from 'react-native';

const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const mockAddEventListener = jest.fn();

// Mutable so a test can put the screen into its throttled state.
const mockThrottle = { failedAttempts: 0, remainingMs: 0, remainingSeconds: 0, refresh: jest.fn() };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@salmon/assets', () => ({
  Logo: 1,
}));

// The action row is the shared PrimaryButton / SecondaryButton now, which
// pulls Reanimated for its press motion. Jest has no native Worklets, so stand
// the module up with the handful of primitives those buttons touch.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: unknown) => Component,
    },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (toValue: unknown) => toValue,
    Easing: { bezier: () => () => 0 },
  };
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('@salmon/shared', () => ({
  // Real tokens rather than a hand-listed subset — see test-utils/themeTokens.
  // The lock screen and the shared buttons under it read a wide slice of the
  // theme, and listing that slice by hand meant every new token read broke
  // this file with "cannot read properties of undefined".
  ...jest.requireActual('../../../test-utils/themeTokens'),
  resolveMotionMs: (ms: number) => ms,
  useUnlockThrottle: () => mockThrottle,
  ms: (value: number) => value,
  s: (value: number) => value,
  vs: (value: number) => value,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../LoadingScreen', () => ({
  LoadingScreen: () => null,
}));

import { LockContent } from './LockContent';

describe('LockContent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
      writable: true,
    });
    mockThrottle.failedAttempts = 0;
    mockThrottle.remainingMs = 0;
    mockThrottle.remainingSeconds = 0;
    mockAddEventListener.mockReturnValue({ remove: jest.fn() });
    AppState.addEventListener = mockAddEventListener as any;
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('shows password fallback when biometric is unavailable', async () => {
    const refreshState = jest.fn().mockResolvedValue(undefined);

    render(
      <LockContent
        locked
        onUnlock={jest.fn().mockResolvedValue(true)}
        onRemoveAllAccounts={jest.fn().mockResolvedValue(undefined)}
        biometric={{
          state: { isAvailable: false, hasStoredKey: false, biometricType: null },
          authenticateWithBiometric: jest.fn(),
          storeKeyForBiometric: jest.fn(),
          enableBiometric: false,
          refreshState,
        }}
      />
    );

    await act(async () => {});

    await waitFor(() => {
      expect(refreshState).toHaveBeenCalledTimes(1);
      expect(screen.getByPlaceholderText('lock.enter_password')).toBeTruthy();
    });
  });

  it('auto-prompts biometric unlock when available', async () => {
    const authenticateWithBiometric = jest.fn().mockResolvedValue('cached-key');
    const onUnlockWithKey = jest.fn().mockResolvedValue(true);

    render(
      <LockContent
        locked
        onUnlock={jest.fn().mockResolvedValue(true)}
        onUnlockWithKey={onUnlockWithKey}
        onRemoveAllAccounts={jest.fn().mockResolvedValue(undefined)}
        biometric={{
          state: { isAvailable: true, hasStoredKey: true, biometricType: 'facial' },
          authenticateWithBiometric,
          storeKeyForBiometric: jest.fn(),
          enableBiometric: true,
          refreshState: jest.fn().mockResolvedValue(undefined),
        }}
      />
    );

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(authenticateWithBiometric).toHaveBeenCalledTimes(1);
    });

    expect(onUnlockWithKey).toHaveBeenCalledWith('cached-key');
  });

  it('runs wallet reset after confirmation flow', async () => {
    const onRemoveAllAccounts = jest.fn().mockResolvedValue(undefined);

    render(
      <LockContent
        locked
        onUnlock={jest.fn().mockResolvedValue(true)}
        onRemoveAllAccounts={onRemoveAllAccounts}
        biometric={{
          state: { isAvailable: false, hasStoredKey: false, biometricType: null },
          authenticateWithBiometric: jest.fn(),
          storeKeyForBiometric: jest.fn(),
          enableBiometric: false,
          refreshState: jest.fn().mockResolvedValue(undefined),
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('lock.forgot_password')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('lock.forgot_password'));

    const firstAlertActions = mockAlert.mock.calls[0]?.[2] as Array<{ onPress?: () => void }>;
    firstAlertActions?.[1]?.onPress?.();
    const secondAlertActions = mockAlert.mock.calls[1]?.[2] as Array<{ onPress?: () => void }>;
    await secondAlertActions?.[1]?.onPress?.();

    expect(onRemoveAllAccounts).toHaveBeenCalledTimes(1);
  });

  it('says why the password field stopped accepting attempts', async () => {
    mockThrottle.failedAttempts = 4;
    mockThrottle.remainingMs = 5000;
    mockThrottle.remainingSeconds = 5;

    render(
      <LockContent
        locked
        onUnlock={jest.fn().mockResolvedValue(false)}
        onRemoveAllAccounts={jest.fn().mockResolvedValue(undefined)}
        biometric={{
          state: { isAvailable: false, hasStoredKey: false, biometricType: null },
          authenticateWithBiometric: jest.fn(),
          storeKeyForBiometric: jest.fn(),
          enableBiometric: false,
          refreshState: jest.fn().mockResolvedValue(undefined),
        }}
      />
    );

    await act(async () => {});

    // Label, not just a dead control.
    await waitFor(() => {
      expect(screen.getByText('lock.throttled_title')).toBeTruthy();
    });
    expect(screen.getByTestId('lock-password-input').props.editable).toBe(false);

    // The notice takes the button's place rather than sitting above a dead
    // control: while the wallet is throttled the button cannot be pressed
    // anyway, so nothing moves and the user is told why — and for how long —
    // in the exact spot they were about to press.
    expect(screen.queryByTestId('lock-unlock-button')).toBeNull();
    expect(screen.getByText('lock.throttled_body')).toBeTruthy();
  });

  // Regression guard for the e2e test-label contract (Maestro `id` selectors).
  // These ids are referenced by apps/mobile/.maestro flows — renaming them
  // is a breaking change to the smoke suite.
  it('exposes stable test ids and accessibility state for e2e selection', async () => {
    render(
      <LockContent
        locked
        onUnlock={jest.fn().mockResolvedValue(true)}
        onRemoveAllAccounts={jest.fn().mockResolvedValue(undefined)}
        biometric={{
          state: { isAvailable: false, hasStoredKey: false, biometricType: null },
          authenticateWithBiometric: jest.fn(),
          storeKeyForBiometric: jest.fn(),
          enableBiometric: false,
          refreshState: jest.fn().mockResolvedValue(undefined),
        }}
      />
    );

    await act(async () => {});

    await waitFor(() => {
      expect(screen.getByTestId('lock-password-input')).toBeTruthy();
    });

    const unlockButton = screen.getByTestId('lock-unlock-button');
    expect(unlockButton).toBeTruthy();
    expect(screen.getByTestId('lock-forgot-password-button')).toBeTruthy();

    // Unlock is disabled while the password is empty (a11y state, not just style).
    expect(unlockButton.props.accessibilityState.disabled).toBe(true);
    expect(unlockButton.props.accessibilityRole).toBe('button');
  });
});
