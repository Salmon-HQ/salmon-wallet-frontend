/**
 * The two "show me more" rows in Advanced.
 *
 * Developer Networks came back (owner ruling 1, spec 026) and brought a
 * second row with it: unverified tokens are their own setting now, so a user
 * who wants to see what an airdrop left behind does not have to put devnet in
 * the carousel to get it. Both write through the `(app)` provider, and
 * turning Developer Networks off hands the toggle the session's network and
 * `changeNetwork` so a devnet session is moved to mainnet before the flag
 * clears.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

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
const mockChangeNetwork = jest.fn(async () => {});
const mockToggleDeveloperNetworks = jest.fn(async () => {});
const mockSetShowUnverifiedTokens = jest.fn(async () => {});
const developerModeState = { developerNetworks: false, showUnverifiedTokens: false };

jest.mock('../../src/contexts/DeveloperModeContext', () => ({
  useDeveloperModeSettings: () => ({
    developerNetworks: developerModeState.developerNetworks,
    showUnverifiedTokens: developerModeState.showUnverifiedTokens,
    toggleDeveloperNetworks: mockToggleDeveloperNetworks,
    setShowUnverifiedTokens: mockSetShowUnverifiedTokens,
  }),
}));

jest.mock('@salmon/shared', () => ({
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
  LANGUAGE_NAMES: { en: 'English' },
  useAccountsContext: () => [
    {
      activeAccount: null,
      activeBlockchainAccount: null,
      networkId: 'solana-devnet',
      accounts: [],
    },
    { removeAllAccounts: jest.fn(), removeAccount: jest.fn(), changeNetwork: mockChangeNetwork },
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
  const ReactActual = require('react');
  const { View, Text } = require('react-native');
  return {
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
jest.mock('../../hooks/useBiometricAuth', () => ({
  useBiometricAuth: () => ({ setEnableBiometric: jest.fn() }),
}));

import SettingsScreenIndex from '../../app/(app)/settings/index';

describe('Settings — the two show-me-more rows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockThemePreference = 'system';
    developerModeState.developerNetworks = false;
    developerModeState.showUnverifiedTokens = false;
  });

  it('offers Developer Networks with its restored description', () => {
    render(<SettingsScreenIndex />);

    expect(screen.getByTestId('settings-item-developerNetworks')).toBeTruthy();
    expect(screen.getByTestId('settings-developer-networks-toggle').props.value).toBe(false);
    expect(screen.getByTestId('settings-developer-networks-toggle').props.accessibilityHint).toBe(
      'settings.developer_networks_description'
    );
  });

  it('moves the session off devnet before clearing the flag', () => {
    developerModeState.developerNetworks = true;
    render(<SettingsScreenIndex />);

    fireEvent(screen.getByTestId('settings-developer-networks-toggle'), 'valueChange', false);

    // The shared toggle owns the passage; the row hands it the session.
    expect(mockToggleDeveloperNetworks).toHaveBeenCalledWith({
      activeNetworkId: 'solana-devnet',
      changeNetwork: mockChangeNetwork,
    });
  });

  it('persists the unverified-tokens choice on its own, never through the flag', () => {
    render(<SettingsScreenIndex />);

    expect(screen.getByTestId('settings-unverified-tokens-toggle').props.value).toBe(false);
    fireEvent(screen.getByTestId('settings-unverified-tokens-toggle'), 'valueChange', true);

    expect(mockSetShowUnverifiedTokens).toHaveBeenCalledWith(true);
    expect(mockToggleDeveloperNetworks).not.toHaveBeenCalled();
  });

  it('reads each switch back from its own stored value', () => {
    developerModeState.developerNetworks = true;
    developerModeState.showUnverifiedTokens = true;

    render(<SettingsScreenIndex />);

    expect(screen.getByTestId('settings-developer-networks-toggle').props.value).toBe(true);
    expect(screen.getByTestId('settings-unverified-tokens-toggle').props.value).toBe(true);
  });
});
