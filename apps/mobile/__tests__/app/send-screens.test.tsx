/**
 * The send flow as four screens (spec 018) — what each screen owns.
 *
 * Three risks, and nothing else: the two validation states that gate Continue
 * (04A and 04B), the shortcut arithmetic on the amount screen, and the guard
 * that keeps a watch-only wallet out of a flow it cannot sign in. The transfer
 * itself is `useSendTransaction`'s, tested where it lives.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

const mockRouter = { back: jest.fn(), push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() };

/** What `useAddressValidation` reports. Reset per case. */
let mockValidation = {
  validationState: 'idle' as string,
  isValidating: false,
  isValid: false,
  resolvedAddress: null as string | null,
  message: null as string | null,
  messageType: null as 'error' | 'warning' | null,
};

let mockAccountState: Record<string, unknown> = {
  ready: true,
  locked: false,
  networkId: 'solana-mainnet',
  activeAccount: { id: 'a1' },
  activeBlockchainAccount: {
    getReceiveAddress: () => 'Sender1111111111111111111111111111111111111',
  },
};

let mockIsWatchOnly = false;

/** The two tokens the picker stub offers — SOL (the default) and a USDC
 * whose balance is deliberately under what the review tests will type, so
 * switching to it is the one that has to bounce back to the amount screen. */
const SOL_TOKEN = {
  address: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  uiAmount: 2.5,
};
const USDC_TOKEN = {
  address: 'Usdc11111111111111111111111111111111111111',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  uiAmount: 1,
};

/** The last props the send layout handed the wave wait. */
let waitProps: { visible: boolean } | null = null;

// The wait's own entry and exit have their own suite; what this one asserts is
// the RENDER CONDITION around it — that the layout keeps it rendered while it
// leaves, rather than unmounting it mid-wave (spec 031 §4).
/** The classifier the recipient screen runs on pasted text, scripted per test. */
const mockReadSettledPaymentLink = jest.fn<unknown, [string, string]>();

jest.mock('../../src/components', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    ...jest.requireActual('../../src/components'),
    LoadingScreen: (props: { visible: boolean }) => {
      waitProps = props;
      return ReactActual.createElement(View, { testID: 'send-wait' });
    },
  };
});

const mockFlow = {
  blockchain: 'solana',
  networkId: 'solana-mainnet',
  account: { getReceiveAddress: () => 'Sender1111111111111111111111111111111111111' },
  tokens: [SOL_TOKEN, USDC_TOKEN] as unknown[],
  tokensLoading: false,
  showUnverifiedTokens: false,
  token: SOL_TOKEN as unknown,
  setToken: jest.fn(),
  liveBalance: 2.5,
  nativeBalance: 2.5,
  recipient: { address: 'Dest111111111111111111111111111111111111111' },
  setRecipient: jest.fn(),
  amount: '',
  setAmount: jest.fn(),
  sendHook: {
    status: 'idle',
    settling: false,
    error: null,
    feeEstimateFailed: false,
    reset: jest.fn(),
    estimateFee: jest.fn(),
    sendTransaction: jest.fn(),
  },
  estimatedFee: null as string | null,
  estimateFee: jest.fn(),
  txId: null,
  submit: jest.fn(),
  reset: jest.fn(),
  request: null as unknown,
  startFromRequest: jest.fn(),
  clearRequest: jest.fn(),
};

/** The last `onScan` the recipient screen handed the scanner, and whether it was up. */
let scanHandler: ((result: unknown) => void) | null = null;
let scannerVisible = false;
const mockSearchParams: { scan?: string } = {};

