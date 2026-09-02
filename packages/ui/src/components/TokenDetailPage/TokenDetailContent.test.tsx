/**
 * @vitest-environment jsdom
 *
 * Bitcoin's home tab and a Solana token's pushed detail page are the same
 * screen — mobile's `token/[id]` body: balance block, performance block,
 * market data, about. What is pinned here is that they cannot be composed
 * differently, that the only difference between the two is data (Bitcoin has
 * no contract to copy), and that the inks follow the mode.
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSemantic } from '@salmon/shared';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';

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
      { formatValue: (value: number) => `$${value.toFixed(2)}` },
    ],
  };
});

const { TokenDetailContent } = await import('./TokenDetailContent');

afterEach(cleanup);

const BITCOIN = { address: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', uiAmount: 0.5, price: 100 };
const SOLANA = {
  address: 'So11111111111111111111111111111111111111112',
  name: 'Solana',
  symbol: 'SOL',
  uiAmount: 12,
  usdBalance: 1200,
  price: 100,
};

const CHART = [
  { timestamp: 1, price: 10 },
  { timestamp: 2, price: 12 },
];

function renderContent(mode: 'dark' | 'light', token: typeof BITCOIN | typeof SOLANA) {
  return renderInMode(
    mode,
    <TokenDetailContent
      token={token}
      blockchain={token.symbol === 'BTC' ? 'bitcoin' : 'solana'}
      chartData={CHART}
      chartPeriod="1M"
      onChartPeriodChange={() => {}}
      coinInfo={null}
      marketData={{ marketCap: 1_000_000 }}
    />
  );
}

function blockOrder(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-testid^="token-detail-"]')]
    .map((node) => node.getAttribute('data-testid') as string)
    .filter((id) =>
      [
        'token-detail-balance',
        'token-detail-performance',
        'token-detail-market-data',
        'token-detail-about',
      ].includes(id)
    );
}

describe('TokenDetailContent', () => {
  it('gives both assets the same blocks in the same order — mobile’s token/[id]', () => {
    // Bitcoin has nothing for the about card (no contract, and CoinGecko is
    // not loaded here), so the card omits itself — a difference in data, the
    // only kind allowed.
    const bitcoin = renderContent('dark', BITCOIN);
    expect(blockOrder(bitcoin.container)).toEqual([
      'token-detail-balance',
      'token-detail-performance',
      'token-detail-market-data',
    ]);
    cleanup();

    const solana = renderContent('dark', SOLANA);
    expect(blockOrder(solana.container)).toEqual([
      'token-detail-balance',
      'token-detail-performance',
      'token-detail-market-data',
      'token-detail-about',
    ]);
  });

  it('differs by data only: Bitcoin has no contract to copy, a Solana token does', () => {
    renderContent('dark', BITCOIN);
    expect(screen.queryByTestId('token-detail-contract-address')).toBeNull();
    cleanup();

    renderContent('dark', SOLANA);
    expect(screen.getByTestId('token-detail-contract-address')).toBeTruthy();
  });

  it('answers the selected window with the chart’s own first and last point', () => {
    renderContent('dark', SOLANA);
    // 10 → 12 is +20%, in the success tone.
    expect(screen.getByTestId('token-detail-period-change').textContent).toContain('20');
    expect(screen.getByTestId('token-detail-amount').textContent).toBe('12 SOL');
    expect(screen.getByTestId('token-detail-fiat').textContent).toBe('$1200.00');
  });

  it.each(['dark', 'light'] as const)('inks the amount from the %s mode', (mode) => {
    renderContent(mode, SOLANA);
    const amount = screen.getByTestId('token-detail-amount') as HTMLElement;
    expect(amount.style.color).toBe(asRenderedColor(createSemantic(mode).text.primary));
  });
});
