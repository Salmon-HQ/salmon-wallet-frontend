/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { TransactionConfirmation } from './TransactionConfirmation';
import type { ProposalDisplay } from './types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

afterEach(cleanup);

const display: ProposalDisplay = {
  title: 'Swap Review',
  exchange: {
    send: { label: 'You Send', symbol: 'USDC', amount: '1 USDC', usdValue: '~$1.00' },
    receive: { label: 'You Receive', symbol: 'SOL', amount: '0.0197 SOL' },
  },
  rows: [
    { label: 'Salmon fee', value: '0.0085 USDC (0.85%)' },
    { label: 'Slippage Tolerance', value: '0.5%' },
  ],
  advancedRows: [
    { label: 'Provider', value: '0x' },
    { label: 'Route', value: 'Raydium → Orca', pending: true },
  ],
  attribution: 'Powered by 0x',
  warning: { title: 'Please Note', body: 'Rates are estimates.' },
  pendingTitle: 'Processing swap',
};

function renderScreen(overrides: Partial<React.ComponentProps<typeof TransactionConfirmation>> = {}) {
  return renderInMode(
    'dark',
    <TransactionConfirmation
      display={display}
      onBack={vi.fn()}
      onConfirm={vi.fn()}
      confirmLabel="Confirm (12)"
      {...overrides}
    />
  );
}

describe('TransactionConfirmation', () => {
  it('draws the exchange, every fee as its own line, and the attribution verbatim', () => {
    renderScreen();
    expect(screen.getByTestId('confirmation-exchange')).toBeTruthy();
    expect(screen.getByText('1 USDC')).toBeTruthy();
    expect(screen.getByText('0.0197 SOL')).toBeTruthy();
    expect(screen.getByText('Salmon fee')).toBeTruthy();
    expect(screen.getByText('0.0085 USDC (0.85%)')).toBeTruthy();
    expect(screen.getByTestId('confirmation-attribution').textContent).toBe('Powered by 0x');
    expect(screen.getByText('Rates are estimates.')).toBeTruthy();
  });

  it('folds the advanced rows behind the disclosure and reveals them on press', () => {
    renderScreen();
    expect(screen.queryByText('Provider')).toBeNull();
    const disclosure = screen.getByTestId('confirmation-details-disclosure');
    expect(disclosure.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(disclosure);
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Provider')).toBeTruthy();
    expect(screen.getByText('Raydium → Orca')).toBeTruthy();
  });

  it('wires the controls and labels confirm from the host', () => {
    const onBack = vi.fn();
    const onConfirm = vi.fn();
    renderScreen({ onBack, onConfirm });
    expect(screen.getByTestId('confirmation-confirm-button').textContent).toContain('Confirm (12)');
    fireEvent.click(screen.getByTestId('confirmation-confirm-button'));
    fireEvent.click(screen.getByTestId('confirmation-back-button'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('reports a failed signature as an alert above the controls', () => {
    renderScreen({ error: 'transaction.errors.networkBusy' });
    const error = screen.getByTestId('confirmation-error');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent).toBe('transaction.errors.networkBusy');
  });

  it('refuses a second press while a rebuild is in flight', () => {
    renderScreen({ isRefreshing: true });
    expect((screen.getByTestId('confirmation-confirm-button') as HTMLButtonElement).disabled).toBe(
      true
    );
  });
});
