/**
 * The mobile twin renders what the shared hook composes: the two token rows,
 * the amount with its fills, the error, and the unavailable state in place of
 * the form.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
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
jest.mock('../TokenPickerSheet', () => ({
  TokenPickerSheet: ({ visible, testID }: { visible: boolean; testID?: string }) => {
    const { View } = require('react-native');
    return visible ? <View testID={`${testID}-open`} /> : null;
  },
}));
jest.mock('../../icons', () => ({
  CaretRightIcon: () => null,
  iconSize: { md: 16 },
}));
jest.mock('../WarningNotice', () => ({
  WarningNotice: ({ title, testID }: { title: string; testID?: string }) => {
    const { Text, View } = require('react-native');
    return (
      <View testID={testID}>
        <Text>{title}</Text>
      </View>
    );
  },
}));

const mockLogic = {
  pay: {
    token: { address: 'sol', symbol: 'SOL', name: 'Solana', uiAmount: 2, decimals: 9 },
    tokens: [{ address: 'sol', symbol: 'SOL', name: 'Solana', uiAmount: 2, decimals: 9 }],
    loading: false,
    pickerOpen: false,
    openPicker: jest.fn(),
    closePicker: jest.fn(),
    select: jest.fn(),
    subtitle: '2 SOL available',
  },
  receive: {
    token: { address: 'usdc', symbol: 'USDC', name: 'USD Coin', uiAmount: 0, decimals: 6 },
    tokens: [],
    loading: false,
    pickerOpen: false,
    openPicker: jest.fn(),
    closePicker: jest.fn(),
    select: jest.fn(),
    subtitle: 'USD Coin',
  },
  amount: '1',
  shortcuts: {
    options: [{ key: 'max', label: 'Max' }],
    selected: '',
    select: jest.fn(),
    onAmountChange: jest.fn(),
  },
  fiatLine: '≈ 120.00 USD',
  canSubmit: true,
  isConfirming: false,
  error: null as string | null,
  blocker: null as string | { key: string; params: Record<string, string> } | null,
  unavailable: null as 'region' | 'wallet' | null,
  submit: jest.fn(),
};
jest.mock('@salmon/shared/powerups', () => ({
  ...jest.requireActual('@salmon/shared/src/powerups/swap/view'),
  useSwapScreenLogic: () => mockLogic,
}));

import { SwapScreen } from './SwapScreen';

describe('SwapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogic.error = null;
    mockLogic.unavailable = null;
    mockLogic.blocker = null;
    mockLogic.pay.tokens = [mockLogic.pay.token];
    mockLogic.pay.loading = false;
    mockLogic.pay.pickerOpen = false;
  });

  it('draws both token rows, the amount and the review control, from the hook', () => {
    render(<SwapScreen publicKey="pk" networkId="solana-mainnet" />);
    expect(screen.getByText('2 SOL available')).toBeTruthy();
    expect(screen.getByText('USD Coin')).toBeTruthy();
    expect(screen.getByText('≈ 120.00 USD')).toBeTruthy();
    fireEvent.press(screen.getByTestId('swap-pay-token'));
    expect(mockLogic.pay.openPicker).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('swap-receive-token'));
    expect(mockLogic.receive.openPicker).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('swap-submit-button'));
    expect(mockLogic.submit).toHaveBeenCalled();
    expect(screen.queryByTestId('swap-error')).toBeNull();
  });

  it('shows the build error as a notice and the open picker as a sheet', () => {
    mockLogic.error = 'swap.errors.buildFailed';
    mockLogic.pay.pickerOpen = true;
    render(<SwapScreen publicKey="pk" networkId="solana-mainnet" />);
    expect(screen.getByTestId('swap-error')).toBeTruthy();
    expect(screen.getByText('swap.errors.buildFailed')).toBeTruthy();
    expect(screen.getByTestId('swap-pay-picker-open')).toBeTruthy();
  });

  it('replaces the form with the region state when the backend refused the caller', () => {
    mockLogic.unavailable = 'region';
    render(<SwapScreen publicKey="pk" networkId="solana-mainnet" />);
    expect(screen.getByTestId('swap-unavailable-region')).toBeTruthy();
    expect(screen.getByText('powerups.unavailable.region')).toBeTruthy();
    expect(screen.queryByTestId('swap-submit-button')).toBeNull();
  });

  it('draws the blocker as a warning, with its interpolated amount', () => {
    mockLogic.blocker = { key: 'swap.errors.insufficientSolFor', params: { amount: '0.002' } };
    render(<SwapScreen publicKey="pk" networkId="solana-mainnet" />);
    expect(screen.getByTestId('swap-blocker')).toBeTruthy();
    expect(screen.getByText('swap.errors.insufficientSolFor')).toBeTruthy();
  });

  it('says there is nothing to swap when the wallet holds no token, instead of an empty form', () => {
    mockLogic.pay.tokens = [];
    render(<SwapScreen publicKey="pk" networkId="solana-mainnet" />);
    expect(screen.getByTestId('swap-empty')).toBeTruthy();
    expect(screen.getByText('swap.empty_title')).toBeTruthy();
    expect(screen.queryByTestId('swap-submit-button')).toBeNull();
  });
});
