/**
 * @vitest-environment jsdom
 *
 * CORE 09 on the DOM: the facts a transaction carries, and which block each
 * one lands in — the same shell mobile draws.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCopyToClipboard = vi.fn().mockResolvedValue(true);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: unknown) =>
      typeof fallbackOrOptions === 'string' ? fallbackOrOptions : key,
  }),
}));

// The real barrel, with only the clipboard overridden — the DOM's clipboard
// is not in jsdom.
let mockDeveloperMode = false;
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
  // The technical card follows the provider's flag, not a prop.
  useDeveloperMode: () => mockDeveloperMode,
}));

import { createSemantic } from '@salmon/shared';
import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { TransactionDetail } from './TransactionDetail';

const TRANSFER = {
  id: '5abcdefghijklmnopqrstuvwxyz0123456789',
  type: 'send',
  status: 'completed',
  confirmationStatus: 'finalized',
  timestamp: 1_700_000_000,
  slot: 123456,
  feePayer: 'FeePayerAddress1234567890',
  fee: { amount: '5000', decimals: 9, symbol: 'SOL' },
  inputs: [],
  outputs: [
    {
      symbol: 'SOL',
      name: 'Solana',
      amount: '1000000000',
      decimals: 9,
      destination: 'DestinationAddress1234567890',
    },
  ],
} as never;

const SWAP = {
  id: 'swapsig1234567890',
  type: 'swap',
  status: 'completed',
  timestamp: 1_700_000_000,
  inputs: [{ symbol: 'USDC', amount: '150000000', decimals: 6 }],
  outputs: [{ symbol: 'SOL', amount: '1000000000', decimals: 9 }],
  swapRoute: {
    priceImpact: '0.3',
    hops: [
      { dex: 'Orca', inputToken: { symbol: 'SOL' }, outputToken: { symbol: 'USDC' }, percent: 100 },
    ],
  },
  heliusType: 'SWAP',
} as never;

function stubMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

beforeEach(() => {
  stubMatchMedia();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe('TransactionDetail', () => {
  it('names the verb, the status and the meta facts', () => {
    render(<TransactionDetail transaction={TRANSFER} />);

    // The verb resolves through the same key mobile uses; the mock hands the
    // fallback back.
    expect(screen.getByTestId('tx-detail-title').textContent).toBe('Sent');
    expect(within(screen.getByTestId('tx-detail-status')).getByText('Completed')).toBeTruthy();
    const meta = screen.getByTestId('tx-detail-meta');
    expect(within(meta).getByText('Finalized')).toBeTruthy();
    expect(within(meta).getByText('#123,456')).toBeTruthy();
  });

  it('draws a transfer as the tokens that moved and a receipt with the counterparty', () => {
    render(<TransactionDetail transaction={TRANSFER} />);

    expect(screen.getByTestId('tx-detail-tokens')).toBeTruthy();
    expect(screen.getByTestId('tx-detail-token-row').textContent).toContain('- 1');
    const receipt = screen.getByTestId('tx-detail-addresses');
    expect(within(receipt).getByTestId('tx-detail-copy-address-To')).toBeTruthy();
    expect(within(receipt).getByText('Network Fee')).toBeTruthy();
    expect(within(receipt).getByTestId('tx-detail-hash').textContent).toContain('5abcdefg');
    expect(screen.queryByTestId('tx-detail-conversion')).toBeNull();
  });

  it('draws a swap as a conversion with its rate and route', () => {
    render(<TransactionDetail transaction={SWAP} />);

    expect(screen.getByTestId('tx-detail-conversion-from').textContent).toContain('SOL');
    expect(screen.getByTestId('tx-detail-conversion-to').textContent).toContain('USDC');
    // Derived from the two legs: 150 USDC per SOL.
    expect(screen.getByTestId('conversion-rate').textContent).toContain('150');
    expect(screen.getByTestId('price-impact-badge').getAttribute('data-severity')).toBe('safe');
    expect(within(screen.getByTestId('tx-detail-route')).getByText('Orca')).toBeTruthy();
    expect(screen.queryByTestId('tx-detail-tokens')).toBeNull();
  });

  it('shows the technical card only under developer mode', () => {
    mockDeveloperMode = false;
    const { rerender } = render(<TransactionDetail transaction={SWAP} />);
    expect(screen.queryByTestId('tx-detail-developer')).toBeNull();

    mockDeveloperMode = true;
    rerender(<TransactionDetail transaction={SWAP} />);
    expect(within(screen.getByTestId('tx-detail-developer')).getByText('SWAP')).toBeTruthy();
    mockDeveloperMode = false;
  });

  it('copies the hash and reports it', async () => {
    const onCopyHash = vi.fn();
    render(<TransactionDetail transaction={TRANSFER} onCopyHash={onCopyHash} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('tx-detail-copy-hash'));
    });

    expect(mockCopyToClipboard).toHaveBeenCalledWith((TRANSFER as { id: string }).id);
    expect(onCopyHash).toHaveBeenCalledWith((TRANSFER as { id: string }).id);
    expect(screen.getByLabelText('Copied!')).toBeTruthy();
  });

  it('offers the explorer always and share only when there is a handler', () => {
    const { rerender } = render(<TransactionDetail transaction={TRANSFER} />);
    expect(screen.getByTestId('tx-detail-explorer-link')).toBeTruthy();
    expect(screen.queryByTestId('tx-detail-share-button')).toBeNull();

    const onShare = vi.fn();
    rerender(<TransactionDetail transaction={TRANSFER} onShare={onShare} />);
    fireEvent.click(screen.getByTestId('tx-detail-share-button'));
    expect(onShare).toHaveBeenCalledWith(TRANSFER);
  });

  it("reads the live mode: in light the title takes light's ink", () => {
    const light = createSemantic('light');
    renderInMode('light', <TransactionDetail transaction={TRANSFER} />);

    expect(screen.getByTestId('tx-detail-title').style.color).toBe(
      asRenderedColor(light.text.primary)
    );
  });
});
