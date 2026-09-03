/**
 * @vitest-environment jsdom
 *
 * jsdom has no `Element.animate`; it is stubbed here so the verb's calls can be
 * counted, the same pattern `PortfolioSubTabs.test.tsx` uses.
 */
import React from 'react';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { CurrencyProvider, type BlockchainBalance } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { BalanceHeader } from './BalanceHeader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

function fakeAnimation() {
  return { finished: Promise.resolve(), addEventListener: (_e: string, cb: () => void) => cb() };
}

function stubDom(animateImpl?: () => ReturnType<typeof fakeAnimation>) {
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: animateImpl ?? fakeAnimation,
  });
}

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('reduced-motion') ? reduced : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

const CHAINS: BlockchainBalance[] = [
  {
    network: { id: 'solana-mainnet', name: 'Solana', blockchain: 'solana' },
    usdTotal: 1234.56,
    changePercent: 4.2,
    changeAmount: 49.7,
  },
  {
    network: { id: 'bitcoin-mainnet', name: 'Bitcoin', blockchain: 'bitcoin' },
    usdTotal: undefined,
  },
];

const DEVNET: BlockchainBalance[] = [
  {
    network: { id: 'solana-devnet', name: 'Solana Devnet', blockchain: 'solana-devnet' },
    usdTotal: undefined,
    nativeAmount: 2.5,
  },
];

const render = (mode: 'dark' | 'light', node: React.ReactNode) =>
  renderInMode(mode, <CurrencyProvider>{node}</CurrencyProvider>);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BalanceHeader', () => {
  it.each(['dark', 'light'] as const)('draws the block and its controls in %s', (mode) => {
    stubDom();
    stubMatchMedia(false);

    render(mode, <BalanceHeader testID="balance-header" blockchains={CHAINS} activeIndex={0} />);

    expect(screen.getByTestId('balance-header')).toBeTruthy();
    expect(screen.getByTestId('balance-amount')).toBeTruthy();
    expect(screen.getByTestId('balance-change')).toBeTruthy();
    expect(screen.getByTestId('home-activity-button')).toBeTruthy();
    expect(screen.getByTestId('home-send-button')).toBeTruthy();
    expect(screen.getByTestId('home-receive-button')).toBeTruthy();
    // One dot per chain, and the active one is the selected tab.
    expect(screen.getByTestId('balance-carousel-dot-0').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('balance-carousel-dot-1').getAttribute('aria-selected')).toBe(
      'false'
    );
  });

  it('turns the page on an arrow key, and on a click on a dot', async () => {
    stubDom();
    stubMatchMedia(false);
    const onBlockchainChange = vi.fn();

    render(
      'dark',
      <BalanceHeader blockchains={CHAINS} activeIndex={0} onBlockchainChange={onBlockchainChange} />
    );

    await act(async () => {
      fireEvent.keyDown(screen.getByTestId('balance-amount'), { key: 'ArrowRight' });
      await Promise.resolve();
    });
    expect(onBlockchainChange).toHaveBeenCalledWith('bitcoin', 1);

    onBlockchainChange.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByTestId('balance-carousel-dot-1'));
      await Promise.resolve();
    });
    expect(onBlockchainChange).toHaveBeenCalledWith('bitcoin', 1);
  });

  it('turns the page on a horizontal wheel, and ignores a vertical one', async () => {
    stubDom();
    stubMatchMedia(false);
    const onBlockchainChange = vi.fn();

    render(
      'dark',
      <BalanceHeader
        testID="balance-header"
        blockchains={CHAINS}
        activeIndex={0}
        onBlockchainChange={onBlockchainChange}
      />
    );
    const block = screen.getByTestId('balance-header');

    // A vertical scroll started over the block still scrolls the panel.
    fireEvent.wheel(block, { deltaX: 4, deltaY: 120 });
    expect(onBlockchainChange).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.wheel(block, { deltaX: 120, deltaY: 2 });
      await Promise.resolve();
    });
    expect(onBlockchainChange).toHaveBeenCalledWith('bitcoin', 1);
  });

  it('slides the amount and sinks the change on a page change, and cuts under reduced motion', async () => {
    const animate = vi.fn(fakeAnimation);
    stubDom(animate);
    stubMatchMedia(false);

    render(
      'dark',
      <BalanceHeader blockchains={CHAINS} activeIndex={0} onBlockchainChange={vi.fn()} />
    );
    animate.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByTestId('balance-carousel-dot-1'));
      await Promise.resolve();
    });
    // The amount's lateral exit and the change's sink-in-place.
    expect(animate.mock.calls.length).toBeGreaterThanOrEqual(2);

    cleanup();
    animate.mockClear();
    stubMatchMedia(true);
    const onBlockchainChange = vi.fn();
    render(
      'dark',
      <BalanceHeader blockchains={CHAINS} activeIndex={0} onBlockchainChange={onBlockchainChange} />
    );
    fireEvent.click(screen.getByTestId('balance-carousel-dot-1'));
    // The page still turns; it just does not travel.
    expect(onBlockchainChange).toHaveBeenCalledWith('bitcoin', 1);
    expect(animate).not.toHaveBeenCalled();
  });

  it('prints the native quantity and no 24h line off mainnet, and names the environment', () => {
    stubDom();
    stubMatchMedia(false);

    render('dark', <BalanceHeader blockchains={DEVNET} activeIndex={0} />);

    // Off mainnet nothing priced the balance: the change is absent rather than
    // an em-dash, which would promise a figure that is merely late.
    expect(screen.queryByTestId('balance-change')).toBeNull();
    expect(screen.getByTestId('balance-network-chip')).toBeTruthy();
    expect(screen.getByTestId('balance-amount').textContent).toContain('SOL');
  });

  it('names the chain each hint points at, in that chain’s own hue', () => {
    stubDom();
    stubMatchMedia(false);

    render('dark', <BalanceHeader blockchains={CHAINS} activeIndex={1} />);

    // A middle page has a chain behind it as well as ahead of it; here the last
    // page names only the one behind.
    const previous = screen.getByTestId('balance-prev-hint');
    expect(previous.textContent).toBe('← SOL');
    expect(previous.style.color).toBeTruthy();
    expect(screen.queryByTestId('balance-next-hint')).toBeNull();
  });

  it('puts both cues to the right of the dots on a middle page, and each goes where the dot goes', () => {
    stubDom();
    stubMatchMedia(true);
    const THREE = [
      ...CHAINS,
      { network: { id: 'solana-devnet', name: 'Solana Devnet', blockchain: 'solana' } },
    ] as any;
    const onBlockchainChange = vi.fn();

    render(
      'dark',
      <BalanceHeader blockchains={THREE} activeIndex={1} onBlockchainChange={onBlockchainChange} />
    );

    const lastDot = screen.getByTestId('balance-carousel-dot-2');
    const previous = screen.getByTestId('balance-prev-hint');
    const next = screen.getByTestId('balance-next-hint');
    expect(
      lastDot.compareDocumentPosition(previous) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(previous.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(previous.textContent).toBe('← SOL');
    expect(next.textContent).toBe('SOL →');

    fireEvent.click(next);
    expect(onBlockchainChange).toHaveBeenCalledWith('solana', 2);
    fireEvent.click(previous);
    expect(onBlockchainChange).toHaveBeenCalledWith('solana', 0);
  });
});
