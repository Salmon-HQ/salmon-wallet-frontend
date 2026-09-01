import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

/** Obviously fake — no real credential or phrase belongs in a test. */
const TEST_PASSWORD = 'test-password-000';
const TEST_PHRASE = 'alpha bravo charlie delta echo foxtrot';

const mockCheckPassword = jest.fn(async (password: string) => password === TEST_PASSWORD);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
}));

const mockActiveAccount: { secret: { kind: string; mnemonic?: string } } = {
  secret: { kind: 'mnemonic', mnemonic: TEST_PHRASE },
};

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  ...jest.requireActual('@salmon/shared/src/utils/account-secret'),
  // The real design tokens: the panel composes kit blocks that read far more
  // of them than a hand-listed subset can keep up with.
  ...jest.requireActual('../../../test-utils/themeTokens'),
  useAccountsContext: () => [
    { activeAccount: mockActiveAccount },
    { checkPassword: mockCheckPassword },
  ],
}));
// No worklets runtime in Jest: the kit's animated blocks need plain-JS
// stand-ins.
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

jest.mock('../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

jest.mock('../PressSpecular', () => ({
  PressSpecular: () => null,
  SPECULAR_OPACITY: 0.12,
}));

jest.mock('../../../hooks/useSecretScreen', () => ({
  useSecretScreen: jest.fn(),
}));

jest.mock('../SettingsScreenLayout', () => {
  const { View: RNView } = require('react-native');
  return {
    SettingsScreenLayout: ({ children }: { children?: React.ReactNode }) => (
      <RNView>{children}</RNView>
    ),
  };
});

jest.mock('../Button', () => {
  const { Text: RNText, TouchableOpacity: RNTouchable } = require('react-native');
  const Button = ({ children, onPress, disabled, testID }: Record<string, any>) => (
    <RNTouchable onPress={onPress} disabled={disabled} testID={testID}>
      <RNText>{children}</RNText>
    </RNTouchable>
  );
  return { PrimaryButton: Button, SecondaryButton: Button };
});

// Stand-in for the real sheet: it only has to prove the panel routes the
// reveal through a password check before showing anything.
jest.mock('../ConfirmSheet', () => {
  const { Text: RNText, TouchableOpacity: RNTouchable, View: RNView } = require('react-native');
  return {
    ConfirmSheet: ({ visible, title, validatePassword, onConfirm }: Record<string, any>) =>
      visible ? (
        <RNView testID="backup-reauth-sheet">
          <RNText>{title}</RNText>
          <RNTouchable
            testID="backup-reauth-confirm"
            onPress={async () => {
              if (await validatePassword('test-password-000')) await onConfirm();
            }}
          >
            <RNText>confirm</RNText>
          </RNTouchable>
          <RNTouchable
            testID="backup-reauth-confirm-wrong"
            onPress={async () => {
              if (await validatePassword('wrong-password-000')) await onConfirm();
            }}
          >
            <RNText>confirm-wrong</RNText>
          </RNTouchable>
        </RNView>
      ) : null,
  };
});

import { BackupPanel } from './BackupPanel';

describe('BackupPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not hand over the phrase to whoever is holding an unlocked session', async () => {
    render(<BackupPanel onBack={jest.fn()} />);

    fireEvent.press(screen.getByTestId('backup-seed-reveal-overlay'));

    await waitFor(() => {
      expect(screen.getByTestId('backup-reauth-sheet')).toBeTruthy();
    });
    expect(screen.queryByText('alpha')).toBeNull();
  });

  it('shows the phrase once the password is re-entered', async () => {
    render(<BackupPanel onBack={jest.fn()} />);

    fireEvent.press(screen.getByTestId('backup-seed-reveal-overlay'));
    fireEvent.press(screen.getByTestId('backup-reauth-confirm'));

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeTruthy();
    });
  });

  it('keeps the phrase hidden when the password is wrong', async () => {
    render(<BackupPanel onBack={jest.fn()} />);

    fireEvent.press(screen.getByTestId('backup-seed-reveal-overlay'));
    fireEvent.press(screen.getByTestId('backup-reauth-confirm-wrong'));

    await waitFor(() => {
      expect(mockCheckPassword).toHaveBeenCalled();
    });
    expect(screen.queryByText('alpha')).toBeNull();
  });

  it('says the clipboard is readable by other apps before the seed goes into it', async () => {
    render(<BackupPanel onBack={jest.fn()} />);

    fireEvent.press(screen.getByTestId('backup-seed-reveal-overlay'));
    fireEvent.press(screen.getByTestId('backup-reauth-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('backup-seed-clipboard-warning')).toBeTruthy();
    });
  });

  it('takes the biometric prompt as the equivalent of the password when it is available', async () => {
    const authenticateWithBiometric = jest.fn(async () => 'cached-key');

    render(
      <BackupPanel
        onBack={jest.fn()}
        biometricAvailable
        authenticateWithBiometric={authenticateWithBiometric}
      />
    );

    fireEvent.press(screen.getByTestId('backup-seed-reveal-overlay'));

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeTruthy();
    });
    expect(authenticateWithBiometric).toHaveBeenCalledTimes(1);
    expect(mockCheckPassword).not.toHaveBeenCalled();
  });
});

describe('BackupPanel for an imported account', () => {
  it('says there is no phrase instead of rendering an empty grid', () => {
    // An account imported from a private key has no seed behind it; the grid
    // would otherwise render zero words under a "tap to reveal" overlay.
    mockActiveAccount.secret = { kind: 'privateKey' };

    render(<BackupPanel onBack={jest.fn()} />);

    expect(screen.getByTestId('backup-no-seed-phrase')).toBeTruthy();
    expect(screen.queryByTestId('backup-seed-phrase')).toBeNull();
    expect(screen.queryByTestId('backup-seed-reveal-overlay')).toBeNull();

    mockActiveAccount.secret = { kind: 'mnemonic', mnemonic: TEST_PHRASE };
  });
});
