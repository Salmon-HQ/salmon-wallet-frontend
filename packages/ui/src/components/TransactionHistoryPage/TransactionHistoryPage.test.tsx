/**
 * @vitest-environment jsdom
 *
 * Activity on the DOM — the mobile route's decisions, asserted where the
 * extension inherits them: the filters keep and drop the right rows, the
 * list is grouped by day, a row opens the detail as a sheet over the list,
 * and every ink follows the live mode.
 */
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: unknown) =>
      typeof fallbackOrOptions === 'string' ? fallbackOrOptions : key,
  }),
}));

// The detail's own facts have their own tests; here it only needs to show up.
vi.mock('../TransactionDetail', () => ({
  TransactionDetail: ({ transaction }: { transaction: { id: string } }) => (
    <div data-testid="tx-detail">{transaction.id}</div>
  ),
}));

import { createSemantic } from '@salmon/shared';
import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { TransactionHistoryPage } from './TransactionHistoryPage';

const NOW_SECONDS = Math.floor(Date.now() / 1000);
const YESTERDAY_SECONDS = NOW_SECONDS - 60 * 60 * 24 * 2;

const TRANSACTIONS = [
  {
    id: 'tx-send',
    type: 'send',
    status: 'completed',
    timestamp: NOW_SECONDS,
    inputs: [],
    outputs: [{ symbol: 'SOL', amount: '1000000000', decimals: 9, destination: 'DestAddr1234' }],
  },
  {
    id: 'tx-swap',
    type: 'swap',
    status: 'completed',
    timestamp: YESTERDAY_SECONDS,
    inputs: [{ symbol: 'USDC', amount: '5000000', decimals: 6 }],
    outputs: [{ symbol: 'SOL', amount: '1000000000', decimals: 9 }],
  },
] as never[];

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

beforeEach(stubMatchMedia);

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe('TransactionHistoryPage', () => {
  it('is titled Activity, with the subtitle mobile shows', () => {
    render(<TransactionHistoryPage onBack={vi.fn()} transactions={TRANSACTIONS} />);
    expect(screen.getByText('actions.activity')).toBeTruthy();
    expect(screen.getByText('transactions.tapToViewDetails')).toBeTruthy();
  });

  it('offers the four filters and keeps only the matching rows', () => {
    render(<TransactionHistoryPage onBack={vi.fn()} transactions={TRANSACTIONS} />);
    expect(screen.getAllByTestId('activity-tx-row')).toHaveLength(2);

    fireEvent.click(screen.getByTestId('activity-filters-send'));
    expect(screen.getAllByTestId('activity-tx-row')).toHaveLength(1);

    // "Other" is by exclusion: the swap is in it, the send is not.
    fireEvent.click(screen.getByTestId('activity-filters-other'));
    const rows = screen.getAllByTestId('activity-tx-row');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('Swapped')).toBeTruthy();
  });

  it('says the filter is the reason when a filtered slice is empty', () => {
    render(
      <TransactionHistoryPage
        onBack={vi.fn()}
        transactions={TRANSACTIONS.filter((tx) => (tx as { type: string }).type === 'send')}
      />
    );
    fireEvent.click(screen.getByTestId('activity-filters-receive'));
    expect(screen.getByTestId('activity-empty')).toBeTruthy();
    expect(screen.getByText('activity.emptyFiltered')).toBeTruthy();
  });

  it('groups the rows by day', () => {
    render(<TransactionHistoryPage onBack={vi.fn()} transactions={TRANSACTIONS} />);
    expect(screen.getByTestId('activity-group-today')).toBeTruthy();
    expect(screen.getByTestId('activity-group-earlier')).toBeTruthy();
  });

  it('opens a row as a sheet over the list, and the list stays', () => {
    render(<TransactionHistoryPage onBack={vi.fn()} transactions={TRANSACTIONS} />);
    fireEvent.click(screen.getAllByTestId('activity-tx-row')[0]);

    expect(screen.getByTestId('tx-detail').textContent).toBe('tx-send');
    expect(screen.getByTestId('activity-detail-sheet').getAttribute('open')).not.toBeNull();
    expect(screen.getAllByTestId('activity-tx-row')).toHaveLength(2);
  });

  it('shows the skeleton while loading and the retry when it failed', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <TransactionHistoryPage onBack={vi.fn()} transactions={[]} loading />
    );
    expect(screen.getByTestId('activity-skeleton')).toBeTruthy();

    rerender(
      <TransactionHistoryPage onBack={vi.fn()} transactions={[]} error="boom" onRetry={onRetry} />
    );
    fireEvent.click(screen.getByTestId('activity-retry-button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('reads the live mode: the ground takes the light ramp', () => {
    const light = createSemantic('light');
    renderInMode('light', <TransactionHistoryPage onBack={vi.fn()} transactions={TRANSACTIONS} />);

    expect(screen.getByTestId('activity-screen').style.backgroundColor).toBe(
      asRenderedColor(light.water.gradient[1])
    );
  });
});
