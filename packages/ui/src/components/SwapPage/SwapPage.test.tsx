/**
 * @vitest-environment jsdom
 *
 * The DOM twin renders what the shared hook composes: the two token rows,
 * the amount with its fills, the error, and the unavailable state in place
 * of the form.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../TokenPickerSheet', () => ({
  TokenPickerSheet: ({ visible, testID }: { visible: boolean; testID?: string }) =>
    visible ? <div data-testid={`${testID}-open`} /> : null,
}));

const logic = {
  pay: {
    token: { address: 'sol', symbol: 'SOL', name: 'Solana', uiAmount: 2, decimals: 9 },
    tokens: [{ address: 'sol', symbol: 'SOL', name: 'Solana', uiAmount: 2, decimals: 9 }],
    loading: false,
    pickerOpen: false,
    openPicker: vi.fn(),
    closePicker: vi.fn(),
    select: vi.fn(),
    subtitle: '2 SOL available',
  },
  receive: {
    token: { address: 'usdc', symbol: 'USDC', name: 'USD Coin', uiAmount: 0, decimals: 6 },
    tokens: [],
    loading: false,
    pickerOpen: false,
    openPicker: vi.fn(),
    closePicker: vi.fn(),
    select: vi.fn(),
    subtitle: 'USD Coin',
  },
  amount: '1',
  shortcuts: {
    options: [{ key: 'max', label: 'Max' }],
    selected: '',
    select: vi.fn(),
    onAmountChange: vi.fn(),
  },
  fiatLine: '≈ 120.00 USD',
  canSubmit: true,
  isConfirming: false,
  error: null as string | null,
  blocker: null as string | { key: string; params: Record<string, string> } | null,
  unavailable: null as 'region' | 'wallet' | null,
  submit: vi.fn(),
};
vi.mock('@salmon/shared/powerups', () => ({ useSwapScreenLogic: () => logic }));

import { renderInMode } from '../../test/renderInMode';
import { SwapPage } from './SwapPage';

const renderPage = () =>
  renderInMode('dark', <SwapPage publicKey="pk" networkId="solana-mainnet" />);

describe('SwapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logic.error = null;
    logic.unavailable = null;
    logic.blocker = null;
    logic.pay.tokens = [logic.pay.token];
    logic.receive.pickerOpen = false;
  });
  afterEach(cleanup);

  it('draws both token rows, the amount and the review control, from the hook', () => {
    renderPage();
    expect(screen.getByText('2 SOL available')).toBeTruthy();
    expect(screen.getByText('USD Coin')).toBeTruthy();
    expect(screen.getByText('≈ 120.00 USD')).toBeTruthy();
    fireEvent.click(screen.getByTestId('swap-pay-token'));
    expect(logic.pay.openPicker).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('swap-receive-token'));
    expect(logic.receive.openPicker).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('swap-submit-button'));
    expect(logic.submit).toHaveBeenCalled();
    expect(screen.queryByTestId('swap-error')).toBeNull();
  });

  it('shows the build error as a notice and the open picker as a sheet', () => {
    logic.error = 'swap.errors.buildFailed';
    logic.receive.pickerOpen = true;
    renderPage();
    expect(screen.getByTestId('swap-error')).toBeTruthy();
    expect(screen.getByText('swap.errors.buildFailed')).toBeTruthy();
    expect(screen.getByTestId('swap-receive-picker-open')).toBeTruthy();
  });

  it('replaces the form with the wallet state when the backend refused the caller', () => {
    logic.unavailable = 'wallet';
    renderPage();
    expect(screen.getByTestId('swap-unavailable-wallet')).toBeTruthy();
    expect(screen.getByText('powerups.unavailable.wallet')).toBeTruthy();
    expect(screen.queryByTestId('swap-submit-button')).toBeNull();
  });

  it('draws the blocker as a warning', () => {
    logic.blocker = 'swap.errors.insufficientSol';
    renderPage();
    expect(screen.getByTestId('swap-blocker')).toBeTruthy();
    expect(screen.getByText('swap.errors.insufficientSol')).toBeTruthy();
  });

  it('says there is nothing to swap when the wallet holds no token, instead of an empty form', () => {
    logic.pay.tokens = [];
    renderPage();
    expect(screen.getByTestId('swap-empty')).toBeTruthy();
    expect(screen.getByText('swap.empty_title')).toBeTruthy();
    expect(screen.queryByTestId('swap-submit-button')).toBeNull();
  });
});
