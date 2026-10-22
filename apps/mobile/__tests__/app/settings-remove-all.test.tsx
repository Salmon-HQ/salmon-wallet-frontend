/**
 * Removing every wallet asks in the kit's danger sheet, not in an OS alert
 * (DESIGN.md: ConfirmSheet over OS alerts) — the same confirmation the DOM
 * twin raises.
 */
import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));
jest.mock('react-native-safe-area-context', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(RNView, props, children),
  };
});

let mockThemePreference: 'system' | 'light' | 'dark' = 'system';
const mockChangeNetwork = jest.fn(async (_id: string) => {});
const mockToggleDeveloperNetworks = jest.fn(async (_options?: unknown) => {});
const mockSetShowUnverifiedTokens = jest.fn(async (_show: boolean) => {});
const developerModeState = { developerNetworks: false, showUnverifiedTokens: false };
const mockRemoveAllAccounts = jest.fn(async () => {});
const mockDisarm = jest.fn(async () => {});

jest.mock('@salmon/shared', () => ({
  // Removing a wallet asks the vault for key material; the screen only decides
  // whether the confirmation shows a password field.
  useAccountRemoval: () => ({
    requiresPassword: false,
    validatePassword: jest.fn(),
    remove: jest.fn(),
  }),
  // The devnet-to-mainnet passage is `useDeveloperModeToggles`'s own concern
  // (tested there); this fakes it wired to the same two spies so the row's
  // wiring is still checked here.
  useDeveloperModeToggles: () => ({
    developerNetworks: developerModeState.developerNetworks,
    showUnverifiedTokens: developerModeState.showUnverifiedTokens,
    handleToggleDeveloperNetworks: () => {
      void mockToggleDeveloperNetworks({
        activeNetworkId: 'solana-devnet',
        changeNetwork: mockChangeNetwork,
      });
    },
    handleToggleUnverifiedTokens: (show: boolean) => {
      void mockSetShowUnverifiedTokens(show);
    },
  }),
  fontFamilyNative: { regular: 'System', bold: 'System' },
  fontSize: { body: 15 },
  s: (value: number) => value,
  vs: (value: number) => value,
  spacing: { screenGutter: 20, xl: 20 },
  semantic: {
    text: { secondary: '#A7B1C4', tertiary: '#8B96AD' },
    status: { danger: '#FF6B85', dangerTint: '#3A1420' },
    border: { default: '#58637B' },
    accent: { ink: '#FF5C45' },
  },
  getSettingsItemTestId: (id: string) => `settings-item-${id}`,
  // The real table: the screen is one rendering of it, so the rows under test
  // are the rows that ship.
  ...jest.requireActual('../../../../packages/shared/src/settings/registry'),
  useAccountsContext: () => [
    {
      activeAccount: null,
      activeBlockchainAccount: null,
      networkId: 'solana-devnet',
      accounts: [],
    },
    {
      removeAllAccounts: mockRemoveAllAccounts,
      removeAccount: jest.fn(),
      changeNetwork: mockChangeNetwork,
    },
  ],
  useAnalyticsConsent: () => ({ consent: false, setConsent: jest.fn() }),
  useCurrencyContext: () => [{ currency: 'usd' }],
  useUserConfig: () => ({
    developerNetworks: false,
    toggleDeveloperNetworks: jest.fn(),
    explorer: { name: 'Solscan' },
  }),
  useTheme: () => ({ preference: mockThemePreference }),
}));

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
    // The kit's sheet, reduced to what the screen hands it. Confirm runs the
    // action and then closes, as the real sheet does.
    ConfirmSheet: ({
      visible,
      title,
      confirmText,
      isDanger,
      onConfirm,
      onClose,
    }: {
      visible: boolean;
      title: string;
      confirmText?: string;
      isDanger?: boolean;
      onConfirm: () => Promise<void> | void;
      onClose: () => void;
    }) =>
      visible ? (
        <View testID={isDanger ? 'danger-sheet' : 'sheet'}>
          <Text>{title}</Text>
          <Text
            testID="sheet-confirm"
            onPress={async () => {
              await onConfirm();
              onClose();
            }}
          >
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
      trailing,
    }: {
      testID?: string;
      title?: string;
      trailing?: React.ReactNode;
    }) => (
      <View testID={testID}>
        <Text>{title}</Text>
        {trailing}
      </View>
    ),
  };
});

jest.mock('../../src/i18n', () => ({
  useLanguage: () => ({ currentLanguage: 'en' }),
}));
jest.mock('../../src/contexts/BiometricContext', () => ({
  useBiometric: () => ({ disarm: mockDisarm }),
}));

import SettingsScreenIndex from '../../app/(app)/settings/index';

describe('Settings — remove all wallets', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks in a danger sheet, and only the confirm erases', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<SettingsScreenIndex />);

    fireEvent.press(screen.getByTestId('settings-item-removeAll'));

    expect(screen.getByTestId('danger-sheet')).toBeTruthy();
    expect(screen.getByText('settings.remove_all_title')).toBeTruthy();
    expect(alert).not.toHaveBeenCalled();
    expect(mockRemoveAllAccounts).not.toHaveBeenCalled();

    await act(async () => fireEvent.press(screen.getByTestId('sheet-confirm')));

    expect(mockDisarm).toHaveBeenCalledTimes(1);
    expect(mockRemoveAllAccounts).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)');
    expect(screen.queryByTestId('danger-sheet')).toBeNull();
  });
});
