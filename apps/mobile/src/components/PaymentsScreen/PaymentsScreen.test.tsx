/**
 * The mobile twin renders what the shared hook composes: the form, the empty
 * state, the rows with their state, and the sheet when a request is open.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
  ...jest.requireActual('@salmon/shared/src/types/ui/key-value-row'),
  ...jest.requireActual('@salmon/shared/src/hooks/useFieldFocus'),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-native-reanimated', () => {
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RNView,
      createAnimatedComponent: (component: unknown) => component,
    },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
    Easing: { bezier: (...coefficients: number[]) => coefficients },
  };
});

import type { PaymentsActionBinding } from '@salmon/shared/powerups';

const bubble = { size: 36, iconWeight: 'bold', iconSize: 18 } as const;

const mockLogic = {
  actions: {
    title: 'Requests',
    ask: {
      onPress: jest.fn(),
      accessibilityLabel: 'Ask for a payment',
      testID: 'payments-ask-button',
      ...bubble,
      tone: 'accent',
    },
    pay: {
      onPress: jest.fn(),
      accessibilityLabel: 'Pay a request',
      testID: 'payments-pay-button',
      ...bubble,
      tone: 'outline',
    } as PaymentsActionBinding | null,
    history: null,
  },
  ask: {
    visible: false,
    onClose: jest.fn(),
    title: 'New request',
    form: {
      amountLabel: 'Amount in USDC',
      amountCard: { value: '', onChangeValue: jest.fn(), placeholder: '0', subtext: '≈ 0.00 USD' },
      noteLabel: 'Note',
      noteField: { value: '', onChangeText: jest.fn(), placeholder: 'note', maxLength: 80 },
      expiryLabel: 'Open for',
      expiryChips: {
        options: [
          { key: 'h1', label: '1 hour' },
          { key: 'h24', label: '24 hours' },
        ],
        value: 'h24',
        onChange: jest.fn(),
        size: 'md',
        fill: true,
        variant: 'outline',
      },
      createButton: { onPress: jest.fn(), disabled: true, loading: false, label: 'Create request' },
    },
  },
  list: {
    title: 'Requests',
    empty: { title: 'No requests yet', body: 'Type an amount' },
    rows: [],
  },
  sheet: {
    visible: false,
    onClose: jest.fn(),
    title: 'Payment request',
    uri: '',
    showCode: false,
    amountLabel: '',
    status: null,
    copyButton: { onPress: jest.fn(), label: 'Copy' },
    shareLabel: 'Share',
    removeButton: { onPress: jest.fn(), label: 'Remove' },
  },
  unavailable: null as string | null,
  requests: [],
  open: null,
  openUri: '',
};

jest.mock('@salmon/shared/powerups', () => ({
  usePaymentsScreenLogic: () => mockLogic,
}));
jest.mock('../BottomSheetContainer', () => {
  const ReactActual = require('react');
  const { View, Text } = require('react-native');
  return {
    BottomSheetContainer: ({
      visible,
      children,
    }: {
      visible: boolean;
      children: React.ReactNode;
    }) => (visible ? ReactActual.createElement(View, { testID: 'sheet' }, children) : null),
    SheetTitle: ({ children }: { children: string }) =>
      ReactActual.createElement(Text, null, children),
  };
});
jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ spaciousContentBottomPadding: 0 }),
}));
jest.mock('../QRCode', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return (props: Record<string, unknown>) =>
    ReactActual.createElement(View, { ...props, testID: 'qr' });
});
jest.mock('../Thermocline', () => ({ Thermocline: () => null }));

import { PaymentsScreen } from './PaymentsScreen';

afterEach(() => {
  mockLogic.unavailable = null;
  mockLogic.list.rows = [];
  mockLogic.ask.visible = false;
  mockLogic.sheet.visible = false;
  mockLogic.actions.pay = {
    onPress: jest.fn(),
    accessibilityLabel: 'Pay a request',
    testID: 'payments-pay-button',
    ...bubble,
    tone: 'outline',
  };
});

const renderScreen = () => render(<PaymentsScreen publicKey="8xyz" networkId="solana-devnet" />);

describe('PaymentsScreen', () => {
  it('renders the two actions over the empty list, and no form', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('payments-ask-button'));
    expect(mockLogic.actions.ask.onPress).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('payments-pay-button'));
    expect(mockLogic.actions.pay?.onPress).toHaveBeenCalled();
    expect(screen.getByTestId('payments-empty')).toBeTruthy();
    expect(screen.queryByTestId('payments-amount')).toBeNull();
    expect(screen.queryByTestId('sheet')).toBeNull();
  });

  it('hides Pay when the hook offers none', () => {
    mockLogic.actions.pay = null;
    renderScreen();
    expect(screen.getByTestId('payments-ask-button')).toBeTruthy();
    expect(screen.queryByTestId('payments-pay-button')).toBeNull();
  });

  it('draws the form inside the ask sheet when it is open', () => {
    mockLogic.ask.visible = true;
    renderScreen();
    expect(screen.getByTestId('payments-amount')).toBeTruthy();
    expect(screen.getByTestId('payments-note')).toBeTruthy();
    expect(screen.getByTestId('payments-expiry')).toBeTruthy();
    expect(screen.getByTestId('payments-create')).toBeTruthy();
  });

  it('shows the unavailable state instead of the actions', () => {
    mockLogic.unavailable = 'USDC is not here';
    renderScreen();
    expect(screen.getByTestId('payments-unavailable')).toBeTruthy();
    expect(screen.queryByTestId('payments-ask-button')).toBeNull();
  });

  it('renders rows with their state and opens one on press', () => {
    const open = jest.fn();
    mockLogic.list.rows = [
      {
        id: 'pr_1',
        state: 'paid',
        listRow: {
          title: '12.50 USDC',
          subtitle: 'Table 4',
          padding: 'lg',
          accessibilityRole: 'button',
          onPress: open,
        },
        trailing: { label: '', value: 'Paid', valueTone: 'success' },
        bubble: { size: 40, shape: 'rounded', tone: 'accent-tint', iconWeight: 'bold' },
      },
    ] as never;
    renderScreen();
    expect(screen.getByText('12.50 USDC')).toBeTruthy();
    expect(screen.getByText('Paid')).toBeTruthy();
    fireEvent.press(screen.getByTestId('payments-row-pr_1'));
    expect(open).toHaveBeenCalled();
  });

  it('draws the sheet with the code, the facts and the controls when open', () => {
    mockLogic.sheet.visible = true;
    mockLogic.sheet.showCode = true;
    mockLogic.sheet.uri = 'solana:abc?amount=1';
    mockLogic.sheet.amountLabel = '1.00 USDC';
    mockLogic.sheet.status = {
      state: 'pending',
      rows: [{ key: 'status', label: 'Status', value: 'Waiting' }],
      checkFailed: false,
    } as never;
    renderScreen();
    expect(screen.getByTestId('qr').props.value).toBe('solana:abc?amount=1');
    expect(screen.getByText('1.00 USDC')).toBeTruthy();
    expect(screen.getByText('Waiting')).toBeTruthy();
    expect(screen.queryByTestId('payments-sheet-copy')).toBeNull();
    expect(screen.getByTestId('payments-sheet-share')).toBeTruthy();
    fireEvent.press(screen.getByTestId('payments-sheet-remove'));
    expect(mockLogic.sheet.removeButton.onPress).toHaveBeenCalled();
  });
});
