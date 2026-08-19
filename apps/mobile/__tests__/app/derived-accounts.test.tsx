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
  // Real tokens rather than a hand-listed subset — see test-utils/themeTokens.
  ...jest.requireActual('../../test-utils/themeTokens'),
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

jest.mock('../../src/components', () => {
  const { View } = require('react-native');
  return {
    DerivedAccountCard: () => null,
    DerivedAccountCardSkeleton: () => null,
    PrimaryButton: () => null,
    SecondaryButton: () => null,
    ReservedSlot: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
    OnboardingTitle: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
    OnboardingDescription: ({ children }: { children?: React.ReactNode }) => (
      <View>{children}</View>
    ),
    OnboardingLayout: (props: Record<string, React.ReactNode>) => (
      <View>
        {props.chrome}
        {props.title}
        {props.description}
        {props.body}
        {props.assist}
        {props.secondary}
        {props.action}
      </View>
    ),
    ScreenHeader: (props: Record<string, unknown>) => mockScreenHeader(props),
  };
});

import DerivedAccountsScreen from '../../app/(auth)/derived-accounts';

describe('DerivedAccountsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScanDerivedAccounts.mockResolvedValue({ accounts: [], failedNetworks: [] });
  });

  it('renders the header without a back control', async () => {
    render(<DerivedAccountsScreen />);

    await waitFor(() => {
      expect(mockScreenHeader).toHaveBeenCalled();
    });

    expect(mockScreenHeader.mock.calls[0][0].onBack).toBeUndefined();
  });
});
