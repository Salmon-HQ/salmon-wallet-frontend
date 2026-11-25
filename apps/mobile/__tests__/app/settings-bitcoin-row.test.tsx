/**
 * The Bitcoin switch, last in Preferences (spec 045, FR-010–FR-012). Turning
 * it on applies at once; turning it off asks first in the kit's confirmation
 * sheet and writes only on confirm. The real `useDeveloperModeToggles` runs
 * here over a faked provider slice, so the question the screen shows is the
 * shared hook's own.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-i18next', () => {
  const dictionary = require('../../../../packages/shared/src/locales/en/translation.json');
  const resolve = (key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as never)?.[part], dictionary);
  return {
    useTranslation: () => ({
      t: (key: string, fallback?: string) =>
        (resolve(key) as string | undefined) ?? (typeof fallback === 'string' ? fallback : key),
    }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(RNView, props, children),
  };
});

const mockBitcoin = { enabled: true, setBitcoinEnabled: jest.fn(async () => {}) };
const mockChangeNetwork = jest.fn(async (_id: string) => {});

jest.mock('../../../../packages/shared/src/contexts/DeveloperModeContext', () => ({
  ...jest.requireActual('../../../../packages/shared/src/contexts/DeveloperModeContext'),
  useDeveloperModeSettings: () => ({
    developerNetworks: false,
    showUnverifiedTokens: false,
    toggleDeveloperNetworks: jest.fn(),
    setShowUnverifiedTokens: jest.fn(),
    bitcoinEnabled: mockBitcoin.enabled,
    setBitcoinEnabled: mockBitcoin.setBitcoinEnabled,
  }),
}));
jest.mock('../../../../packages/shared/src/contexts/AccountsContext', () => ({
  ...jest.requireActual('../../../../packages/shared/src/contexts/AccountsContext'),
  useAccountsContext: () => [
    {
      activeAccount: null,
      activeBlockchainAccount: null,
      networkId: 'solana-mainnet',
      accounts: [],
    },
    { removeAllAccounts: jest.fn(), removeAccount: jest.fn(), changeNetwork: mockChangeNetwork },
  ],
}));

jest.mock('@salmon/shared', () =>
  require('../../test-utils/sharedWith').sharedWith({
    useAccountRemoval: () => ({
      requiresPassword: false,
      validatePassword: jest.fn(),
      remove: jest.fn(),
    }),
    useAccountsContext: () => [
      {
        activeAccount: null,
        activeBlockchainAccount: null,
        networkId: 'solana-mainnet',
        accounts: [],
      },
      { removeAllAccounts: jest.fn(), removeAccount: jest.fn(), changeNetwork: mockChangeNetwork },
    ],
    useAnalyticsConsent: () => ({ consent: false, setConsent: jest.fn() }),
    useCurrencyContext: () => [{ currency: 'usd' }],
    useTokenListLabels: () => ({ rowValue: 'All' }),
    useUserConfig: () => ({ explorer: { name: 'Solscan' } }),
    useTheme: () => ({ preference: 'system' }),
  })
);

jest.mock('../../src/icons', () => {
  const { View } = require('react-native');
  const Stub = () => <View />;
  return new Proxy(
    { iconSize: { sm: 16, md: 20, lg: 24, xl: 28 } },
    {
      get: (target, prop) =>
        prop in target ? (target as Record<string, unknown>)[prop as string] : Stub,
    }
  );
});

jest.mock('../../src/components', () => {
  const { View, Text } = require('react-native');
  return {
    // The kit's sheet, reduced to what the screen hands it, under its own ids.
    ConfirmSheet: ({
      visible,
      title,
      confirmText,
      onConfirm,
      onClose,
    }: {
      visible: boolean;
      title: string;
      confirmText?: string;
      onConfirm: () => Promise<void> | void;
      onClose: () => void;
    }) =>
      visible ? (
        <View>
          <Text>{title}</Text>
          <Text testID="confirm-dialog-cancel" onPress={onClose}>
            Cancel
          </Text>
          <Text testID="confirm-dialog-confirm" onPress={() => onConfirm()}>
            {confirmText}
          </Text>
        </View>
      ) : null,
    DepthBackground: () => null,
    ScalesBackground: () => null,
    SectionLabel: ({ children }: { children?: React.ReactNode }) => <Text>{children}</Text>,
    ScreenHeader: ({ title }: { title?: string }) => <Text>{title}</Text>,
    IconBubble: () => <View />,
    ListRow: ({
      testID,
      title,
      subtitle,
      trailing,
    }: {
      testID?: string;
      title?: string;
      subtitle?: string;
      trailing?: React.ReactNode;
    }) => (
      <View testID={testID}>
        <Text>{title}</Text>
        {subtitle ? <Text>{subtitle}</Text> : null}
        {trailing}
      </View>
    ),
  };
});

jest.mock('../../src/i18n', () => ({
  useLanguage: () => ({ currentLanguage: 'en' }),
}));
jest.mock('../../src/contexts/BiometricContext', () => ({
  useBiometric: () => ({ disarm: jest.fn() }),
}));

import SettingsScreenIndex from '../../app/(app)/settings/index';

const bitcoinSwitch = () => screen.getByTestId('settings-bitcoin-toggle');

describe('Settings — the Bitcoin switch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBitcoin.enabled = true;
  });

  it('is the last row of Preferences, with its label and description', () => {
    render(<SettingsScreenIndex />);

    const preferences = screen.getByTestId('settings-section-settings.sections.preferences');
    const rows = preferences.children as Array<{ props: { testID?: string } }>;
    expect(rows[rows.length - 1].props.testID).toBe('settings-item-bitcoin');
    expect(screen.getByText('Bitcoin')).toBeTruthy();
    expect(screen.getByText('Show Bitcoin in your wallet')).toBeTruthy();
  });

  it('reads on by default and off with the choice off', () => {
    const { unmount } = render(<SettingsScreenIndex />);
    expect(bitcoinSwitch().props.value).toBe(true);
    unmount();

    mockBitcoin.enabled = false;
    render(<SettingsScreenIndex />);
    expect(bitcoinSwitch().props.value).toBe(false);
  });

  it('turns Bitcoin on at once, without asking', () => {
    mockBitcoin.enabled = false;
    render(<SettingsScreenIndex />);

    fireEvent(bitcoinSwitch(), 'valueChange', true);

    expect(mockBitcoin.setBitcoinEnabled).toHaveBeenCalledWith(true);
    expect(screen.queryByText('Hide Bitcoin?')).toBeNull();
  });

  it('asks before hiding Bitcoin, with the switch still on', () => {
    render(<SettingsScreenIndex />);

    fireEvent(bitcoinSwitch(), 'valueChange', false);

    expect(screen.getByText('Hide Bitcoin?')).toBeTruthy();
    expect(bitcoinSwitch().props.value).toBe(true);
    expect(mockBitcoin.setBitcoinEnabled).not.toHaveBeenCalled();
  });

  it('cancelling closes the question and leaves the switch on', () => {
    render(<SettingsScreenIndex />);
    fireEvent(bitcoinSwitch(), 'valueChange', false);

    fireEvent.press(screen.getByTestId('confirm-dialog-cancel'));

    expect(screen.queryByText('Hide Bitcoin?')).toBeNull();
    expect(bitcoinSwitch().props.value).toBe(true);
    expect(mockBitcoin.setBitcoinEnabled).not.toHaveBeenCalled();
  });

  it('confirming hides Bitcoin, handing the setter the session to move', async () => {
    render(<SettingsScreenIndex />);
    fireEvent(bitcoinSwitch(), 'valueChange', false);

    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() =>
      expect(mockBitcoin.setBitcoinEnabled).toHaveBeenCalledWith(false, {
        activeNetworkId: 'solana-mainnet',
        changeNetwork: mockChangeNetwork,
      })
    );
    await waitFor(() => expect(screen.queryByText('Hide Bitcoin?')).toBeNull());
  });
});
