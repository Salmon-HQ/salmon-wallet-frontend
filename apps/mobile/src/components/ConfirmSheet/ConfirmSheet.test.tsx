import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { ConfirmSheet } from './ConfirmSheet';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
  // Passthrough: the real scaling helpers read Dimensions at import time,
  // which needs a native bridge this suite does not have.
  vs: (value: number) => value,
  // The gate's state is real: the password check is what this sheet is for.
  ...jest.requireActual('@salmon/shared/src/hooks/usePasswordConfirm'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ compactContentBottomPadding: 0 }),
}));

// The real container drags in Reanimated/expo-blur, which need native modules
// Jest does not have. Its own behaviour is covered in its own suite.
jest.mock('../BottomSheetContainer', () => ({
  BottomSheetContainer: ({
    visible,
    children,
  }: {
    visible: boolean;
    children: React.ReactNode;
  }) => {
    if (!visible) return null;
    const RN = require('react-native');
    const R = require('react');
    return R.createElement(RN.View, null, children);
  },
}));

// Buttons and the password field are Reanimated-backed; stubbed to plain RN so
// this suite can exercise the sheet's gate without a native runtime.
jest.mock('../Button/PrimaryButton', () => ({
  PrimaryButton: ({ children, onPress, disabled }: any) => {
    const RN = require('react-native');
    const R = require('react');
    return R.createElement(
      RN.TouchableOpacity,
      { onPress, disabled, testID: 'primary-button' },
      R.createElement(RN.Text, null, children)
    );
  },
}));

jest.mock('../Button/SecondaryButton', () => ({
  SecondaryButton: ({ children, onPress, disabled }: any) => {
    const RN = require('react-native');
    const R = require('react');
    return R.createElement(
      RN.TouchableOpacity,
      { onPress, disabled, testID: 'secondary-button' },
      R.createElement(RN.Text, null, children)
    );
  },
}));

jest.mock('../PasswordInput', () => ({
  PasswordInput: ({ value, onChangeText }: any) => {
    const RN = require('react-native');
    const R = require('react');
    return R.createElement(RN.TextInput, {
      testID: 'password-input',
      value,
      onChangeText,
    });
  },
}));

const PASSWORD = 'correct-horse';

function renderSheet(props: Partial<React.ComponentProps<typeof ConfirmSheet>> = {}) {
  const onConfirm = jest.fn().mockResolvedValue(undefined);
  const onClose = jest.fn();
  render(
    <ConfirmSheet
      visible
      onClose={onClose}
      title="Title"
      message="Message"
      onConfirm={onConfirm}
      {...props}
    />
  );
  return { onConfirm, onClose };
}

describe('ConfirmSheet password gate', () => {
  it('does not run the action when the password does not check out', async () => {
    // The caller re-encrypts the vault with this password. Running the action
    // on an unverified one would lock the user out of every account they own.
    const validatePassword = jest.fn().mockResolvedValue(false);
    const { onConfirm } = renderSheet({ requirePassword: true, validatePassword });

    fireEvent.changeText(screen.getByTestId('password-input'), PASSWORD);
    fireEvent.press(screen.getByText('Confirm'));

    await waitFor(() => expect(validatePassword).toHaveBeenCalledWith(PASSWORD));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('hands the verified password to the action', async () => {
    const validatePassword = jest.fn().mockResolvedValue(true);
    const { onConfirm } = renderSheet({ requirePassword: true, validatePassword });

    fireEvent.changeText(screen.getByTestId('password-input'), PASSWORD);
    fireEvent.press(screen.getByText('Confirm'));

    // Passed through so the caller can use it for the operation the sheet just
    // gated, without asking for it a second time.
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(PASSWORD));
  });

  it('leaves the password out of the action when it was never asked for', async () => {
    const { onConfirm } = renderSheet();

    fireEvent.press(screen.getByText('Confirm'));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(undefined));
  });
});