jest.mock('expo-router', () => {
  const ReactActual = require('react');
  const Screen = () => null;
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  Stack.Screen = Screen;
  return { Stack, useRouter: () => mockRouter, useLocalSearchParams: () => mockSearchParams };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('react-i18next', () => {
  const dictionary = require('../../../../packages/shared/src/locales/en/translation.json');
  const resolve = (key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as never)?.[part], dictionary);
  return {
    useTranslation: () => ({
      t: (key: string, fallback?: string) => (resolve(key) as string) ?? fallback ?? key,
    }),
  };
});

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../test-utils/themeTokens'),
  ...jest.requireActual('../../../../packages/shared/src/utils/sol-fees'),
  ...jest.requireActual('../../../../packages/shared/src/utils/send-failure-report'),
  // What the review shows about a payment request is real: the suite pins it.
  ...jest.requireActual('../../../../packages/shared/src/utils/sendRequestReview'),
  readSettledPaymentLink: (raw: string, chain: string) => mockReadSettledPaymentLink(raw, chain),
  // The components barrel is imported whole, so exports that have nothing to
  // do with these screens still have to exist.
  ...jest.requireActual('../../../../packages/shared/src/motion/crest'),
  // The recipient groups are real: recents, address book and own wallets.
  ...jest.requireActual('../../../../packages/shared/src/utils/recipientOptions'),
  // The balance fills are real: the suite exercises their truncation.
  ...jest.requireActual('../../../../packages/shared/src/hooks/useAmountShortcuts'),
  // The derivations both twins render are real: the commit state (over the
  // real wait exit) and the recipient groups.
  ...jest.requireActual('../../../../packages/shared/src/hooks/useSendCommitState'),
  ...jest.requireActual('../../../../packages/shared/src/hooks/useRecipientOptions'),
  ...jest.requireActual('../../../../packages/shared/src/hooks/useDeferredFeeEstimate'),
  ...jest.requireActual('../../../../packages/shared/src/utils/sendReceiptRows'),
  useFiatLine: (amount: string, price?: number) =>
    `≈ ${String((parseFloat(amount) || 0) * (price ?? 0))} USD`,
  SOL_CONSTANTS: { ADDRESS: 'So11111111111111111111111111111111111111112' },
  formatTokenAmount: (value: number) => String(value),
  sanitizeDecimalInput: (value: string) => value,
  getShortAddress: (value: string) => (value ? `${value.slice(0, 4)}…${value.slice(-4)}` : null),
  chunkAddress: (value: string) => value,
  tabularNums: { native: { fontVariant: ['tabular-nums'] } },
  isWatchOnlyAccount: () => mockIsWatchOnly,
  useAccountsContext: () => [mockAccountState, {}],
  useAddressValidation: () => mockValidation,
  // Real hook: `dirty` starts false and is set on each edit, so a screen that
  // gates Continue on `!dirty` behaves here exactly as it does shipped.
  // Faithful to the real hook (packages/shared/src/hooks/useValidationDirty.ts):
  // dirty is set on every edit and cleared only when a validation cycle
  // actually completes. Reproduced rather than imported because requireActual
  // pulls the whole barrel, which this jest config cannot load.
  useValidationDirty: (isValidating: boolean) => {
    const React = require('react');
    const [dirty, setDirty] = React.useState(false);
    const wasValidating = React.useRef(false);
    React.useEffect(() => {
      if (wasValidating.current && !isValidating) setDirty(false);
      wasValidating.current = isValidating;
    }, [isValidating]);
    return { dirty, markDirty: React.useCallback(() => setDirty(true), []) };
  },
  // The real hook, loaded from its own file rather than the barrel (which this
  // jest config cannot load). It only depends on React.
  useSettledPaymentLink: jest.requireActual(
    '../../../../packages/shared/src/hooks/useSettledPaymentLink'
  ).useSettledPaymentLink,
  useSendContacts: () => ({
    contacts: [
      {
        name: 'Ana',
        address: 'Contact11111111111111111111111111111111111',
        networkName: 'Solana',
        blockchain: 'solana',
      },
    ],
    ownWallets: [],
    isLoading: false,
  }),
  useTransactions: () => ({ transactions: [] }),
  useCurrencyContext: () => [{ currency: 'usd' }, { formatPrecise: (v: number) => String(v) }],
  // The REAL hook. Stubbed as `held === active` it collapsed the very
  // distinction the wait's exit is built on — "committed" against "committed,
  // or still leaving" — so a wait that was cut instead of left looked
  // identical to one that left properly (spec 031 §4).
  useWaitExit: jest.requireActual('@salmon/shared/src/hooks/useWaitExit').useWaitExit,
  useBalance: () => ({ tokens: [], loading: false }),
  useSendTransaction: () => mockFlow.sendHook,
  getBlockchainFromNetworkId: () => 'solana',
}));

