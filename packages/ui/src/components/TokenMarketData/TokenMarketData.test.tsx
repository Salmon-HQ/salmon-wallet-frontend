/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

vi.mock('@salmon/shared', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@salmon/shared');
  return {
    ...actual,
    useCurrencyContext: () => [
      { currency: 'USD' },
      { formatValue: (value: number) => `$${value}` },
    ],
  };
});

const { TokenMarketData } = await import('./TokenMarketData');

afterEach(cleanup);

describe('TokenMarketData', () => {
  it('renders nothing without data and a card of rows with it', () => {
    const empty = renderInMode('dark', <TokenMarketData data={undefined} />);
    expect(empty.container.firstChild).toBeNull();
    cleanup();

    renderInMode(
      'light',
      <TokenMarketData
        data={{ marketCap: 1_000_000, volume24h: 5000, circulatingSupply: 21_000_000, ath: 69_000 }}
        symbol="BTC"
      />
    );
    expect(screen.getByTestId('token-detail-market-data')).toBeTruthy();
    expect(screen.getByText('Market data')).toBeTruthy();
    expect(screen.getByText('$1000000')).toBeTruthy();
    expect(screen.getByText(/M BTC$/)).toBeTruthy();
  });
});
