/**
 * The Appearance row in the Preferences group shows the user's current
 * theme preference as its trailing value, same as Language and Currency.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
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
      networkId: 'solana-mainnet',
      accounts: [],
    },
    { removeAllAccounts: jest.fn(), removeAccount: jest.fn() },
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

describe('Settings — appearance row', () => {
  it('shows the System label as the trailing value by default', () => {
    mockThemePreference = 'system';
    render(<SettingsScreenIndex />);
    expect(screen.getByTestId('settings-item-appearance-value')).toHaveTextContent('System');
  });

  it('shows the Dark label when the preference is dark', () => {
    mockThemePreference = 'dark';
    render(<SettingsScreenIndex />);
    expect(screen.getByTestId('settings-item-appearance-value')).toHaveTextContent('Dark');
  });
});
