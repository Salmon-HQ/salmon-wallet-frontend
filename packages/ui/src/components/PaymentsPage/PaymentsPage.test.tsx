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

const logic = {
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
  logic.sheet.visible = false;
});

const render = () =>
  renderInMode('dark', <PaymentsPage publicKey="8xyz" networkId="solana-devnet" />);

describe('PaymentsPage', () => {
  it('renders the form and the empty list', () => {
    render();
    expect(screen.getByTestId('payments-amount')).toBeTruthy();
    expect(screen.getByTestId('payments-note')).toBeTruthy();
    expect(screen.getByTestId('payments-expiry')).toBeTruthy();
    expect(screen.getByTestId('payments-create')).toBeTruthy();
    expect(screen.getByTestId('payments-empty').textContent).toContain('No requests yet');
    expect(screen.queryByTestId('sheet')).toBeNull();
  });

  it('shows the unavailable state instead of the form', () => {
    logic.unavailable = 'USDC is not here';
    render();
    expect(screen.getByTestId('payments-unavailable').textContent).toContain('USDC is not here');
    expect(screen.queryByTestId('payments-amount')).toBeNull();
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
});
