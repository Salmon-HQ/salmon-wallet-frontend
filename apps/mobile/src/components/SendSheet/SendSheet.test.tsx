import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockSendHookReset = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

jest.mock('@salmon/shared', () => ({
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

const headerProps: Record<string, unknown>[] = [];

jest.mock('../BottomSheetTitleHeader', () => ({
  BottomSheetTitleHeader: (props: Record<string, unknown>) => {
    headerProps.push(props);
    return null;
  },
}));

jest.mock('./StepTokenSelect', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    StepTokenSelect: ({
      tokens,
      onSelectToken,
    }: {
      tokens: { symbol: string }[];
      onSelectToken: (token: unknown) => void;
    }) => (
      <RNText testID="step-token-select" onPress={() => onSelectToken(tokens[0])}>
        token-select
      </RNText>
    ),
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

const lastHeaderProps = () => headerProps[headerProps.length - 1];

describe('SendSheet', () => {
  beforeEach(() => {
    headerProps.length = 0;
  });

  // A back control is a promise that a previous step exists. A single-token
  // chain opens on the form, so there is nothing behind it and the header
  // must draw no chevron — the settings-gate reasoning in DESIGN.md §Motion.
  it('draws no back control on a single-token chain, and one on a multi-token chain', () => {
    const { rerender } = render(
      <SendSheet
        visible
        onClose={jest.fn()}
        tokens={[btcToken]}
        blockchain="bitcoin"
        account={account}
      />
    );
    expect(lastHeaderProps().onBack).toBeUndefined();
    const singleTokenHeader = lastHeaderProps();

    rerender(
      <SendSheet
        visible
        onClose={jest.fn()}
        tokens={[solToken]}
        blockchain="solana"
        account={account}
      />
    );
    // Solana's first step is the token list — also nothing behind it. Picking
    // a token is what creates a step to return to.
    expect(lastHeaderProps().onBack).toBeUndefined();
    fireEvent.press(screen.getByTestId('step-token-select'));
    expect(typeof lastHeaderProps().onBack).toBe('function');
    const multiTokenHeader = lastHeaderProps();

    // The title must not travel between chains: everything that could move it
    // is identical, so only the chevron's presence differs.
    expect(singleTokenHeader.title).toBe(multiTokenHeader.title);
    expect(singleTokenHeader.style).toEqual(multiTokenHeader.style);
    expect(singleTokenHeader.titleStyle).toEqual(multiTokenHeader.titleStyle);
    expect(singleTokenHeader.titleNumberOfLines).toEqual(multiTokenHeader.titleNumberOfLines);
  });

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
