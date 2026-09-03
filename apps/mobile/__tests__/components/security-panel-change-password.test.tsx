/**
 * SecurityPanel change-password ordering: the success line may appear only
 * AFTER the shared changePassword call has resolved true (i.e. after the
 * re-encrypted vault was persisted); a false/throwing result must surface the
 * wrong-password error instead. Regression companion to the shared-side fix in
 * packages/shared/src/hooks/useAccountsSecurityHelpers.ts.
 */
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockChangePassword = jest.fn();
const mockLockAccounts = jest.fn();

jest.mock('react-i18next', () => ({
  // Interpolation values are appended so an assertion can read the numbers the
  // panel computed, not just the key it chose.
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
  }),
}));

// SecurityPanel only needs tokens + the accounts context from the barrel; the
// real barrel pulls @solana/kit, which Jest cannot parse.
jest.mock('@salmon/shared', () => ({
  // The real design tokens: the panel and the kit blocks it composes read far
  // more of them than a hand-listed subset can keep up with.
  ...jest.requireActual('../../test-utils/themeTokens'),
  // The form's state is real — it is what this suite exercises; the vault
  // call it makes is the mocked context's.
  ...jest.requireActual('../../../../packages/shared/src/hooks/useChangePassword'),
  PASSWORD_CONSTRAINTS: { MIN_LENGTH: 8, MAX_LENGTH: 64 },
  validatePassword: () => ({ strength: 'strong', isValid: true }),
  getPasswordIssue: () => null,
  useAccountsContext: () => [
    // A password exists, so locking is allowed — the guard the button shares
    // with the auto-lock.
    { requiredLock: true },
    { changePassword: mockChangePassword, lockAccounts: mockLockAccounts },
  ],
}));

// No worklets runtime in Jest: the kit's animated blocks (IconBubble, Card's
// pressable form) need plain-JS stand-ins.
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

jest.mock('../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

jest.mock('../../src/components/PressSpecular', () => ({
  PressSpecular: () => null,
  SPECULAR_OPACITY: 0.12,
}));

// Child components stubbed to RN primitives — this test is about the handler's
// persist-before-success ordering, not the inputs' rendering.
jest.mock('../../src/components/SettingsScreenLayout', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SettingsScreenLayout: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});
jest.mock('../../src/components/PasswordInput', () => {
  const { TextInput, View } = jest.requireActual('react-native');
  return {
    PasswordInput: (props: {
      value: string;
      onChangeText: (t: string) => void;
      testID?: string;
    }) => <TextInput testID={props.testID} value={props.value} onChangeText={props.onChangeText} />,
    PasswordStrengthBar: () => <View />,
  };
});
jest.mock('../../src/components/Button', () => {
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    PrimaryButton: (props: {
      onPress: () => void;
      disabled?: boolean;
      testID?: string;
      children: React.ReactNode;
    }) => (
      <TouchableOpacity testID={props.testID} disabled={props.disabled} onPress={props.onPress}>
        <Text>{props.children}</Text>
      </TouchableOpacity>
    ),
    SecondaryButton: (props: {
      onPress: () => void;
      disabled?: boolean;
      testID?: string;
      children: React.ReactNode;
    }) => (
      <TouchableOpacity testID={props.testID} disabled={props.disabled} onPress={props.onPress}>
        <Text>{props.children}</Text>
      </TouchableOpacity>
    ),
  };
});

import { SecurityPanel } from '../../src/components/SecurityPanel';

function renderPanel(overrides: Record<string, unknown> = {}) {
  return render(
    <SecurityPanel
      onBack={jest.fn()}
      onNavigate={jest.fn()}
      isBiometricAvailable={false}
      isBiometricEnabled={false}
      onToggleBiometric={jest.fn()}
      {...overrides}
    />
  );
}

function fillAndSubmit(screen: ReturnType<typeof render>) {
  fireEvent.changeText(screen.getByTestId('security-current-password-input'), 'old-password-1');
  fireEvent.changeText(screen.getByTestId('security-new-password-input'), 'new-password-22');
  fireEvent.changeText(screen.getByTestId('security-confirm-password-input'), 'new-password-22');
  fireEvent.press(screen.getByTestId('security-change-password-button'));
}

describe('SecurityPanel — success only after the change has persisted', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows no success line while changePassword is still pending, then shows it on resolve', async () => {
    let resolveChange!: (v: boolean) => void;
    mockChangePassword.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveChange = resolve;
      })
    );

    const screen = renderPanel();
    fillAndSubmit(screen);

    // Pending: nothing may claim success yet.
    expect(screen.queryByTestId('security-success')).toBeNull();

    await act(async () => {
      resolveChange(true);
    });

    await waitFor(() => expect(screen.getByTestId('security-success')).toBeTruthy());
    // Fields cleared after a real success.
    expect(screen.getByTestId('security-current-password-input').props.value).toBe('');
  });

  it('shows the wrong-password error (never success) when the change did not persist', async () => {
    mockChangePassword.mockResolvedValue(false);

    const screen = renderPanel();
    fillAndSubmit(screen);

    await waitFor(() => expect(screen.getByTestId('security-error')).toBeTruthy());
    expect(screen.queryByTestId('security-success')).toBeNull();
  });

  it('treats a thrown changePassword as failure, not success', async () => {
    mockChangePassword.mockRejectedValue(new Error('storage exploded'));

    const screen = renderPanel();
    fillAndSubmit(screen);

    await waitFor(() => expect(screen.getByTestId('security-error')).toBeTruthy());
    expect(screen.queryByTestId('security-success')).toBeNull();
  });
});

describe('SecurityPanel — the score counts what this device actually has', () => {
  beforeEach(() => jest.clearAllMocks());

  it('counts only the password when the device has no biometrics', () => {
    const screen = renderPanel();

    expect(screen.getByText('settings.security.score_detail:{"enabled":1,"total":1}')).toBeTruthy();
  });

  it('counts the biometric safeguard as available but off until it is enabled', () => {
    const screen = renderPanel({ isBiometricAvailable: true });

    expect(screen.getByText('settings.security.score_detail:{"enabled":1,"total":2}')).toBeTruthy();
    expect(screen.getByText('settings.security.state_off')).toBeTruthy();
  });

  it('reads two of two once biometric unlock is on', () => {
    const screen = renderPanel({ isBiometricAvailable: true, isBiometricEnabled: true });

    expect(screen.getByText('settings.security.score_detail:{"enabled":2,"total":2}')).toBeTruthy();
    expect(screen.getByText('settings.security.score_strong')).toBeTruthy();
  });
});

describe('SecurityPanel — locking now', () => {
  beforeEach(() => jest.clearAllMocks());

  it('locks through the accounts context, so the global overlay takes over', () => {
    const screen = renderPanel();

    fireEvent.press(screen.getByTestId('security-lock-now-button'));

    expect(mockLockAccounts).toHaveBeenCalledTimes(1);
  });
});