jest.mock('../../src/contexts/SendFlowContext', () => ({
  SendFlowProvider: ({ children }: { children: React.ReactNode }) => children,
  useSendFlow: () => mockFlow,
}));

jest.mock('../../src/components/DepthBackground', () => ({ DepthBackground: () => null }));
jest.mock('../../src/components/ScalesBackground', () => ({ ScalesBackground: () => null }));
jest.mock('../../src/components/QRScanner', () => ({
  QRScanner: ({ onScan, visible }: { onScan: (result: unknown) => void; visible: boolean }) => {
    scanHandler = onScan;
    scannerVisible = visible;
    return null;
  },
}));
jest.mock('../../src/components/BottomSheetContainer', () => ({
  BottomSheetContainer: ({
    visible,
    children,
  }: {
    visible: boolean;
    children?: React.ReactNode;
  }) => (visible ? children : null),
}));
// A working stub, not a null one: the picker sheet's only job worth testing
// here is that a tap on one of its rows reaches `onSelectToken`.
jest.mock('../../src/components/TokenSelectList', () => {
  const ReactActual = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    TokenSelectList: ({
      tokens,
      onSelectToken,
    }: {
      tokens: Array<{ address: string; symbol: string }>;
      onSelectToken: (token: unknown) => void;
    }) =>
      ReactActual.createElement(
        ReactActual.Fragment,
        null,
        tokens.map((token) =>
          ReactActual.createElement(
            TouchableOpacity,
            {
              key: token.address,
              testID: `send-token-row-${token.symbol}`,
              onPress: () => onSelectToken(token),
            },
            ReactActual.createElement(Text, null, token.symbol)
          )
        )
      ),
  };
});

jest.mock('../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({
    floatingBottomOffset: 0,
    scrollBottomPadding: 0,
    insets: { top: 0, bottom: 0 },
  }),
}));
jest.mock('../../hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));
jest.mock('../../src/contexts/DeveloperModeContext', () => ({ useDeveloperMode: () => false }));

jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    View,
    Easing: { bezier: () => (value: unknown) => value, linear: (value: unknown) => value },
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    withTiming: (value: unknown) => value,
    withDelay: (_delay: number, value: unknown) => value,
    withSpring: (value: unknown) => value,
    runOnJS: (fn: unknown) => fn,
  };
});

import SendRecipientScreen from '../../app/(app)/send/index';
import SendAmountScreen from '../../app/(app)/send/amount';
import SendReviewScreen from '../../app/(app)/send/review';
import SendLayout from '../../app/(app)/send/_layout';

beforeEach(() => {
  jest.clearAllMocks();
  mockIsWatchOnly = false;
  mockValidation = {
    validationState: 'idle',
    isValidating: false,
    isValid: false,
    resolvedAddress: null,
    message: null,
    messageType: null,
  };
  mockFlow.amount = '';
  mockFlow.recipient = { address: 'Dest111111111111111111111111111111111111111' };
  mockFlow.token = SOL_TOKEN;
  mockFlow.tokens = [SOL_TOKEN, USDC_TOKEN];
  mockFlow.liveBalance = 2.5;
  mockFlow.nativeBalance = 2.5;
  mockFlow.estimatedFee = null;
  mockFlow.sendHook.status = 'idle';
  mockFlow.sendHook.settling = false;
  mockFlow.request = null;
  waitProps = null;
  scanHandler = null;
});

/** A scanned USDC request, as the classifier hands it to the screen. */
const scannedRequest = {
  data: 'solana:Dest111111111111111111111111111111111111111?amount=1&spl-token=Usdc11111111111111111111111111111111111111',
  address: 'Dest111111111111111111111111111111111111111',
  amount: '1',
  request: {
    recipient: 'Dest111111111111111111111111111111111111111',
    amount: '1',
    splToken: 'Usdc11111111111111111111111111111111111111',
    references: ['Ref1111111111111111111111111111111111111111'],
    label: 'Café',
    message: 'Table 4',
  },
};

