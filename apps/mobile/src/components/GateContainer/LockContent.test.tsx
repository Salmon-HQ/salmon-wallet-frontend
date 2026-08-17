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

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
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
  borderRadius: { badge: 12, xl: 20 },
  borderWidth: { sheet: 1, thin: 1 },
  useUnlockThrottle: () => mockThrottle,
  colors: {
    text: { primary: '#fff', secondary: '#999' },
    status: { error: '#f00', warningBackground: '#332200', errorBackground: '#330000' },
    accent: { primary: '#0f0', border: '#0f0' },
    input: { border: '#444', background: '#111' },
    button: { disabledOpacity: 0.5 },
  },
  componentSizes: { lockScreenLogoSize: 120, iconSize5XL: 56, iconSize4XL: 48 },
  fontFamilyNative: { bold: 'System', medium: 'System', regular: 'System' },
  fontSize: { sm: 14, md: 18, lg: 20, '2xl': 28 },
  gradients: {
    primary: { colors: ['#0f0', '#0c0'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    disabled: { colors: ['#1B2233', '#1B2233'], start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  },
  letterSpacing: { balance: 1 },
  lineHeight: { normal: 1.4 },
  shadows: { button: {} },
  ms: (value: number) => value,
  s: (value: number) => value,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    lockScreenPadding: 20,
    lockScreenSectionGap: 20,
    lockScreenGap: 16,
    '4xl': 40,
  },
  vs: (value: number) => value,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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
    expect(screen.getByTestId('lock-unlock-button').props.accessibilityState.disabled).toBe(true);
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
