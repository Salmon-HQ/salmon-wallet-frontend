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

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  // The real design tokens: the panel composes kit blocks that read far more
  // of them than a hand-listed subset can keep up with.
  ...jest.requireActual('../../../test-utils/themeTokens'),
  getShortAddress: (address: string) => address.slice(0, 8),
  getAccountKeysForNetwork: () => [
    { path: "m/44'/501'/0'/0'", address: FAKE_ADDRESS, privateKey: FAKE_PRIVATE_KEY },
  ],
  useAccountsContext: () => [{ activeAccount: {} }, { checkPassword: mockCheckPassword }],
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
  useSecretScreen: (label: string) => mockUseSecretScreen(label),
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

// ============================================================================
// The network gate — the step that decides which key gets exposed
// ============================================================================

const MULTI_NETWORKS = [
  { id: 'solana-mainnet', name: 'Solana Mainnet', blockchain: 'solana' },
  { id: 'solana-devnet', name: 'Solana Devnet', blockchain: 'solana' },
  { id: 'bitcoin-mainnet', name: 'Bitcoin Mainnet', blockchain: 'bitcoin' },
  { id: 'bitcoin-testnet', name: 'Bitcoin Testnet', blockchain: 'bitcoin' },
  { id: 'ethereum-mainnet', name: 'Ethereum Mainnet', blockchain: 'ethereum' },
];

describe('PrivateKeyPanel network gate', () => {
  it('drops the caret — picking a network sinks into the keys, it does not slide a panel in', () => {
    const { CaretRightIcon } = jest.requireActual('../../icons');
    const view = renderPanel({ networks: MULTI_NETWORKS });

    expect(view.UNSAFE_queryAllByType(CaretRightIcon)).toHaveLength(0);
  });

  it('keeps the text chip on every non-mainnet row, so a testnet key cannot pass for a real one', () => {
    const view = renderPanel({ networks: MULTI_NETWORKS });

    expect(view.getByTestId('private-key-network-chip-solana-devnet')).toBeTruthy();
    expect(view.getByTestId('private-key-network-chip-bitcoin-testnet')).toBeTruthy();
    expect(view.getByText('DEVNET')).toBeTruthy();
    expect(view.getByText('TESTNET')).toBeTruthy();
  });

  it('leaves mainnet rows unchipped — mainnet is the silent default', () => {
    const view = renderPanel({ networks: MULTI_NETWORKS });

    expect(view.queryByTestId('private-key-network-chip-solana-mainnet')).toBeNull();
    expect(view.queryByTestId('private-key-network-chip-bitcoin-mainnet')).toBeNull();
    expect(view.queryByTestId('private-key-network-chip-ethereum-mainnet')).toBeNull();
  });

  it('marks each row with its own chain, not four identical globes', () => {
    const { BitcoinSvgIcon, EthereumSvgIcon, SolanaSvgIcon } =
      jest.requireActual('../Icon/SvgIcons');
    const { GlobeIcon } = jest.requireActual('../../icons');
    const view = renderPanel({ networks: MULTI_NETWORKS });

    // Two Solana rows, two Bitcoin rows, one Ethereum row — three distinct marks.
    expect(view.UNSAFE_queryAllByType(SolanaSvgIcon)).toHaveLength(2);
    expect(view.UNSAFE_queryAllByType(BitcoinSvgIcon)).toHaveLength(2);
    expect(view.UNSAFE_queryAllByType(EthereumSvgIcon)).toHaveLength(1);
    expect(view.UNSAFE_queryAllByType(GlobeIcon)).toHaveLength(0);
  });

  it('falls back to the globe for a chain it has no mark for', () => {
    const { GlobeIcon } = jest.requireActual('../../icons');
    const view = renderPanel({
      networks: [
        { id: 'solana-mainnet', name: 'Solana Mainnet', blockchain: 'solana' },
        { id: 'dogecoin-mainnet', name: 'Dogecoin Mainnet', blockchain: 'dogecoin' },
      ],
    });

    expect(view.UNSAFE_queryAllByType(GlobeIcon)).toHaveLength(1);
  });
});
