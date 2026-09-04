/**
 * @vitest-environment jsdom
 *
 * jsdom has no `Element.animate`; it is stubbed here so the verb's calls can be
 * counted, the same pattern `PortfolioSubTabs.test.tsx` uses.
 *
 * `ChainSelector` (trigger label, chevron, underline colour, sheet list) is
 * tested in isolation in `ChainSelector.test.tsx` — here it is mocked to a
 * plain button so this file stays about the block's own contract, not its
 * child's internals.
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

vi.mock('./ChainSelector', () => ({
  ChainSelector: ({
    activeIndex,
    onSelect,
    testID,
  }: {
    activeIndex: number;
    onSelect: (index: number) => void;
    testID?: string;
  }) => (
    <button type="button" data-testid={testID} onClick={() => onSelect(activeIndex === 0 ? 1 : 0)}>
      chain
    </button>
  ),
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
    expect(screen.getByTestId('balance-chain-selector')).toBeTruthy();
  });

  it('turns the page on an arrow key, and from the chain selector', async () => {
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
      fireEvent.click(screen.getByTestId('balance-chain-selector'));
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
      fireEvent.click(screen.getByTestId('balance-chain-selector'));
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
    fireEvent.click(screen.getByTestId('balance-chain-selector'));
    // The page still turns; it just does not travel.
    expect(onBlockchainChange).toHaveBeenCalledWith('bitcoin', 1);
    expect(animate).not.toHaveBeenCalled();
  });

  it('prints the native quantity and no 24h line off mainnet', () => {
    stubDom();
    stubMatchMedia(false);

    render('dark', <BalanceHeader blockchains={DEVNET} activeIndex={0} />);

    // Off mainnet nothing priced the balance: the change is absent rather than
    // an em-dash, which would promise a figure that is merely late.
    expect(screen.queryByTestId('balance-change')).toBeNull();
    expect(screen.getByTestId('balance-amount').textContent).toContain('SOL');
  });
});
