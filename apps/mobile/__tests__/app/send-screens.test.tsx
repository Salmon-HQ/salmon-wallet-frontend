/**
 * The send flow as four screens (spec 018) — what each screen owns.
 *
 * Three risks, and nothing else: the two validation states that gate Continue
 * (04A and 04B), the shortcut arithmetic on the amount screen, and the guard
 * that keeps a watch-only wallet out of a flow it cannot sign in. The transfer
 * itself is `useSendTransaction`'s, tested where it lives.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockRouter = { back: jest.fn(), push: jest.fn(), replace: jest.fn() };

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
  activeBlockchainAccount: { getReceiveAddress: () => 'Sender1111111111111111111111111111111111111' },
};

let mockIsWatchOnly = false;

const mockFlow = {
  blockchain: 'solana',
  networkId: 'solana-mainnet',
  account: { getReceiveAddress: () => 'Sender1111111111111111111111111111111111111' },
  tokens: [] as unknown[],
  tokensLoading: false,
  showUnverifiedTokens: false,
  token: { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9 },
  setToken: jest.fn(),
  liveBalance: 2.5,
  nativeBalance: 2.5,
  recipient: { address: 'Dest111111111111111111111111111111111111111' },
  setRecipient: jest.fn(),
  amount: '',
  setAmount: jest.fn(),
  sendHook: { status: 'idle', settling: false, error: null, feeEstimateFailed: false, reset: jest.fn(), estimateFee: jest.fn(), sendTransaction: jest.fn() },
  txId: null,
  submit: jest.fn(),
  reset: jest.fn(),
};

jest.mock('expo-router', () => {
  const ReactActual = require('react');
  const Screen = () => null;
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  Stack.Screen = Screen;
  return { Stack, useRouter: () => mockRouter };
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
  // The components barrel is imported whole, so exports that have nothing to
  // do with these screens still have to exist.
  ...jest.requireActual('../../../../packages/shared/src/motion/crest'),
  SOL_CONSTANTS: { ADDRESS: 'So11111111111111111111111111111111111111112' },
  formatTokenAmount: (value: number) => String(value),
  sanitizeDecimalInput: (value: string) => value,
  getShortAddress: (value: string) => (value ? `${value.slice(0, 4)}…${value.slice(-4)}` : null),
  chunkAddress: (value: string) => value,
  tabularNums: { native: { fontVariant: ['tabular-nums'] } },
  isWatchOnlyAccount: () => mockIsWatchOnly,
  useAccountsContext: () => [mockAccountState, {}],
  useAddressValidation: () => mockValidation,
  useSendContacts: () => ({
    contacts: [{ name: 'Ana', address: 'Contact11111111111111111111111111111111111', networkName: 'Solana', blockchain: 'solana' }],
    ownWallets: [],
    isLoading: false,
  }),
  useTransactions: () => ({ transactions: [] }),
  useCurrencyContext: () => [{ currency: 'usd' }, { formatPrecise: (v: number) => String(v) }],
  useWaitExit: (active: boolean) => ({ held: active, onExited: jest.fn() }),
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
jest.mock('../../src/components/QRScanner', () => ({ QRScanner: () => null }));
jest.mock('../../src/components/BottomSheetContainer', () => ({
  BottomSheetContainer: ({ visible, children }: { visible: boolean; children?: React.ReactNode }) =>
    visible ? children : null,
}));
jest.mock('../../src/components/Send/TokenSelectList', () => ({ TokenSelectList: () => null }));

jest.mock('../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 0, scrollBottomPadding: 0, insets: { top: 0, bottom: 0 } }),
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
  mockFlow.liveBalance = 2.5;
  mockFlow.nativeBalance = 2.5;
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
    expect(screen.getByTestId('send-continue-button').props.accessibilityState.disabled).toBe(false);
  });

  it('holds Continue while the validator is still deciding', () => {
    mockValidation = { ...mockValidation, validationState: 'loading', isValidating: true, isValid: true };

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

    render(<SendRecipientScreen />);
    fireEvent.changeText(screen.getByTestId('send-recipient-input'), '  Dest1  ');
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
});
