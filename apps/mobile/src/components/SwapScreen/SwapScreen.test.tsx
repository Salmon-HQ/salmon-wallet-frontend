import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

const mockLogic: Record<string, unknown> = {};
const mockAccount: { watchOnly: boolean } = { watchOnly: false };

// The real barrel pulls in @solana/kit, which jest-expo cannot transform.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  useAccountsContext: () => [{ activeAccount: mockAccount }],
  isWatchOnlyAccount: (account: { watchOnly?: boolean } | undefined) => !!account?.watchOnly,
  spacing: { md: 12, lg: 16 },
}));
jest.mock('@salmon/shared/powerups', () => ({
  useSwapScreenLogic: () => mockLogic,
}));

jest.mock('./SwapInputScreen', () => {
  const { View } = require('react-native');
  return {
    SwapInputScreen: ({ attribution }: { attribution?: string | null }) => (
      <View testID="swap-input-screen" accessibilityLabel={attribution ?? ''} />
    ),
  };
});
jest.mock('../StateBlock', () => {
  const { View } = require('react-native');
  return {
    StateBlock: ({ testID, title }: { testID?: string; title: string }) => (
      <View testID={testID} accessibilityLabel={title} />
    ),
  };
});
jest.mock('../WarningNotice', () => {
  const { View } = require('react-native');
  return { WarningNotice: () => <View testID="warning-notice" /> };
});
jest.mock('../Send', () => {
  const { View } = require('react-native');
  return {
    TokenPickerSheet: ({
      visible,
      showBalances = true,
    }: {
      visible: boolean;
      showBalances?: boolean;
    }) => (
      <View
        testID="token-picker-sheet"
        accessibilityState={{ selected: visible }}
        accessibilityLabel={showBalances ? 'balances' : 'no-balances'}
      />
    ),
  };
});

import { SwapScreen } from './SwapScreen';

function setLogic(overrides: Record<string, unknown>) {
  for (const key of Object.keys(mockLogic)) delete mockLogic[key];
  Object.assign(
    mockLogic,
    {
      unavailable: null,
      swapError: null,
      inToken: { symbol: 'SOL', chain: 'solana', networkId: 'solana-mainnet' },
      outToken: { symbol: 'USDC', chain: 'solana' },
      inAmount: '1',
      outAmount: '150',
      isLoadingQuote: false,
      isConfirming: false,
      showInTokenModal: false,
      showOutTokenModal: false,
      tokensLoading: false,
      inUsdValue: 150,
      canSwap: true,
      reviewWarning: null,
      priceImpact: null,
      attribution: 'Powered by 0x',
      pickerInTokens: [],
      pickerOutTokens: [],
      setInAmount: jest.fn(),
      setShowInTokenModal: jest.fn(),
      setShowOutTokenModal: jest.fn(),
      handleInTokenModalSelect: jest.fn(),
      handleOutTokenModalSelect: jest.fn(),
      handleSearchTokens: undefined,
      handleSwap: jest.fn(),
    },
    overrides
  );
}

const props = { tokens: [], publicKey: 'wallet-1', networkId: 'solana-mainnet' };

describe('SwapScreen', () => {
  beforeEach(() => {
    mockAccount.watchOnly = false;
  });

  it('renders the form with the provider named from the quote', () => {
    setLogic({});
    render(<SwapScreen {...props} />);
    expect(screen.getByTestId('swap-input-screen').props.accessibilityLabel).toBe('Powered by 0x');
    // The receipt is core's, drawn in the confirmation window: this screen
    // never ends a swap itself (owner ruling 2026-09-11).
    expect(screen.queryByTestId('tx-success-screen')).toBeNull();
  });

  it('keeps balances on the You Send selector and hides them on You Receive', () => {
    setLogic({});
    render(<SwapScreen {...props} />);
    const [send, receive] = screen.getAllByTestId('token-picker-sheet');
    expect(send.props.accessibilityLabel).toBe('balances');
    expect(receive.props.accessibilityLabel).toBe('no-balances');
  });

  // Spec 027 §4–5: refused is a state of its own, never a generic error.
  it.each(['network', 'region', 'wallet'])('fails closed with the %s state', (reason) => {
    setLogic({ unavailable: reason });
    render(<SwapScreen {...props} />);
    expect(screen.getByTestId(`swap-unavailable-${reason}`).props.accessibilityLabel).toBe(
      `swap.unavailable.${reason}`
    );
    expect(screen.queryByTestId('swap-input-screen')).toBeNull();
  });

  it('refuses the whole screen for a watch-only wallet', () => {
    mockAccount.watchOnly = true;
    setLogic({});
    render(<SwapScreen {...props} />);
    expect(screen.getByTestId('swap-watch-only-notice')).toBeTruthy();
    expect(screen.queryByTestId('swap-input-screen')).toBeNull();
  });
});
