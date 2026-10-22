import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';

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
    forTyping,
  }: {
    visible: boolean;
    children: React.ReactNode;
    forTyping?: boolean;
  }) => {
    if (!visible) return null;
    const RN = require('react-native');
    const R = require('react');
    return R.createElement(
      RN.View,
      { testID: forTyping ? 'sheet-for-typing' : 'sheet-hugging' },
      children
    );
  },
}));

// Buttons and the password field are Reanimated-backed; stubbed to plain RN so
// this suite can exercise the sheet's gate without a native runtime.
jest.mock('../Button/PrimaryButton', () => ({
  PrimaryButton: ({ children, onPress, disabled, testID }: any) => {
    const RN = require('react-native');
    const R = require('react');
    return R.createElement(
      RN.TouchableOpacity,
      { onPress, disabled, testID: testID ?? 'primary-button' },
      R.createElement(RN.Text, null, children)
    );
  },
}));

jest.mock('../Button/SecondaryButton', () => ({
  SecondaryButton: ({ children, onPress, disabled, testID }: any) => {
    const RN = require('react-native');
    const R = require('react');
    return R.createElement(
      RN.TouchableOpacity,
      { onPress, disabled, testID: testID ?? 'secondary-button' },
      R.createElement(RN.Text, null, children)
    );
  },
}));

jest.mock('../PasswordInput', () => ({
  PasswordInput: ({ value, onChangeText, onSubmitEditing }: any) => {
    const RN = require('react-native');
    const R = require('react');
    return R.createElement(RN.TextInput, {
      testID: 'password-input',
      value,
      onChangeText,
      onSubmitEditing,
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

// Owner, 2026-10-06: the biometrics password sheet sat under the keyboard.
describe('ConfirmSheet and the keyboard', () => {
  it('stands full height when it asks for a password', () => {
    renderSheet({ requirePassword: true, validatePassword: jest.fn() });
    expect(screen.getByTestId('sheet-for-typing')).toBeTruthy();
  });

  it('hugs its content when it asks for nothing typed', () => {
    renderSheet({});
    expect(screen.getByTestId('sheet-hugging')).toBeTruthy();
  });
});

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

describe('ConfirmSheet not ready', () => {
  // A dApp's identity is still being checked: nothing is approvable yet.
  it('does not run the action while confirm is disabled', async () => {
    const { onConfirm } = renderSheet({ confirmDisabled: true });

    fireEvent.press(screen.getByText('Confirm'));

    await new Promise((r) => setTimeout(r, 0));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

// An MWA dApp whose identity could not be verified: the approval is held.
describe('ConfirmSheet held confirm', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  // The hold asks the OS whether a screen reader is on; let that answer land.
  const settle = () => act(async () => {});

  it('ignores a tap and confirms once the hold completes', async () => {
    const { onConfirm } = renderSheet({ isDanger: true, requiresHold: true });
    await settle();

    fireEvent.press(screen.getByText('Confirm'));
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId('confirm-dialog-hold'), 'touchStart');
    await act(async () => {
      jest.advanceTimersByTime(700);
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  // The keyboard's return key confirms a password sheet; on a held sheet it
  // must not stand in for the hold.
  it('does not confirm from the keyboard when the confirm must be held', async () => {
    const validatePassword = jest.fn().mockResolvedValue(true);
    const { onConfirm } = renderSheet({
      requiresHold: true,
      requirePassword: true,
      validatePassword,
    });
    await settle();

    fireEvent.changeText(screen.getByTestId('password-input'), PASSWORD);
    fireEvent(screen.getByTestId('password-input'), 'submitEditing');
    await settle();

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does not start a hold while confirm is disabled', async () => {
    const { onConfirm } = renderSheet({ requiresHold: true, confirmDisabled: true });
    await settle();

    fireEvent(screen.getByTestId('confirm-dialog-hold'), 'touchStart');
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
