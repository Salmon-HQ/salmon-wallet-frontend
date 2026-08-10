import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockScreenHeader = jest.fn((_props: Record<string, unknown>) => null);
const mockScanDerivedAccounts = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: jest.fn(),
  },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@salmon/assets', () => ({
  Logo: 1,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: (props: { children?: React.ReactNode }) => <View>{props.children}</View>,
  };
});

jest.mock('@salmon/shared', () => ({
  colors: {
    text: { primary: '#fff', secondary: '#aaa', tertiary: '#888' },
    accent: { primary: '#0f0' },
  },
  componentSizes: { logoSizeSmall: 80 },
  contentPadding: { screen: 16 },
  fontFamilyNative: { bold: 'System', regular: 'System' },
  spacing: { sm: 8, md: 12, lg: 16 },
  NETWORK_DISPLAY: {},
  deriveBlockchainAccount: jest.fn(),
  getMirrorNetworkId: jest.fn(),
  getScanNetworks: () => [],
  getShortAddress: () => 'Addr...1111',
  scanDerivedAccounts: (...args: unknown[]) => mockScanDerivedAccounts(...args),
  useAccountsContext: () => [
    { activeAccount: { mnemonic: 'test mnemonic', networksAccounts: {} } },
    {},
  ],
}));

jest.mock('../../src/components', () => ({
  DerivedAccountCard: () => null,
  DerivedAccountCardSkeleton: () => null,
  PrimaryButton: () => null,
  SecondaryButton: () => null,
  ScreenHeader: (props: Record<string, unknown>) => mockScreenHeader(props),
}));

import DerivedAccountsScreen from '../../app/(auth)/derived-accounts';

describe('DerivedAccountsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScanDerivedAccounts.mockResolvedValue([]);
  });

  it('renders the header without a back control', async () => {
    render(<DerivedAccountsScreen />);

    await waitFor(() => {
      expect(mockScreenHeader).toHaveBeenCalled();
    });

    expect(mockScreenHeader.mock.calls[0][0].onBack).toBeUndefined();
  });
});
