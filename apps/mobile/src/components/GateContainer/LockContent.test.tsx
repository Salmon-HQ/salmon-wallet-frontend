import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react-native';
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

// OnboardingLayout's float region reads the focus signal; the lock renders
// outside any navigator and never passes `float`.
jest.mock('expo-router', () => ({ useFocusEffect: () => {} }));

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

// Captured so the tests can drive the wait's contract: `visible` says whether
// the wave is up, and invoking `onExited` stands in for the wave leaving the
// screen (the real component's watchdog guarantees it fires).
const mockLoadingScreenProps: { visible?: boolean; onExited?: () => void } = {};
jest.mock('../LoadingScreen', () => ({
  LoadingScreen: (props: { visible: boolean; onExited?: () => void }) => {
    mockLoadingScreenProps.visible = props.visible;
    mockLoadingScreenProps.onExited = props.onExited;
    return null;
  },
}));

// The water column's two layers lean on react-native-svg and the full
// Reanimated runtime. What this file must prove is that the lock *mounts*
// them — the drawing has its own tests.
jest.mock('../DepthBackground', () => {
  const { View } = jest.requireActual('react-native');
  return { DepthBackground: () => <View testID="depth-background" /> };
});
jest.mock('../ScalesBackground', () => {
  const { View } = jest.requireActual('react-native');
  return {
    ScalesBackground: ({ variant }: { variant?: string }) => (
      <View testID="scales-background" accessibilityLabel={variant} />
    ),
  };
});

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
    mockLoadingScreenProps.visible = undefined;
    mockLoadingScreenProps.onExited = undefined;
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
      expect(screen.getByTestId('lock-throttle-notice')).toBeTruthy();
    });
    expect(screen.getByTestId('lock-password-input').props.editable).toBe(false);

    // The notice lands in the assist band — the slot spec 013 FR-005 reserves
    // for exactly this — and the button stays put, disabled, so nothing moves.
    const assist = within(screen.getByTestId('onboarding-slot-assist'));
    expect(assist.getByText('lock.throttled_body')).toBeTruthy();
    const unlockButton = screen.getByTestId('lock-unlock-button');
    expect(unlockButton.props.accessibilityState.disabled).toBe(true);
  });

  it('mounts the water column behind the lock, and keeps its feedback in the bands', async () => {
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
    await waitFor(() => {
      expect(screen.getByTestId('lock-password-input')).toBeTruthy();
    });

    // The lock carries the water (DESIGN.md): both layers, behind the stack.
    const background = within(screen.getByTestId('onboarding-background'));
    expect(background.getByTestId('depth-background')).toBeTruthy();
    expect(background.getByTestId('scales-background')).toBeTruthy();

    // The forgot affordance sits in `body`, against the field it escapes from.
    const body = within(screen.getByTestId('onboarding-slot-body'));
    expect(body.getByTestId('lock-forgot-password-button')).toBeTruthy();

    // The wrong-password error lands in `assist`, not against the input.
    fireEvent.changeText(screen.getByTestId('lock-password-input'), 'nope');
    await act(async () => {
      fireEvent.press(screen.getByTestId('lock-unlock-button'));
    });
    const assist = within(screen.getByTestId('onboarding-slot-assist'));
    await waitFor(() => {
      expect(assist.getByText('lock.wrong_password')).toBeTruthy();
    });
  });

  it('shows the unlock wait and releases the gate only after the wave exits', async () => {
    let resolveUnlock: (value: boolean) => void = () => {};
    const onUnlock = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveUnlock = resolve;
        })
    );
    const onUnlockExited = jest.fn();

    render(
      <LockContent
        locked
        onUnlock={onUnlock}
        onUnlockExited={onUnlockExited}
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

    fireEvent.changeText(screen.getByTestId('lock-password-input'), 'correct-horse');
    await act(async () => {
      fireEvent.press(screen.getByTestId('lock-unlock-button'));
    });

    // The wait is up before the work: the screen yields one beat so the wave
    // can render before the derivation blocks the JS thread.
    expect(mockLoadingScreenProps.visible).toBe(true);
    expect(onUnlock).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(onUnlock).toHaveBeenCalledWith('correct-horse');

    await act(async () => {
      resolveUnlock(true);
    });

    // Success starts the wave's exit but parks the gate release...
    expect(mockLoadingScreenProps.visible).toBe(false);
    expect(onUnlockExited).not.toHaveBeenCalled();

    // ...which fires exactly once when the wave reports it has left.
    await act(async () => {
      mockLoadingScreenProps.onExited?.();
    });
    expect(onUnlockExited).toHaveBeenCalledTimes(1);
    await act(async () => {
      mockLoadingScreenProps.onExited?.();
    });
    expect(onUnlockExited).toHaveBeenCalledTimes(1);
  });

  it('returns a failed unlock to the input instead of stranding it on the wave', async () => {
    const onUnlockExited = jest.fn();

    render(
      <LockContent
        locked
        onUnlock={jest.fn().mockResolvedValue(false)}
        onUnlockExited={onUnlockExited}
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

    fireEvent.changeText(screen.getByTestId('lock-password-input'), 'wrong');
    await act(async () => {
      fireEvent.press(screen.getByTestId('lock-unlock-button'));
    });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // The wave is dismissed, the error lands in the assist band, and the
    // parked release never fires — the gate stays locked on the input.
    expect(mockLoadingScreenProps.visible).toBe(false);
    const assist = within(screen.getByTestId('onboarding-slot-assist'));
    await waitFor(() => {
      expect(assist.getByText('lock.wrong_password')).toBeTruthy();
    });
    await act(async () => {
      mockLoadingScreenProps.onExited?.();
    });
    expect(onUnlockExited).not.toHaveBeenCalled();
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
