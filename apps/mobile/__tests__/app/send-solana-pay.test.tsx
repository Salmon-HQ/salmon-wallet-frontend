/**
 * The Send recipient screen opens a Solana Pay transaction request (spec 043
 * T034): scanned or pasted, the merchant flow mounts over the screen; its
 * receipt closes Send, its cancel leaves an empty field. A transfer request
 * still starts the locked review it always did.
 *
 * The merchant flow itself is `useSolanaPayTransactionRequest`'s, tested in
 * shared; here it is a stand-in that records what the screen handed it.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

const mockRouter = { back: jest.fn(), push: jest.fn(), replace: jest.fn() };
const mockReadSettledPaymentLink = jest.fn();
const mockStartFromRequest = jest.fn();
const mockAccount = { getReceiveAddress: () => 'Sender1111111111111111111111111111111111111' };
const LINK = { url: 'https://merchant.example/pay', host: 'merchant.example' };
let mockFlowAccount: unknown = mockAccount;

let mockScanHandler: ((result: unknown) => void) | null = null;
let mockScannerProps: Record<string, unknown> = {};
let mockMerchantProps: {
  link: unknown;
  account: unknown;
  onDone: () => void;
  onCancel: () => void;
} | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@salmon/shared', () => ({
  readSettledPaymentLink: (...args: unknown[]) => mockReadSettledPaymentLink(...args),
  formatTokenAmount: (value: number) => String(value),
  getShortAddress: (value: string) => value,
  s: (value: number) => value,
  vs: (value: number) => value,
  spacing: { sm: 8 },
  useAddressValidation: () => ({
    validationState: 'idle',
    isValidating: false,
    isValid: false,
    resolvedAddress: null,
    message: null,
    messageType: null,
  }),
  useValidationDirty: () => ({ dirty: false, markDirty: () => undefined }),
  // The real hook, from its own file: it only depends on React.
  useSettledPaymentLink: jest.requireActual(
    '../../../../packages/shared/src/hooks/useSettledPaymentLink'
  ).useSettledPaymentLink,
  useRecipientOptions: () => ({
    recents: [],
    contactRows: [],
    walletRows: [],
    recipientFor: (address: string) => ({ address }),
  }),
  useSendContacts: () => ({ contacts: [], ownWallets: [] }),
  useTransactions: () => ({ transactions: [], loading: false }),
}));

jest.mock('../../src/components', () => {
  const ReactActual = require('react');
  const { TextInput, View } = require('react-native');
  const Pass = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(View, null, children);
  return {
    IconBubble: () => null,
    ListRow: () => null,
    PrimaryButton: () => null,
    SectionLabel: () => null,
    SkeletonRow: () => null,
    TokenLogo: () => null,
    TokenPickerSheet: () => null,
    WarningNotice: ({ title, testID }: { title: string; testID?: string }) =>
      ReactActual.createElement(View, { testID, accessibilityLabel: title }),
    SettingsScreenLayout: ({ children }: { children?: React.ReactNode }) =>
      ReactActual.createElement(Pass, null, children),
    RecipientInput: ({
      value,
      onChangeText,
    }: {
      value: string;
      onChangeText: (text: string) => void;
    }) =>
      ReactActual.createElement(TextInput, {
        testID: 'send-recipient-input',
        value,
        onChangeText,
      }),
    QRScanner: (props: Record<string, unknown>) => {
      mockScannerProps = props;
      mockScanHandler = props.onScan as typeof mockScanHandler;
      return null;
    },
    SolanaPayRequest: (props: NonNullable<typeof mockMerchantProps>) => {
      mockMerchantProps = props;
      return ReactActual.createElement(View, { testID: 'solana-pay-request' });
    },
  };
});

jest.mock('../../src/contexts/SendFlowContext', () => ({
  useSendFlow: () => ({
    account: mockFlowAccount,
    blockchain: 'solana',
    networkId: 'solana-mainnet',
    recipient: null,
    setRecipient: jest.fn(),
    token: null,
    setToken: jest.fn(),
    tokens: [],
    tokensLoading: false,
    liveBalance: 0,
    startFromRequest: (...args: unknown[]) => mockStartFromRequest(...args),
  }),
}));
jest.mock('../../src/icons', () => ({ CaretRightIcon: () => null, iconSize: { md: 16 } }));
jest.mock('../../src/theme/useThemedStyles', () => ({
  useSemantic: () => ({ text: { tertiary: '#888' } }),
}));
jest.mock('../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ screenActionBottomPadding: 0 }),
}));
jest.mock('../../hooks/useKeyboardHeight', () => ({ useKeyboardHeight: () => 0 }));

import SendRecipientScreen from '../../app/(app)/send/index';

const field = () => screen.getByTestId('send-recipient-input');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockScanHandler = null;
  mockScannerProps = {};
  mockMerchantProps = null;
  mockFlowAccount = mockAccount;
});
afterEach(() => jest.useRealTimers());

describe('the Send recipient screen — a Solana Pay transaction request', () => {
  it('is the one scanner that accepts merchant links', () => {
    render(<SendRecipientScreen />);
    expect(mockScannerProps.acceptTransactionRequests).toBe(true);
    expect(screen.queryByTestId('solana-pay-request')).toBeNull();
  });

  it('a scanned one opens the merchant flow for the active account', () => {
    render(<SendRecipientScreen />);
    act(() =>
      mockScanHandler?.({
        data: 'solana:https://merchant.example/pay',
        address: '',
        transactionRequest: LINK,
      })
    );
    expect(screen.getByTestId('solana-pay-request')).toBeTruthy();
    expect(mockMerchantProps?.link).toEqual(LINK);
    expect(mockMerchantProps?.account).toBe(mockAccount);
    expect(mockStartFromRequest).not.toHaveBeenCalled();
  });

  // The flow refuses an account that cannot pay and says so; the screen must
  // not swallow the scan by rendering nothing.
  it('opens the merchant flow even without an active account, so it can say why', () => {
    mockFlowAccount = null;
    render(<SendRecipientScreen />);
    act(() => mockScanHandler?.({ data: 'x', address: '', transactionRequest: LINK }));
    expect(screen.getByTestId('solana-pay-request')).toBeTruthy();
    expect(mockMerchantProps?.account).toBeNull();
  });

  it('a pasted one opens the merchant flow and clears the field', () => {
    mockReadSettledPaymentLink.mockReturnValue({ kind: 'transactionRequest', link: LINK });
    render(<SendRecipientScreen />);
    fireEvent.changeText(field(), 'solana:https://merchant.example/pay');
    act(() => jest.advanceTimersByTime(400));
    expect(mockMerchantProps?.link).toEqual(LINK);
    expect(field().props.value).toBe('');
  });

  it('the receipt closes Send', () => {
    render(<SendRecipientScreen />);
    act(() => mockScanHandler?.({ data: 'x', address: '', transactionRequest: LINK }));
    act(() => mockMerchantProps?.onDone());
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('a cancel returns to an empty recipient field', () => {
    render(<SendRecipientScreen />);
    act(() => mockScanHandler?.({ data: 'x', address: '', transactionRequest: LINK }));
    act(() => mockMerchantProps?.onCancel());
    expect(screen.queryByTestId('solana-pay-request')).toBeNull();
    expect(field().props.value).toBe('');
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('a transfer request still opens the locked review', () => {
    mockStartFromRequest.mockReturnValue({ ok: true, next: 'review' });
    const request = { recipient: 'Dest1', amount: '1', references: [] };
    render(<SendRecipientScreen />);
    act(() => mockScanHandler?.({ data: 'solana:Dest1?amount=1', address: 'Dest1', request }));
    expect(mockStartFromRequest).toHaveBeenCalledWith(request, []);
    expect(mockRouter.push).toHaveBeenCalledWith('/send/review');
    expect(screen.queryByTestId('solana-pay-request')).toBeNull();
  });
});
