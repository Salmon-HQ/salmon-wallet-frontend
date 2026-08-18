import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

/** Obviously fake — no real credential or key belongs in a test. */
const TEST_PASSWORD = 'test-password-000';
const FAKE_PRIVATE_KEY = 'fake-private-key-000-not-a-real-key';
const FAKE_ADDRESS = 'FakeAddress1111111111111111111111111111111';

const mockCheckPassword = jest.fn(async (password: string) => password === TEST_PASSWORD);
const mockUseSecretScreen = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  borderRadius: { sm: 8, md: 12, lg: 16 },
  colors: {
    background: { card: '#111', tertiary: '#222' },
    overlay: { dark: 'rgba(0,0,0,0.8)' },
    status: { warningBackground: '#332200', errorBackground: '#330000' },
    text: { primary: '#fff', secondary: '#aaa', tertiary: '#888' },
  },
  fontFamilyNative: { regular: 'System', medium: 'System', semiBold: 'System', mono: 'System' },
  fontSize: { sm: 14, base: 16, md: 18 },
  letterSpacing: { wider: 0.5 },
  motionMs: { feedbackHold: 1500 },
  semantic: { status: { warning: '#FFB020', danger: '#FF6B85' } },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
  getShortAddress: (address: string) => address.slice(0, 8),
  getAccountKeysForNetwork: () => [
    { path: "m/44'/501'/0'/0'", address: FAKE_ADDRESS, privateKey: FAKE_PRIVATE_KEY },
  ],
  useAccountsContext: () => [{ activeAccount: {} }, { checkPassword: mockCheckPassword }],
}));

jest.mock('../../../hooks/useSecretScreen', () => ({
  useSecretScreen: (label: string) => mockUseSecretScreen(label),
}));

jest.mock('../SettingsHeaderContext', () => ({
  useSettingsHeaderOverride: jest.fn(),
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
        <RNView testID="private-key-reauth-sheet">
          <RNText>{title}</RNText>
          <RNTouchable
            testID="private-key-reauth-confirm"
            onPress={async () => {
              if (await validatePassword('test-password-000')) await onConfirm();
            }}
          >
            <RNText>confirm</RNText>
          </RNTouchable>
          <RNTouchable
            testID="private-key-reauth-confirm-wrong"
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

import { PrivateKeyPanel } from './PrivateKeyPanel';

const NETWORKS = [{ id: 'solana-mainnet', name: 'Solana Mainnet', blockchain: 'solana' }];

function renderPanel(overrides: Record<string, any> = {}) {
  return render(
    <PrivateKeyPanel
      networks={NETWORKS}
      activeAccount={{} as any}
      onBack={jest.fn()}
      biometricAvailable={false}
      authenticateWithBiometric={jest.fn(async () => null)}
      {...overrides}
    />
  );
}

describe('PrivateKeyPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not hand over the private key to whoever is holding an unlocked session', async () => {
    renderPanel();

    fireEvent.press(screen.getByTestId('private-key-reveal-overlay-0'));

    await waitFor(() => {
      expect(screen.getByTestId('private-key-reauth-sheet')).toBeTruthy();
    });
    expect(screen.queryByText(FAKE_PRIVATE_KEY)).toBeNull();
  });

  it('shows the key once the password is re-entered', async () => {
    renderPanel();

    fireEvent.press(screen.getByTestId('private-key-reveal-overlay-0'));
    fireEvent.press(screen.getByTestId('private-key-reauth-confirm'));

    await waitFor(() => {
      expect(screen.getByText(FAKE_PRIVATE_KEY)).toBeTruthy();
    });
  });

  it('keeps the key hidden when the password is wrong', async () => {
    renderPanel();

    fireEvent.press(screen.getByTestId('private-key-reveal-overlay-0'));
    fireEvent.press(screen.getByTestId('private-key-reauth-confirm-wrong'));

    await waitFor(() => {
      expect(mockCheckPassword).toHaveBeenCalled();
    });
    expect(screen.queryByText(FAKE_PRIVATE_KEY)).toBeNull();
  });

  it('takes the biometric prompt as the equivalent of the password when it is available', async () => {
    const authenticateWithBiometric = jest.fn(async () => 'cached-key');
    renderPanel({ biometricAvailable: true, authenticateWithBiometric });

    fireEvent.press(screen.getByTestId('private-key-reveal-overlay-0'));

    await waitFor(() => {
      expect(screen.getByText(FAKE_PRIVATE_KEY)).toBeTruthy();
    });
    expect(authenticateWithBiometric).toHaveBeenCalledTimes(1);
    expect(mockCheckPassword).not.toHaveBeenCalled();
  });

  it('says the clipboard is readable by other apps before the key goes into it', async () => {
    renderPanel();

    fireEvent.press(screen.getByTestId('private-key-reveal-overlay-0'));
    fireEvent.press(screen.getByTestId('private-key-reauth-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('private-key-clipboard-warning-0')).toBeTruthy();
    });
  });

  it('blocks screen capture and the app-switcher thumbnail while the panel is mounted', () => {
    renderPanel();

    expect(mockUseSecretScreen).toHaveBeenCalledWith('private-key-panel');
  });
});
