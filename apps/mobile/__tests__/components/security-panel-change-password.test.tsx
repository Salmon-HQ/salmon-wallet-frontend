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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// SecurityPanel only needs tokens + the accounts context from the barrel; the
// real barrel pulls @solana/kit, which Jest cannot parse.
jest.mock('@salmon/shared', () => ({
  colors: { background: { card: '#111' } },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  borderRadius: { r3: 12 },
  fontSize: { label: 10, caption: 12, bodyLg: 16 },
  fontFamilyNative: { regular: 'R', medium: 'M', semiBold: 'SB' },
  letterSpacing: { label: 0.3 },
  semantic: {
    text: { primary: '#fff', secondary: '#999' },
    status: { danger: '#f00', success: '#0f0' },
    accent: { ink: '#f60' },
    border: { default: '#222' },
  },
  PASSWORD_CONSTRAINTS: { MIN_LENGTH: 8, MAX_LENGTH: 64 },
  validatePassword: () => ({ strength: 'strong', isValid: true }),
  getPasswordIssue: () => null,
  useAccountsContext: () => [{}, { changePassword: mockChangePassword }],
}));

// Child components stubbed to RN primitives — this test is about the handler's
// persist-before-success ordering, not the inputs' rendering.
jest.mock('../../src/components/SettingsScreenLayout', () => {
  const { View } = jest.requireActual('react-native');
  return { SettingsScreenLayout: ({ children }: { children: React.ReactNode }) => (
    <View>{children}</View>
  ) };
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
  };
});

import { SecurityPanel } from '../../src/components/SecurityPanel';

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

    const screen = render(<SecurityPanel onBack={jest.fn()} />);
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

    const screen = render(<SecurityPanel onBack={jest.fn()} />);
    fillAndSubmit(screen);

    await waitFor(() => expect(screen.getByTestId('security-error')).toBeTruthy());
    expect(screen.queryByTestId('security-success')).toBeNull();
  });

  it('treats a thrown changePassword as failure, not success', async () => {
    mockChangePassword.mockRejectedValue(new Error('storage exploded'));

    const screen = render(<SecurityPanel onBack={jest.fn()} />);
    fillAndSubmit(screen);

    await waitFor(() => expect(screen.getByTestId('security-error')).toBeTruthy());
    expect(screen.queryByTestId('security-success')).toBeNull();
  });
});