describe('the recipient screen — a scanned payment request (spec 033 US3)', () => {
  it('keeps the scanner down unless asked for', () => {
    render(<SendRecipientScreen />);
    expect(scannerVisible).toBe(false);
  });

  it('opens the scanner at once when Payments sends the user here to pay', () => {
    mockSearchParams.scan = '1';
    render(<SendRecipientScreen />);
    expect(scannerVisible).toBe(true);
    delete mockSearchParams.scan;
  });

  it('a code that only carries an address fills the field, as it always has', () => {
    render(<SendRecipientScreen />);
    act(() => scanHandler?.({ data: 'Dest2', address: 'Dest2' }));
    expect(mockFlow.startFromRequest).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('a request with an amount starts the flow from it and goes straight to review', () => {
    mockFlow.startFromRequest.mockReturnValue({ ok: true, next: 'review' });
    render(<SendRecipientScreen />);
    act(() => scanHandler?.(scannedRequest));
    expect(mockFlow.startFromRequest).toHaveBeenCalledWith(scannedRequest.request, mockFlow.tokens);
    expect(mockRouter.push).toHaveBeenCalledWith('/send/review');
  });

  it('a request without an amount lands on the amount screen', () => {
    mockFlow.startFromRequest.mockReturnValue({ ok: true, next: 'amount' });
    render(<SendRecipientScreen />);
    act(() => scanHandler?.(scannedRequest));
    expect(mockRouter.push).toHaveBeenCalledWith('/send/amount');
  });

  it('a request for a token the account does not hold is refused, and says so', () => {
    mockFlow.startFromRequest.mockReturnValue({ ok: false, reason: 'tokenNotHeld' });
    render(<SendRecipientScreen />);
    act(() => scanHandler?.(scannedRequest));
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(screen.getByTestId('send-request-refused')).toBeTruthy();
    expect(screen.getByText("You don't hold the token this request asks for")).toBeTruthy();
  });
});

describe('the recipient screen — a pasted payment request (spec 033 US3, mobile)', () => {
  const pastedUri =
    'solana:mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN?amount=1&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&reference=11111111111111111111111111111111&label=Caf%C3%A9';

  const pastedRequest = {
    recipient: 'mvines9iiHiQTysrwkJjGf2gb9Ex9jXJX8ns3qwf2kN',
    amount: '1',
    splToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    references: ['11111111111111111111111111111111'],
    label: 'Café',
  };

  beforeEach(() => {
    mockReadSettledPaymentLink.mockReset();
    mockReadSettledPaymentLink.mockImplementation((raw: string) => {
      if (raw === pastedUri) {
        return { kind: 'request', address: pastedRequest.recipient, request: pastedRequest };
      }
      if (raw.startsWith('solana:https')) {
        return { kind: 'error', key: 'send.request.errors.transactionRequest' };
      }
      return { kind: 'error', key: 'send.request.errors.notSolanaPay' };
    });
  });

  // A link is read once the text stops changing, so each case lets it settle.
  const settle = () => act(() => jest.advanceTimersByTime(400));
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('a pasted request starts the flow like a scanned one', () => {
    mockFlow.startFromRequest.mockReturnValue({ ok: true, next: 'review' });
    render(<SendRecipientScreen />);
    fireEvent.changeText(screen.getByTestId('send-recipient-input'), pastedUri);
    settle();
    expect(mockReadSettledPaymentLink).toHaveBeenCalledWith(pastedUri, 'solana');
    expect(mockFlow.startFromRequest).toHaveBeenCalledWith(pastedRequest, mockFlow.tokens);
    expect(mockRouter.push).toHaveBeenCalledWith('/send/review');
  });

  it('a pasted request the wallet cannot read says which part, and starts nothing', () => {
    render(<SendRecipientScreen />);
    fireEvent.changeText(
      screen.getByTestId('send-recipient-input'),
      'solana:https%3A%2F%2Fexample.com%2Fpay'
    );
    settle();
    expect(mockFlow.startFromRequest).not.toHaveBeenCalled();
    expect(screen.getByTestId('send-request-refused')).toBeTruthy();
    expect(screen.getByText('This kind of payment request is not supported yet')).toBeTruthy();
  });

  // Text can arrive a character at a time (a hardware keyboard, the
  // simulator, someone typing). Reading each prefix acted on a half-typed
  // link — a request for 1 on the way to 10, one without its memo yet.
  it('does nothing with a link while it is still arriving, then reads the whole of it', () => {
    mockFlow.startFromRequest.mockReturnValue({ ok: true, next: 'review' });
    render(<SendRecipientScreen />);
    const input = screen.getByTestId('send-recipient-input');
    for (let end = 'solana:'.length; end <= pastedUri.length; end += 1) {
      fireEvent.changeText(input, pastedUri.slice(0, end));
      act(() => jest.advanceTimersByTime(50));
    }
    expect(mockReadSettledPaymentLink).not.toHaveBeenCalled();
    expect(mockFlow.startFromRequest).not.toHaveBeenCalled();

    settle();
    expect(mockReadSettledPaymentLink).toHaveBeenCalledTimes(1);
    expect(mockReadSettledPaymentLink).toHaveBeenCalledWith(pastedUri, 'solana');
    expect(mockRouter.push).toHaveBeenCalledWith('/send/review');
  });

  it('a pasted plain address is still just an address', () => {
    render(<SendRecipientScreen />);
    fireEvent.changeText(screen.getByTestId('send-recipient-input'), 'Dest2');
    expect(mockReadSettledPaymentLink).not.toHaveBeenCalled();
    expect(mockFlow.startFromRequest).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

describe('the review screen — what a payment request locks (spec 033 US3)', () => {
  const lockedRequest = {
    request: scannedRequest.request,
    token: USDC_TOKEN,
    locked: { recipient: true, token: true, amount: true },
  };

  it('shows who asked and what for, and offers no token change', () => {
    mockFlow.request = lockedRequest;
    mockFlow.token = USDC_TOKEN;
    mockFlow.amount = '1';
    mockFlow.liveBalance = 1;
    render(<SendReviewScreen />);
    expect(screen.getByTestId('send-review-requested-by')).toBeTruthy();
    expect(screen.getByText('Café')).toBeTruthy();
    expect(screen.getByTestId('send-review-for')).toBeTruthy();
    expect(screen.getByText('Table 4')).toBeTruthy();
    expect(screen.queryByTestId('send-review-change-token')).toBeNull();
    expect(screen.getByTestId('send-confirm-button').props.accessibilityState.disabled).toBe(false);
  });

  it('a balance under the requested amount blocks the commit and never swaps the token', () => {
    mockFlow.request = lockedRequest;
    mockFlow.token = USDC_TOKEN;
    mockFlow.amount = '1';
    mockFlow.liveBalance = 0.5;
    render(<SendReviewScreen />);
    expect(screen.getByTestId('send-review-insufficient')).toBeTruthy();
    expect(screen.getByTestId('send-confirm-button').props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByTestId('send-review-change-token')).toBeNull();
  });
});

describe('the recipient screen — 04A and 04B', () => {
  it('04A: an address the validator rejects blocks Continue and says why', () => {
    mockValidation = {
      ...mockValidation,
      validationState: 'invalid',
      isValid: false,
      message: 'send.validation.invalid',
      messageType: 'error',
    };

    render(<SendRecipientScreen />);

    expect(screen.getByText('Invalid address format')).toBeTruthy();
    expect(screen.getByTestId('send-continue-button').props.accessibilityState.disabled).toBe(true);
  });

  it('04B: an uninitialised account is informational — Continue stays live', () => {
    mockValidation = {
      ...mockValidation,
      validationState: 'warning',
      isValid: true,
      message: 'send.validation.no_info',
      messageType: 'warning',
    };

    render(<SendRecipientScreen />);

    expect(
      screen.getByText(
        'This account does not exist on-chain yet. The recipient will need to fund it.'
      )
    ).toBeTruthy();
    expect(screen.getByTestId('send-continue-button').props.accessibilityState.disabled).toBe(
      false
    );
  });

  it('holds Continue while the validator is still deciding', () => {
    mockValidation = {
      ...mockValidation,
      validationState: 'loading',
      isValidating: true,
      isValid: true,
    };

    render(<SendRecipientScreen />);

    expect(screen.getByTestId('send-continue-button').props.accessibilityState.disabled).toBe(true);
  });

  it('carries the recipient forward and pushes the amount screen', () => {
    mockValidation = {
      ...mockValidation,
      validationState: 'valid',
      isValid: true,
      resolvedAddress: null,
    };

    const { rerender } = render(<SendRecipientScreen />);
    fireEvent.changeText(screen.getByTestId('send-recipient-input'), '  Dest1  ');

    // Typing marks the verdict stale, and Continue stays shut until a
    // validation cycle actually completes — the validator holds the previous
    // string's verdict through the debounce, so pressing before that carries
    // an unjudged address to the signer. Run the cycle the way the screen
    // sees it: validating, then settled.
    mockValidation = { ...mockValidation, isValidating: true };
    rerender(<SendRecipientScreen />);
    mockValidation = { ...mockValidation, isValidating: false };
    rerender(<SendRecipientScreen />);

    fireEvent.press(screen.getByTestId('send-continue-button'));

    expect(mockFlow.setRecipient).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'Dest1', resolvedAddress: undefined })
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/send/amount');
  });

  it('offers the address book, and a tap fills the field', () => {
    // The suggestions only stand while the field is empty, so this case opens
    // the flow with no recipient carried in from a back gesture.
    mockFlow.recipient = null as never;

    render(<SendRecipientScreen />);

    const row = screen.getByTestId('send-recipient-Contact11111111111111111111111111111111111');
    fireEvent.press(row);

    expect(screen.getByTestId('send-recipient-input').props.value).toBe(
      'Contact11111111111111111111111111111111111'
    );
  });
});

describe('the amount screen — the shortcuts', () => {
  it.each([
    ['25', '0.625'],
    ['50', '1.25'],
    ['75', '1.875'],
    ['max', '2.5'],
  ])('fills %s%% of the live balance, truncated at the token decimals', (key, expected) => {
    render(<SendAmountScreen />);

    fireEvent.press(screen.getByTestId(`send-shortcuts-${key}`));

    expect(mockFlow.setAmount).toHaveBeenCalledWith(expected);
  });

  it('MAX is the whole balance — it has never subtracted a fee', () => {
    render(<SendAmountScreen />);

    fireEvent.press(screen.getByTestId('send-shortcuts-max'));

    expect(mockFlow.setAmount).toHaveBeenCalledWith(String(mockFlow.liveBalance));
  });

  it('keeps Review dead on an empty amount', () => {
    render(<SendAmountScreen />);

    expect(screen.getByTestId('send-review-button').props.accessibilityState.disabled).toBe(true);
  });

  it('keeps Review dead when the amount exceeds the balance', () => {
    mockFlow.amount = '99';

    render(<SendAmountScreen />);

    expect(screen.getByTestId('send-review-button').props.accessibilityState.disabled).toBe(true);
  });

  it('opens Review once the amount is inside the balance', () => {
    mockFlow.amount = '1';

    render(<SendAmountScreen />);

    expect(screen.getByTestId('send-review-button').props.accessibilityState.disabled).toBe(false);
  });

  it('blocks Review when the wallet cannot pay the network fee', () => {
    mockFlow.amount = '0.0001';
    mockFlow.nativeBalance = 0;

    render(<SendAmountScreen />);

    expect(screen.getByText('You need SOL to send')).toBeTruthy();
    expect(screen.getByTestId('send-review-button').props.accessibilityState.disabled).toBe(true);
  });
});

describe('the amount screen — what the frames put on it', () => {
  it('states the balance as a bare row, not inside a card', () => {
    render(<SendAmountScreen />);

    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('2.5 SOL')).toBeTruthy();
    // The token is chosen a screen back now (owner ruling 2026-09-01), so
    // this row is a caption, not a door: no press affordance left on it.
    expect(screen.getByTestId('send-selected-token').props.accessibilityRole).toBeUndefined();
  });

  it('asks the flow for the fee once there is an amount, and draws it beside the arrival', () => {
    jest.useFakeTimers();
    try {
      // No amount, no estimate: pricing an empty amount threw in the chain
      // builder ("number is not integral").
      const { unmount } = render(<SendAmountScreen />);
      jest.runOnlyPendingTimers();
      expect(mockFlow.estimateFee).not.toHaveBeenCalled();
      unmount();

      mockFlow.amount = '1';
      render(<SendAmountScreen />);
      jest.runOnlyPendingTimers();
      expect(mockFlow.estimateFee).toHaveBeenCalled();
      mockFlow.amount = '';
    } finally {
      jest.useRealTimers();
    }

    expect(screen.getByTestId('send-amount-fee')).toBeTruthy();
    expect(screen.getByText('Network Fee')).toBeTruthy();
    expect(screen.getByText('Estimated arrival')).toBeTruthy();
    expect(screen.getByText('A few seconds')).toBeTruthy();
    // Nothing estimated yet reads as a dash, never as a zero fee.
    expect(screen.getByTestId('send-amount-network-fee')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('shows the estimate the flow is holding', () => {
    mockFlow.estimatedFee = '0.000005 SOL';

    render(<SendAmountScreen />);

    expect(screen.getByText('~0.000005 SOL')).toBeTruthy();
  });
});

describe('token choice — first screen, changeable on Review', () => {
  it('a token picked on the recipient screen reaches the flow', () => {
    render(<SendRecipientScreen />);

    fireEvent.press(screen.getByTestId('send-selected-token'));
    fireEvent.press(screen.getByTestId('send-token-row-USDC'));

    expect(mockFlow.setToken).toHaveBeenCalledWith(USDC_TOKEN);
  });

  it('the amount screen reads whatever token the flow is holding, read-only', () => {
    mockFlow.token = USDC_TOKEN;
    mockFlow.liveBalance = 1;

    render(<SendAmountScreen />);

    expect(screen.getByText('1 USDC')).toBeTruthy();
    expect(screen.getByTestId('send-selected-token').props.accessibilityRole).toBeUndefined();
  });

  it('review keeps the amount and the token in sync when the new one still covers it', () => {
    mockFlow.amount = '0.5';

    render(<SendReviewScreen />);

    fireEvent.press(screen.getByTestId('send-review-change-token'));
    fireEvent.press(screen.getByTestId('send-token-row-USDC'));

    expect(mockFlow.setToken).toHaveBeenCalledWith(USDC_TOKEN);
    // USDC's own balance (1) still covers 0.5 — nothing to fix on the amount
    // screen, so Review stays put.
    expect(mockRouter.dismissTo).not.toHaveBeenCalledWith('/send/amount');
  });

  it('changing the token on Review to one that cannot cover the amount goes back to amount', () => {
    mockFlow.amount = '5';

    render(<SendReviewScreen />);

    fireEvent.press(screen.getByTestId('send-review-change-token'));
    fireEvent.press(screen.getByTestId('send-token-row-USDC'));

    expect(mockFlow.setToken).toHaveBeenCalledWith(USDC_TOKEN);
    // USDC's balance is 1, the typed amount is 5 — the flow cannot fix
    // that on Review, so it sends the user back to fix it where it can.
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/send/amount');
  });
});

describe('the route guard', () => {
  it('turns a watch-only wallet away from the flow', () => {
    mockIsWatchOnly = true;

    render(<SendLayout />);

    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('lets a signing wallet in', () => {
    render(<SendLayout />);

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  /**
   * A wait is LEFT, never cut — whatever ends it (spec 031 §4).
   *
   * The render condition used to be `isCommitted || (isWaveHeld && !!txId)`,
   * which on a failure went false in the same render `isCommitted` did: the
   * wait was unmounted outright, `visible={false}` was never committed, the
   * exit effect never ran, the front was cut mid-crossing, and `onExited`
   * never fired — so `useWaitExit` stayed held for the life of the flow and a
   * retry entered on stale state.
   */
  it('lets the wait leave when a send fails, instead of cutting it', () => {
    mockFlow.sendHook.status = 'sending';
    const { rerender } = render(<SendLayout />);

    expect(waitProps).toEqual(expect.objectContaining({ visible: true }));

    // The send fails: no txId, and the flow drops back to its own surface.
    mockFlow.sendHook.status = 'failed';
    waitProps = null;
    rerender(<SendLayout />);

    // Still rendered, now leaving. `visible={false}` is what STARTS the exit,
    // so it has to be committed — unmounting here cut the wave instead, and
    // `onExited` never came back to unstick the hook.
    expect(waitProps).toEqual(expect.objectContaining({ visible: false }));
  });
});
