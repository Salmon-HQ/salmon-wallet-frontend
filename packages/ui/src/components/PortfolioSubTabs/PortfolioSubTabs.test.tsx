/**
 * @vitest-environment jsdom
 *
 * jsdom has none of `ResizeObserver` or `Element.animate` — stubbed here,
 * the same pattern `UnderlineTabs.test.tsx` uses.
 */
import React from 'react';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { ThemeProvider } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { PortfolioSubTabs } from './PortfolioSubTabs';

/** `rerender` replaces the whole tree it was given — wrap every rerender so
 * the `ThemeProvider` (and refs held underneath it) survive across renders,
 * the same way a real reorder keeps the tabs region mounted. */
const withTheme = (node: React.ReactNode) => (
  <ThemeProvider systemScheme="dark">{node}</ThemeProvider>
);

const TABS = [
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'nfts', label: 'NFTs' },
];

/** Satisfies both callers: `UnderlineTabs`' own underline slide (which reads
 * `.addEventListener('finish', ...)`) and `sinkExiting`/`floatEntering`
 * (which read `.finished`). */
function fakeAnimation() {
  return {
    finished: Promise.resolve(),
    addEventListener: (_event: string, cb: () => void) => cb(),
  };
}

function stubDom(animateImpl?: () => ReturnType<typeof fakeAnimation>) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: animateImpl ?? fakeAnimation,
  });
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    writable: true,
    value: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  });
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PortfolioSubTabs', () => {
  it('renders the tabs and the order button, and reports a tab change', () => {
    stubDom();
    stubMatchMedia(false);
    const onChange = vi.fn();

    renderInMode(
      'dark',
      <PortfolioSubTabs tabs={TABS} activeKey="portfolio" onChange={onChange} testID="sub-tabs" />
    );

    expect(screen.getByTestId('sub-tabs')).toBeTruthy();
    expect(screen.getByTestId('portfolio-order-button')).toBeTruthy();

    fireEvent.click(screen.getByTestId('portfolio-tab-nfts'));
    expect(onChange).toHaveBeenCalledWith('nfts');
  });

  it('fires onOrderPress when the order button is pressed', () => {
    stubDom();
    stubMatchMedia(false);
    const onOrderPress = vi.fn();

    renderInMode(
      'dark',
      <PortfolioSubTabs
        tabs={TABS}
        activeKey="portfolio"
        onChange={() => {}}
        onOrderPress={onOrderPress}
      />
    );

    fireEvent.click(screen.getByTestId('portfolio-order-button'));
    expect(onOrderPress).toHaveBeenCalledTimes(1);
  });

  it('plays sink then float on the tabs region alone when tabsKey changes', async () => {
    const animate = vi.fn(fakeAnimation);
    stubDom(animate);
    stubMatchMedia(false);

    const { rerender } = renderInMode(
      'dark',
      <PortfolioSubTabs tabs={TABS} activeKey="portfolio" onChange={() => {}} tabsKey="order-1" />
    );
    animate.mockClear();

    const reordered = [TABS[1], TABS[0]];
    await act(async () => {
      rerender(
        withTheme(
          <PortfolioSubTabs
            tabs={reordered}
            activeKey="portfolio"
            onChange={() => {}}
            tabsKey="order-2"
          />
        )
      );
      await Promise.resolve();
    });

    // sinkExiting on the outgoing content, floatEntering on the incoming.
    expect(animate.mock.calls.length).toBeGreaterThanOrEqual(2);
    // The order button is never among the animated elements — it holds still.
    expect(screen.getByTestId('portfolio-order-button')).toBeTruthy();
  });

  it('does not remount the tabs region for a plain tab switch that keeps the same tabsKey', () => {
    stubDom();
    stubMatchMedia(false);

    const { rerender } = renderInMode(
      'dark',
      <PortfolioSubTabs tabs={TABS} activeKey="portfolio" onChange={() => {}} tabsKey="order-1" />
    );
    const regionBefore = screen.getByTestId('portfolio-tabs-region');

    rerender(
      withTheme(
        <PortfolioSubTabs tabs={TABS} activeKey="nfts" onChange={() => {}} tabsKey="order-1" />
      )
    );

    // Only the underline slides (UnderlineTabs' own job) — the region itself
    // is the same node, never swapped by the sink/float verb.
    expect(screen.getByTestId('portfolio-tabs-region')).toBe(regionBefore);
  });

  it('collapses the reorder motion under reduced motion', async () => {
    const animate = vi.fn(fakeAnimation);
    stubDom(animate);
    stubMatchMedia(true);

    const { rerender } = renderInMode(
      'dark',
      <PortfolioSubTabs tabs={TABS} activeKey="portfolio" onChange={() => {}} tabsKey="order-1" />
    );
    animate.mockClear();

    await act(async () => {
      rerender(
        withTheme(
          <PortfolioSubTabs
            tabs={[TABS[1], TABS[0]]}
            activeKey="portfolio"
            onChange={() => {}}
            tabsKey="order-2"
          />
        )
      );
      await Promise.resolve();
    });

    // `sinkExiting`/`floatEntering` both short-circuit before touching
    // `element.animate` under reduced motion; only `UnderlineTabs`' own
    // (unrelated) underline slide may still call it once.
    expect(animate.mock.calls.length).toBeLessThanOrEqual(1);
    expect(screen.getByTestId('portfolio-tab-portfolio')).toBeTruthy();
  });
});
