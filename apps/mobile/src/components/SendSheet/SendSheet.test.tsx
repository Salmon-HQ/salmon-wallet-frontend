import React from 'react';
import { render, screen } from '@testing-library/react-native';

const mockSendHookReset = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

// The confirmation step's sink pulls Reanimated, which has no native Worklets
// under Jest; the mock only has to let the entering/exiting props exist.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useReducedMotion: () => false,
    withTiming: (toValue: unknown) => toValue,
    withDelay: (_delayMs: number, animation: unknown) => animation,
    Easing: { bezier: (...coefficients: number[]) => coefficients },
  };
});

jest.mock('@salmon/shared', () => ({
  // The real motion vocabulary — the sink helper reads it at module load.
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  useSendTransaction: () => ({
    estimateFee: jest.fn(),
    sendTransaction: jest.fn(),
    status: 'idle',
    settling: false,
    feeEstimateFailed: false,
    error: null,
    isError: false,
    reset: mockSendHookReset,
  }),
  getTransactionUrl: () => 'https://example.com/tx',
  getDefaultExplorer: () => 'explorer',
  getShortAddress: (addr?: string) => addr,
}));

jest.mock('../BottomSheetContainer', () => ({
  BottomSheetContainer: ({
    children,
    headerContent,
  }: {
    children?: React.ReactNode;
    headerContent?: React.ReactNode;
  }) => (
    <>
      {headerContent}
      {children}
    </>
  ),
}));

jest.mock('../BottomSheetTitleHeader', () => ({
  BottomSheetTitleHeader: () => null,
}));

jest.mock('./StepTokenSelect', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    StepTokenSelect: () => <RNText testID="step-token-select">token-select</RNText>,
  };
});

jest.mock('./StepAddressAmount', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    StepAddressAmount: ({ token }: { token: { symbol: string } }) => (
      <RNText testID="step-address-amount">{token.symbol}</RNText>
    ),
  };
});

jest.mock('./StepConfirmation', () => ({
  StepConfirmation: () => null,
}));

jest.mock('../TransactionSuccessScreen', () => ({
  TransactionSuccessScreen: () => null,
}));

import { SendSheet } from './SendSheet';

const account = {
  getNetworkId: () => 'solana-mainnet',
  getReceiveAddress: () => 'addr',
} as any;

const btcToken = { address: 'btc', symbol: 'BTC', decimals: 8, uiAmount: 0.0005 } as any;
const solToken = { address: 'sol', symbol: 'SOL', decimals: 9, uiAmount: 1 } as any;

describe('SendSheet', () => {
  it('re-derives step and selected token when the blockchain prop changes', () => {
    // Mounted while on Bitcoin: single-token flow jumps straight to
    // address-amount with BTC preselected.
    const { rerender } = render(
      <SendSheet
        visible
        onClose={jest.fn()}
        tokens={[btcToken]}
        blockchain="bitcoin"
        account={account}
      />
    );
    expect(screen.getByTestId('step-address-amount')).toHaveTextContent('BTC');

    // The sheet stays mounted across a chain switch. Flipping the blockchain
    // prop to Solana must drop the BTC flow state and land on token-select —
    // this is the regression where the sheet opened showing the previous
    // chain's token.
    rerender(
      <SendSheet
        visible
        onClose={jest.fn()}
        tokens={[solToken]}
        blockchain="solana"
        account={account}
      />
    );
    expect(screen.queryByTestId('step-address-amount')).toBeNull();
    expect(screen.getByTestId('step-token-select')).toBeTruthy();
  });

  it('re-derives into the single-token flow when switching to bitcoin', () => {
    const { rerender } = render(
      <SendSheet
        visible
        onClose={jest.fn()}
        tokens={[solToken]}
        blockchain="solana"
        account={account}
      />
    );
    expect(screen.getByTestId('step-token-select')).toBeTruthy();

    rerender(
      <SendSheet
        visible
        onClose={jest.fn()}
        tokens={[btcToken]}
        blockchain="bitcoin"
        account={account}
      />
    );
    expect(screen.getByTestId('step-address-amount')).toHaveTextContent('BTC');
  });
});
