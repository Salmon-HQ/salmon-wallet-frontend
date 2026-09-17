/**
 * @vitest-environment jsdom
 *
 * The DOM twin renders what the shared hook composes: the form, the empty
 * state, the rows with their state, and the sheet when a request is open.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import type { PaymentsActionBinding } from '@salmon/shared/powerups';

const bubble = { size: 36, iconWeight: 'bold', iconSize: 18 } as const;

const logic = {
  actions: {
    title: 'Requests',
    ask: {
      onPress: vi.fn(),
      accessibilityLabel: 'Ask for a payment',
      testID: 'payments-ask-button',
      ...bubble,
      tone: 'accent',
    },
    pay: {
      onPress: vi.fn(),
      accessibilityLabel: 'Pay a request',
      testID: 'payments-pay-button',
      ...bubble,
      tone: 'outline',
    } as PaymentsActionBinding | null,
    history: null as PaymentsActionBinding | null,
  },
  ask: {
    visible: false,
    onClose: vi.fn(),
    title: 'New request',
    form: {
      amountLabel: 'Amount in USDC',
      amountCard: { value: '', onChangeValue: vi.fn(), placeholder: '0', subtext: '≈ 0.00 USD' },
      noteLabel: 'Note',
      noteField: { value: '', onChangeText: vi.fn(), placeholder: 'note', maxLength: 80 },
      expiryLabel: 'Open for',
      expiryChips: {
        options: [
          { key: 'h1', label: '1 hour' },
          { key: 'h24', label: '24 hours' },
        ],
        value: 'h24',
        onChange: vi.fn(),
        size: 'md',
        fill: true,
        variant: 'outline',
      },
      createButton: { onPress: vi.fn(), disabled: true, loading: false, label: 'Create request' },
    },
  },
  list: {
    title: 'Requests',
    empty: { title: 'No requests yet', body: 'Type an amount' },
    rows: [],
  },
  sheet: {
    visible: false,
    onClose: vi.fn(),
    title: 'Payment request',
    uri: '',
    showCode: false,
    amountLabel: '',
    status: null,
    copyButton: { onPress: vi.fn(), label: 'Copy' },
    shareLabel: 'Share',
    removeButton: { onPress: vi.fn(), label: 'Remove' },
  },
  unavailable: null as string | null,
  requests: [],
  open: null,
  openUri: '',
};

vi.mock('@salmon/shared/powerups', () => ({
  usePaymentsScreenLogic: () => logic,
}));
vi.mock('../BottomSheetContainer', () => ({
  BottomSheetContainer: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? <div data-testid="sheet">{children}</div> : null,
  SheetTitle: ({ children }: { children: string }) => <h2>{children}</h2>,
}));
vi.mock('../QRCode', () => ({
  QRCode: ({ value }: { value: string }) => <div data-testid="qr" data-value={value} />,
}));

import { renderInMode } from '../../test/renderInMode';
import { PaymentsPage } from './PaymentsPage';

afterEach(() => {
  cleanup();
  logic.unavailable = null;
  logic.list.rows = [];
  logic.ask.visible = false;
  logic.sheet.visible = false;
  logic.actions.pay = {
    onPress: vi.fn(),
    accessibilityLabel: 'Pay a request',
    testID: 'payments-pay-button',
    ...bubble,
    tone: 'outline',
  };
});

const render = () =>
  renderInMode('dark', <PaymentsPage publicKey="8xyz" networkId="solana-devnet" />);

describe('PaymentsPage', () => {
  it('renders the two actions over the empty list, and no form', () => {
    render();
    fireEvent.click(screen.getByTestId('payments-ask-button'));
    expect(logic.actions.ask.onPress).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('payments-pay-button'));
    expect(logic.actions.pay?.onPress).toHaveBeenCalled();
    expect(screen.getByTestId('payments-empty').textContent).toContain('No requests yet');
    expect(screen.queryByTestId('payments-amount')).toBeNull();
    expect(screen.queryByTestId('sheet')).toBeNull();
  });

  it('hides Pay when the hook offers none', () => {
    logic.actions.pay = null;
    render();
    expect(screen.getByTestId('payments-ask-button')).toBeTruthy();
    expect(screen.queryByTestId('payments-pay-button')).toBeNull();
  });

  it('draws the form inside the ask sheet when it is open', () => {
    logic.ask.visible = true;
    render();
    expect(screen.getByTestId('payments-amount')).toBeTruthy();
    expect(screen.getByTestId('payments-note')).toBeTruthy();
    expect(screen.getByTestId('payments-expiry')).toBeTruthy();
    expect(screen.getByTestId('payments-create')).toBeTruthy();
  });

  it('shows the unavailable state instead of the actions', () => {
    logic.unavailable = 'USDC is not here';
    render();
    expect(screen.getByTestId('payments-unavailable').textContent).toContain('USDC is not here');
    expect(screen.queryByTestId('payments-ask-button')).toBeNull();
  });

  it('renders rows with their state and opens one on press', () => {
    const open = vi.fn();
    logic.list.rows = [
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
    render();
    const row = screen.getByTestId('payments-row-pr_1');
    expect(row.textContent).toContain('12.50 USDC');
    expect(row.textContent).toContain('Paid');
    fireEvent.click(row);
    expect(open).toHaveBeenCalled();
  });

  it('draws the sheet with the code, the facts and the controls when open', () => {
    logic.sheet.visible = true;
    logic.sheet.showCode = true;
    logic.sheet.uri = 'solana:abc?amount=1';
    logic.sheet.amountLabel = '1.00 USDC';
    logic.sheet.status = {
      state: 'pending',
      rows: [{ key: 'status', label: 'Status', value: 'Waiting' }],
      checkFailed: false,
    } as never;
    render();
    expect(screen.getByTestId('qr').getAttribute('data-value')).toBe('solana:abc?amount=1');
    expect(screen.getByTestId('payments-sheet-amount').textContent).toBe('1.00 USDC');
    expect(screen.getByTestId('payments-sheet-facts').textContent).toContain('Waiting');
    expect(screen.queryByTestId('payments-sheet-share')).toBeNull();
    fireEvent.click(screen.getByTestId('payments-sheet-copy'));
    expect(logic.sheet.copyButton.onPress).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('payments-sheet-remove'));
    expect(logic.sheet.removeButton.onPress).toHaveBeenCalled();
  });

  it('draws the clock when the hook offers the history, before the other two', () => {
    logic.actions.history = {
      onPress: vi.fn(),
      accessibilityLabel: 'See every request',
      testID: 'payments-history-button',
      tone: 'outline',
      size: 36,
      iconWeight: 'bold',
      iconSize: 16,
    };
    renderInMode('dark', <PaymentsPage publicKey="me" networkId="solana-devnet" />);
    const buttons = screen.getByTestId('payments-actions').querySelectorAll('button');
    expect(buttons[0].getAttribute('data-testid')).toBe('payments-history-button');
    fireEvent.click(screen.getByTestId('payments-history-button'));
    expect(logic.actions.history.onPress).toHaveBeenCalledTimes(1);
    logic.actions.history = null;
  });
});
