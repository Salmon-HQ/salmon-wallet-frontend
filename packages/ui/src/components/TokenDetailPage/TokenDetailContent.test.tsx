/**
 * @vitest-environment jsdom
 *
 * Bitcoin's home tab and a Solana token's pushed detail page are the same
 * screen. What is pinned here is that they cannot be *composed* differently:
 * both go through TokenDetailContent, so they get one order, one rhythm and
 * one set of titles no matter what the caller passes. The only difference the
 * caller may produce is a section the asset has no data for (Bitcoin has no
 * tags, so no badges block), plus the chart bleed, which belongs to the
 * container's padding rather than to the screen.
 *
 * The section titled after the market stats is checked here too: it must take
 * its own key, not the market-cap row's — that mismatch is what titled the
 * Bitcoin screen "Capitalización".
 *
 * The section components are stubbed. Their internals are their own tests'
 * business; what this file is about is what the screen is made of and in what
 * order, and stubbing keeps @salmon/shared's React Native entry out of jsdom.
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock('@salmon/shared', () => ({
  colors: { background: { tokenItem: '#161C2D' }, skeleton: { base: '#212938' } },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
  borderRadius: { lg: 12 },
  componentSizes: { tokenIcon: 38 },
}));

vi.mock('../PriceChart', () => ({
  PriceChart: ({ style }: { style?: React.CSSProperties }) => (
    <div data-testid="section-chart" data-margin={style?.margin} />
  ),
}));
vi.mock('../TokenList', () => ({
  TokenListItem: ({ token }: { token: { symbol: string } }) => (
    <div data-testid="section-token">{token.symbol}</div>
  ),
}));
vi.mock('../TokenMarketData', () => ({
  TokenMarketData: ({ title }: { title?: string }) => (
    <div data-testid="section-market">{title}</div>
  ),
}));
vi.mock('../TokenAbout', () => ({
  TokenAbout: () => <div data-testid="section-about" />,
}));
vi.mock('./TokenBadgesSection', () => ({
  TokenBadgesSection: ({ tags }: { tags?: string[] }) =>
    tags?.length ? <div data-testid="section-badges" /> : null,
}));

const { TokenDetailContent } = await import('./TokenDetailContent');

afterEach(cleanup);

const BITCOIN = { address: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', uiAmount: 0.5 };
const SOLANA = {
  address: 'So11111111111111111111111111111111111111112',
  name: 'Solana',
  symbol: 'SOL',
  uiAmount: 12,
  tags: ['verified'],
};

function renderContent(token: typeof BITCOIN | typeof SOLANA, bleed: number) {
  return render(
    <TokenDetailContent
      token={token}
      blockchain={token.symbol === 'BTC' ? 'bitcoin' : 'solana'}
      chartData={[
        { timestamp: 1, price: 10 },
        { timestamp: 2, price: 12 },
      ]}
      chartPeriod="1M"
      onChartPeriodChange={() => {}}
      coinInfo={null}
      marketData={{ marketCap: 1_000_000 }}
      bleed={bleed}
    />
  );
}

function sectionOrder(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-testid^="section-"]')].map(
    (node) => node.getAttribute('data-testid') as string
  );
}

describe('TokenDetailContent', () => {
  it('titles the market section after what it holds, not after one of its rows', () => {
    renderContent(BITCOIN, 16);
    expect(screen.getByTestId('section-market').textContent).toBe('Market data');
  });

  it('gives both assets the same sections in the same order', () => {
    const bitcoin = renderContent(BITCOIN, 16);
    expect(sectionOrder(bitcoin.container)).toEqual([
      'section-chart',
      'section-token',
      'section-market',
      'section-about',
    ]);
    cleanup();

    // Solana differs only by the badges block, which exists because the token
    // has tags — a difference in data, not in composition.
    const solana = renderContent(SOLANA, 20);
    expect(sectionOrder(solana.container)).toEqual([
      'section-chart',
      'section-token',
      'section-market',
      'section-badges',
      'section-about',
    ]);
  });

  it('spaces both assets from one styled stack, whatever the caller passes', () => {
    const bitcoin = renderContent(BITCOIN, 16);
    const bitcoinStack = bitcoin.container.firstElementChild as HTMLElement;
    const bitcoinClass = bitcoinStack.className;
    cleanup();

    const solana = renderContent(SOLANA, 20);
    const solanaStack = solana.container.firstElementChild as HTMLElement;

    // Same emotion class means the same rule set — there is no second stack to
    // tune independently.
    expect(solanaStack.className).toBe(bitcoinClass);
  });

  it('bleeds the chart to whatever padding the container has', () => {
    const home = renderContent(BITCOIN, 16);
    expect(home.getByTestId('section-chart').getAttribute('data-margin')).toBe('0 -16px');
    cleanup();

    const page = renderContent(SOLANA, 20);
    expect(page.getByTestId('section-chart').getAttribute('data-margin')).toBe('0 -20px');
  });
});
