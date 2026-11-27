/**
 * The Token list row sits second in Preferences, under Display Language, and
 * states the user's choice as its trailing value, same as Language and
 * Currency (spec 044, US4 AC1-AC2).
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-i18next', () => {
  // The real English copy: the row's value IS the translated string.
  const dictionary = require('../../../../packages/shared/src/locales/en/translation.json');
  const resolve = (key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as never)?.[part], dictionary);
  return {
    useTranslation: () => ({
      t: (key: string, fallback?: string | Record<string, unknown>) => {
        const values = fallback && typeof fallback === 'object' ? fallback : {};
        const template =
          (resolve(key) as string | undefined) ?? (typeof fallback === 'string' ? fallback : key);
        return template.replace(/\{\{(\w+)\}\}/g, (_m, name) => String(values[name] ?? ''));
      },
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

let mockTokenListPreference: { maxCount: number | null; minValue: number | null } = {
  maxCount: null,
  minValue: null,
};

// The row's value comes from the real `useTokenListLabels`; only the stored
// choice and the currency it is printed in are set here.
jest.mock('../../../../packages/shared/src/contexts/DeveloperModeContext', () => ({
  ...jest.requireActual('../../../../packages/shared/src/contexts/DeveloperModeContext'),
  useTokenListPreference: () => ({
    tokenListPreference: mockTokenListPreference,
    setTokenListPreference: jest.fn(),
  }),
}));
jest.mock('../../../../packages/shared/src/contexts/CurrencyContext', () => ({
  ...jest.requireActual('../../../../packages/shared/src/contexts/CurrencyContext'),
  useCurrencyContext: () => [
    { currency: 'usd', exchangeRate: 1 },
    { formatValue: (usd: number) => `$${usd.toFixed(2)}` },
  ],
}));

jest.mock('@salmon/shared', () =>
  require('../../test-utils/sharedWith').sharedWith({
    useAccountRemoval: () => ({
      requiresPassword: false,
      validatePassword: jest.fn(),
      remove: jest.fn(),
    }),
    useDeveloperModeToggles: () => ({
      developerNetworks: false,
      showUnverifiedTokens: false,
      handleToggleDeveloperNetworks: jest.fn(),
      handleToggleUnverifiedTokens: jest.fn(),
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
    // The real table and test ids: the rows under test are the rows that ship.
    ...jest.requireActual('../../../../packages/shared/src/settings/registry'),
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
    ConfirmSheet: () => null,
    DepthBackground: () => null,
    // A refused removal's dialog; these rows never raise it.
    VaultRefusedDialog: () => null,
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
  useBiometric: () => ({ disarm: jest.fn() }),
}));

import SettingsScreenIndex from '../../app/(app)/settings/index';

describe('Settings — token list row', () => {
  beforeEach(() => {
    mockTokenListPreference = { maxCount: null, minValue: null };
  });

  it('sits second in Preferences, under Display Language', () => {
    render(<SettingsScreenIndex />);
    const rows = screen
      .getAllByTestId(/^settings-item-[a-z-]+$/)
      .map((node) => node.props.testID as string)
      .filter((id) => !id.endsWith('-value'));
    const language = rows.indexOf('settings-item-display-language');
    expect(rows.slice(language, language + 3)).toEqual([
      'settings-item-display-language',
      'settings-item-token-list',
      'settings-item-display-currency',
    ]);
  });

  it('reads "All" while both choices are off', () => {
    render(<SettingsScreenIndex />);
    expect(screen.getByTestId('settings-item-token-list-value')).toHaveTextContent('All');
  });

  it('states a count and a minimum value together', () => {
    mockTokenListPreference = { maxCount: 3, minValue: 5 };
    render(<SettingsScreenIndex />);
    expect(screen.getByTestId('settings-item-token-list-value')).toHaveTextContent(
      '3 tokens · from $5.00'
    );
  });
});
