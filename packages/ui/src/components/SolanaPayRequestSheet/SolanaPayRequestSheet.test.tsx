/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { SolanaPayRequestSheet } from './SolanaPayRequestSheet';
import type { SolanaPayRequestSheetProps } from './types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { message?: string }) =>
      values?.message ? `${key}: ${values.message}` : key,
  }),
}));

afterEach(cleanup);

function renderSheet(overrides: Partial<SolanaPayRequestSheetProps> = {}) {
  const onClose = vi.fn();
  renderInMode(
    'dark',
    <SolanaPayRequestSheet
      visible
      merchant={{ domain: 'merchant.example' }}
      phase="contacting"
      onClose={onClose}
      {...overrides}
    />
  );
  return { onClose };
}

describe('SolanaPayRequestSheet', () => {
  it('names the domain while the merchant is contacted, before any label arrives', () => {
    renderSheet();
    const row = screen.getByTestId('solana-pay-merchant');
    expect(row.textContent).toContain('merchant.example');
    expect(row.querySelector('img')).toBeNull();
    expect(screen.getByTestId('solana-pay-status').textContent).toContain('solanaPay.contacting');
  });

  it("shows the merchant's label and icon once they arrive, while the payment is prepared", () => {
    renderSheet({
      phase: 'preparing',
      merchant: {
        domain: 'merchant.example',
        label: 'Corner Café',
        icon: 'https://merchant.example/logo.svg',
      },
    });
    const row = screen.getByTestId('solana-pay-merchant');
    expect(row.textContent).toContain('Corner Café');
    expect(row.textContent).toContain('merchant.example');
    expect(row.querySelector('img')?.getAttribute('src')).toBe('https://merchant.example/logo.svg');
    expect(screen.getByTestId('solana-pay-status').textContent).toContain('solanaPay.preparing');
  });

  it('never loads an http icon', () => {
    renderSheet({
      merchant: {
        domain: 'merchant.example',
        label: 'Corner Café',
        icon: 'http://m.example/a.png',
      },
    });
    expect(screen.getByTestId('solana-pay-merchant').querySelector('img')).toBeNull();
  });

  it('says why the payment stopped, in place of the status', () => {
    renderSheet({ phase: 'failed', error: { key: 'solanaPay.errors.unreachable' } });
    expect(screen.queryByTestId('solana-pay-status')).toBeNull();
    expect(screen.getByTestId('solana-pay-error').textContent).toContain(
      'solanaPay.errors.unreachable'
    );
  });

  it("shows the merchant's own words as plain text, markup included", () => {
    renderSheet({
      phase: 'failed',
      error: { key: 'solanaPay.errors.merchantError', merchantMessage: '<b>Out of stock</b>' },
    });
    const error = screen.getByTestId('solana-pay-error');
    expect(error.textContent).toContain('solanaPay.merchantMessage: <b>Out of stock</b>');
    expect(error.querySelector('b')).toBeNull();
  });

  it('offers a retry only when the failure allows one', () => {
    renderSheet({ phase: 'failed', error: { key: 'solanaPay.errors.invalidSignature' } });
    expect(screen.queryByTestId('solana-pay-retry')).toBeNull();
    cleanup();

    const onRetry = vi.fn();
    renderSheet({ phase: 'failed', error: { key: 'solanaPay.errors.unreachable' }, onRetry });
    fireEvent.click(screen.getByTestId('solana-pay-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('solana-pay-retry').textContent).toContain('solanaPay.retry');
  });

  it('closes on its button', () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByTestId('solana-pay-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
