/**
 * The Send sheet's steps, and the verb they speak between them.
 *
 * The contract: a step change inside the mounted sheet sinks what leaves and
 * floats what arrives; the first step of the flow does not float in on the
 * sheet's own arrival (DESIGN.md §Motion — a sheet's content never speaks the
 * verb as the sheet itself rises); back is the mirror; reduce motion cuts and
 * still changes the step; and the receipt is not floated in as a block,
 * because it owns its own arrival sequence.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

const mockSendHookReset = jest.fn();

let mockReduceMotion = false;
/** Every `entering`/`exiting` handed to a step, in render order, by step key. */
const layoutByKey: Array<[string, unknown, unknown]> = [];

jest.mock('react-native-reanimated', () => {
  const RealReact = require('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View: ({ children, testID, entering, exiting, ...rest }: Record<string, never>) => {
        layoutByKey.push([testID as unknown as string, entering, exiting]);
        return RealReact.createElement(View, { testID, ...rest }, children);
      },
    },
    useReducedMotion: () => mockReduceMotion,
  };
});

/** The verb's shapes are pinned by their own suite; here they only need identity. */
jest.mock('../../utils/sinkAndFloat', () => ({
  FLOAT_DELAY_MS: 450,
  floatEntering: (reduceMotion: boolean) => (reduceMotion ? undefined : 'float'),
  sinkExiting: (reduceMotion: boolean) => (reduceMotion ? undefined : 'sink'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

jest.mock('@salmon/shared', () => ({
  SOL_CONSTANTS: { ADDRESS: 'So11111111111111111111111111111111111111112' },
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
    StepAddressAmount: ({
      token,
      onReview,
    }: {
      token: { symbol: string };
      onReview: (address: string, amount: string) => void;
    }) => (
      <RNText testID="step-address-amount" onPress={() => onReview('recipient', '1')}>
        {token.symbol}
      </RNText>
    ),
  };
});

jest.mock('./StepConfirmation', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    StepConfirmation: ({ onSuccess }: { onSuccess: (txId: string) => void }) => (
      <RNText testID="step-confirmation" onPress={() => onSuccess('tx-1')}>
        confirmation
      </RNText>
    ),
  };
});

jest.mock('../TransactionSuccessScreen', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    TransactionSuccessScreen: () => <RNText testID="success-screen">success</RNText>,
  };
});

import { SendSheet } from './SendSheet';

const account = {
  getNetworkId: () => 'solana-mainnet',
  getReceiveAddress: () => 'addr',
} as any;

const btcToken = { address: 'btc', symbol: 'BTC', decimals: 8, uiAmount: 0.0005 } as any;
const solToken = { address: 'sol', symbol: 'SOL', decimals: 9, uiAmount: 1 } as any;

const lastHeaderProps = () => headerProps[headerProps.length - 1];

/** The `entering` / `exiting` last handed to a given step. */
const lastLayout = (key: string) => {
  const entries = layoutByKey.filter(([testID]) => testID === key);
  return entries.length ? entries[entries.length - 1] : undefined;
};

describe('SendSheet', () => {
  beforeEach(() => {
    headerProps.length = 0;
    layoutByKey.length = 0;
    mockReduceMotion = false;
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

describe('SendSheet — the steps speak the sink and the float', () => {
  beforeEach(() => {
    layoutByKey.length = 0;
    mockReduceMotion = false;
  });

  const renderSolana = () =>
    render(
      <SendSheet
        visible
        onClose={jest.fn()}
        tokens={[solToken]}
        blockchain="solana"
        account={account}
      />
    );

  it('does not float the first step in as the sheet arrives', () => {
    renderSolana();
    // The sheet is the thing that rises; the step it opens on is already there.
    expect(lastLayout('send-step-token-select')?.[1]).toBeUndefined();
  });

  it('does not float the form in when a single-token chain opens on it', () => {
    render(
      <SendSheet
        visible
        onClose={jest.fn()}
        tokens={[btcToken]}
        blockchain="bitcoin"
        account={account}
      />
    );
    // Bitcoin's sequence starts at the form: nothing stepped, so nothing floats.
    expect(lastLayout('send-step-address-amount')?.[1]).toBeUndefined();
  });

  it('sinks the step that leaves and floats the step that arrives', () => {
    renderSolana();
    // The outgoing step carries the sink from the first render — it cannot be
    // handed one at the moment it unmounts.
    expect(lastLayout('send-step-token-select')?.[2]).toBe('sink');

    fireEvent.press(screen.getByTestId('step-token-select'));

    expect(screen.getByTestId('step-address-amount')).toBeTruthy();
    expect(lastLayout('send-step-address-amount')?.[1]).toBe('float');
  });

  it('mirrors the step on the way back', () => {
    renderSolana();
    fireEvent.press(screen.getByTestId('step-token-select'));
    expect(lastLayout('send-step-address-amount')?.[2]).toBe('sink');

    const onBack = lastHeaderProps().onBack as () => void;
    act(() => onBack());

    expect(screen.getByTestId('step-token-select')).toBeTruthy();
    // What floated in has sunk out, and the step behind it floats back.
    expect(lastLayout('send-step-token-select')?.[1]).toBe('float');
  });

  it('cuts under reduced motion, and the step still changes', () => {
    mockReduceMotion = true;
    renderSolana();

    fireEvent.press(screen.getByTestId('step-token-select'));

    expect(screen.getByTestId('step-address-amount')).toBeTruthy();
    const layout = lastLayout('send-step-address-amount');
    expect(layout?.[1]).toBeUndefined();
    expect(layout?.[2]).toBeUndefined();
  });

  it('hands the receipt no float of its own — it owns its arrival', () => {
    renderSolana();
    fireEvent.press(screen.getByTestId('step-token-select'));
    // Straight to the confirmation, then through it.
    fireEvent.press(screen.getByTestId('step-address-amount'));
    fireEvent.press(screen.getByTestId('step-confirmation'));

    expect(screen.getByTestId('success-screen')).toBeTruthy();
    // The success step is not one of the animated steps: floating it in as a
    // block would make the receipt's own band sequence arrive twice.
    expect(lastLayout('send-step-success')).toBeUndefined();
  });
});
