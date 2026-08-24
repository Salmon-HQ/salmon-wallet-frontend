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

/**
 * Drives the one send hook the sheet owns. The hook is the sheet's only report
 * on the transfer — the confirmation step unmounts the moment the screen is
 * handed over — so a test moves the transaction, not the step.
 */
let sendController: { commit: () => void; land: () => void; fail: () => void } | null = null;

jest.mock('@salmon/shared', () => ({
  SOL_CONSTANTS: { ADDRESS: 'So11111111111111111111111111111111111111112' },
  useSendTransaction: () => {
    const RealReact = require('react');
    const [status, setStatus] = RealReact.useState('idle');
    sendController = {
      commit: () => setStatus('sending'),
      land: () => setStatus('success'),
      fail: () => setStatus('failed'),
    };
    return {
      estimateFee: jest.fn(),
      sendTransaction: jest.fn(),
      status,
      settling: false,
      feeEstimateFailed: false,
      error: null,
      isError: false,
      reset: () => {
        mockSendHookReset();
        setStatus('idle');
      },
    };
  },
  getTransactionUrl: () => 'https://example.com/tx',
  getDefaultExplorer: () => 'explorer',
  getShortAddress: (addr?: string) => addr,
  semantic: { depth: { column: '#000000' } },
  // The real hook keeps the wait mounted until it reports its last wave has
  // left. The mock keeps that contract — held goes true with the wait and only
  // `onExited` clears it — so the receipt's gate is exercised for real.
  useWaitExit: (show: boolean) => {
    const RealReact = require('react');
    const [held, setHeld] = RealReact.useState(show);
    RealReact.useEffect(() => {
      if (show) setHeld(true);
    }, [show]);
    return { held, onExited: RealReact.useCallback(() => setHeld(false), []) };
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../DepthBackground', () => ({ DepthBackground: () => null }));
jest.mock('../ScalesBackground', () => ({ ScalesBackground: () => null }));

/** Every wait rendered, so a test can drive its departure. */
jest.mock('../LoadingScreen', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    LoadingScreen: ({ onExited }: { onExited?: () => void }) => (
      <RNText testID="send-wait" onPress={() => onExited?.()}>
        wait
      </RNText>
    ),
  };
});

/** Every engagement the sheet publishes, in order. */
const chromeClaims: boolean[] = [];

jest.mock('../../contexts/TaskChromeContext', () => ({
  useTaskChromeClaim: () => (engaged: boolean) => {
    chromeClaims.push(engaged);
  },
}));

/** Every `visible` the sheet has been given, in render order. */
const sheetVisible: boolean[] = [];

jest.mock('../BottomSheetContainer', () => ({
  BottomSheetContainer: ({
    children,
    headerContent,
    visible,
    onClosed,
  }: {
    children?: React.ReactNode;
    headerContent?: React.ReactNode;
    visible?: boolean;
    onClosed?: () => void;
  }) => {
    const RealReact = require('react');
    sheetVisible.push(!!visible);
    // The real container reports a departure once the exit has played. Firing
    // it on the visible -> false edge is the same event, one frame earlier.
    const wasVisible = RealReact.useRef(visible);
    RealReact.useEffect(() => {
      if (wasVisible.current && !visible) onClosed?.();
      wasVisible.current = visible;
    }, [visible, onClosed]);
    if (!visible) return null;
    return (
      <>
        {headerContent}
        {children}
      </>
    );
  },
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

/** The step's own report that the transfer landed, kept across its unmount. */
let lastConfirmationSuccess: ((txId: string) => void) | null = null;

jest.mock('./StepConfirmation', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    StepConfirmation: ({ onSuccess }: { onSuccess: (txId: string) => void }) => {
      lastConfirmationSuccess = onSuccess;
      return (
        <RNText testID="step-confirmation" onPress={() => onSuccess('tx-1')}>
          confirmation
        </RNText>
      );
    },
  };
});

/** Every props object the receipt has been rendered with. */
const successProps: Record<string, any>[] = [];

jest.mock('../TransactionSuccessScreen', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    TransactionSuccessScreen: (props: Record<string, unknown>) => {
      successProps.push(props);
      return <RNText testID="success-screen">success</RNText>;
    },
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

/** Confirm, then the transaction lands: the hook and the step both report. */
const land = () =>
  act(() => {
    sendController!.land();
    lastConfirmationSuccess!('tx-1');
  });

/** The `entering` / `exiting` last handed to a given step. */
const lastLayout = (key: string) => {
  const entries = layoutByKey.filter(([testID]) => testID === key);
  return entries.length ? entries[entries.length - 1] : undefined;
};

describe('SendSheet', () => {
  beforeEach(() => {
    headerProps.length = 0;
    layoutByKey.length = 0;
    sheetVisible.length = 0;
    chromeClaims.length = 0;
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
    act(() => sendController!.commit());
    land();
    fireEvent.press(screen.getByTestId('send-wait'));

    expect(screen.getByTestId('success-screen')).toBeTruthy();
    // The receipt is not one of the animated steps: floating it in as a block
    // would make the receipt's own content arrive twice.
    expect(lastLayout('send-step-success')).toBeUndefined();
  });
});

/**
 * The passage: confirm hands the screen over, and the sheet leaves as a sheet.
 *
 * DESIGN.md §The wait — "que no se pase a la siguiente screen hasta que la
 * última onda salga de la pantalla … Esto aplica siempre" — and §The receipt,
 * "A send or NFT receipt arrives whole".
 */
describe('SendSheet — the send passage', () => {
  beforeEach(() => {
    headerProps.length = 0;
    layoutByKey.length = 0;
    sheetVisible.length = 0;
    chromeClaims.length = 0;
    mockReduceMotion = false;
  });

  const commit = (onClose = jest.fn()) => {
    const utils = render(
      <SendSheet
        visible
        onClose={onClose}
        tokens={[solToken]}
        blockchain="solana"
        account={account}
      />
    );
    fireEvent.press(screen.getByTestId('step-token-select'));
    fireEvent.press(screen.getByTestId('step-address-amount'));
    // Confirm: the transfer is signed and in flight.
    act(() => sendController!.commit());
    return utils;
  };

  it('closes the sheet and claims the chrome in the same commit', () => {
    commit();
    // The sheet leaves as a sheet, and the home disassembles behind it —
    // simultaneously, because the sheet's backdrop is opaque.
    expect(sheetVisible[sheetVisible.length - 1]).toBe(false);
    expect(chromeClaims[chromeClaims.length - 1]).toBe(true);
    expect(screen.getByTestId('send-wait')).toBeTruthy();
  });

  it('does not mount the receipt until the wait reports it has left', () => {
    commit();
    land();

    // The transaction has landed, but the last wave is still on screen.
    expect(screen.queryByTestId('success-screen')).toBeNull();
    expect(screen.getByTestId('send-wait')).toBeTruthy();

    fireEvent.press(screen.getByTestId('send-wait'));

    expect(screen.queryByTestId('send-wait')).toBeNull();
    expect(screen.getByTestId('success-screen')).toBeTruthy();
  });

  it('does not reset the flow out from under the receipt', () => {
    commit();
    land();
    fireEvent.press(screen.getByTestId('send-wait'));

    // The sheet's own close fired while the task owned the screen. If that
    // departure reset the flow, the receipt would have been torn out.
    expect(screen.getByTestId('success-screen')).toBeTruthy();
    expect(screen.queryByTestId('step-token-select')).toBeNull();
  });

  it('releases the chrome and clears the flow on "view wallet"', () => {
    const onClose = jest.fn();
    const { rerender } = commit(onClose);
    land();
    fireEvent.press(screen.getByTestId('send-wait'));

    act(() => successProps[successProps.length - 1].onContinue());
    expect(onClose).toHaveBeenCalled();

    // The parent takes the sheet away; that is the flow ending.
    rerender(
      <SendSheet
        visible={false}
        onClose={onClose}
        tokens={[solToken]}
        blockchain="solana"
        account={account}
      />
    );

    expect(chromeClaims[chromeClaims.length - 1]).toBe(false);
    expect(screen.queryByTestId('success-screen')).toBeNull();
    expect(mockSendHookReset).toHaveBeenCalled();
  });
});
