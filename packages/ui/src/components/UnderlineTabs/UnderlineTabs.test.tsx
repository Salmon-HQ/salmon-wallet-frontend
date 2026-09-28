/**
 * @vitest-environment jsdom
 *
 * jsdom has none of `ResizeObserver`, `Element.animate`, or real layout, so
 * they are stubbed here — the same pattern `DepthBackground.test.tsx` uses.
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { UnderlineTabs } from './UnderlineTabs';

const TABS = [
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'nfts', label: 'NFTs' },
];

function stubDom(): { animate: ReturnType<typeof vi.fn> } {
  const animate = vi.fn(() => ({
    addEventListener: (_event: string, cb: () => void) => cb(),
  }));

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
    value: animate,
  });
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    writable: true,
    value: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  });

  return { animate };
}

/**
 * Controls whether the row overflows (`row.scrollWidth` vs.
 * `scroller.clientWidth`, both read off `HTMLElement.prototype` since jsdom's
 * real values are always 0) and stubs `scrollBy`/`scrollTo`, which jsdom does
 * not implement (the latter is called by the existing
 * scroll-active-tab-into-view effect once overflowing is true). Always call
 * this explicitly — the stubbed getters are prototype-wide and persist
 * across tests in this file. `scrollLeft` is jsdom's own plain stored
 * property — set it directly, then fire `scroll` to re-run `measure()`.
 */
function stubOverflowMetrics(overflowing = true): { scrollBy: ReturnType<typeof vi.fn> } {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => 100,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get: () => (overflowing ? 300 : 100),
  });
  const scrollBy = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
    configurable: true,
    writable: true,
    value: scrollBy,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
  return { scrollBy };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('UnderlineTabs', () => {
  it('marks the active tab selected and reports the chosen key on click', () => {
    stubDom();
    const onChange = vi.fn();
    renderInMode(
      'dark',
      <UnderlineTabs
        tabs={TABS}
        activeKey="portfolio"
        onChange={onChange}
        tabTestIDPrefix="sub-tab"
      />
    );

    expect(screen.getByTestId('sub-tab-portfolio').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('sub-tab-nfts').getAttribute('aria-selected')).toBe('false');

    fireEvent.click(screen.getByTestId('sub-tab-nfts'));
    expect(onChange).toHaveBeenCalledWith('nfts');
  });

  it('never mounts two DOM shapes: the scroller is always present', () => {
    stubDom();
    renderInMode(
      'dark',
      <UnderlineTabs
        testID="sub-tabs"
        tabs={TABS}
        activeKey="portfolio"
        onChange={vi.fn()}
        tabTestIDPrefix="sub-tab"
      />
    );

    expect(screen.getByTestId('sub-tabs-scroll')).toBeTruthy();
    expect(screen.getByRole('tablist')).toBeTruthy();
  });

  it('moves and selects with ArrowRight / ArrowLeft (roving tabindex)', () => {
    stubDom();
    const onChange = vi.fn();
    renderInMode(
      'dark',
      <UnderlineTabs
        tabs={TABS}
        activeKey="portfolio"
        onChange={onChange}
        tabTestIDPrefix="sub-tab"
      />
    );

    const portfolioTab = screen.getByTestId('sub-tab-portfolio');
    expect(portfolioTab.tabIndex).toBe(0);
    expect(screen.getByTestId('sub-tab-nfts').tabIndex).toBe(-1);

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('nfts');
  });

  it('jumps to the ends with Home / End', () => {
    stubDom();
    const onChange = vi.fn();
    renderInMode(
      'dark',
      <UnderlineTabs
        tabs={TABS}
        activeKey="portfolio"
        onChange={onChange}
        tabTestIDPrefix="sub-tab"
      />
    );

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('nfts');
  });

  it('ignores a horizontal wheel while the row is not overflowing', () => {
    stubDom();
    renderInMode(
      'dark',
      <UnderlineTabs testID="sub-tabs" tabs={TABS} activeKey="portfolio" onChange={vi.fn()} />
    );

    // The stub `ResizeObserver` never calls back, so `isOverflowing` stays
    // `false` — the safe default — and the wheel handler is a no-op.
    const scroller = screen.getByTestId('sub-tabs-scroll') as HTMLDivElement;
    fireEvent.wheel(scroller, { deltaX: 40 });
    expect(scroller.scrollLeft).toBe(0);
  });

  it('gives a tab a line height in pixels, not a bare multiplier', () => {
    // A unitless number is a multiplier of the font size on the DOM: each
    // tab became `font × snug` lines tall and the underline sat a screen
    // below its label. The row must hug the text.
    stubDom();
    renderInMode(
      'dark',
      <UnderlineTabs tabs={TABS} activeKey="portfolio" onChange={vi.fn()} tabTestIDPrefix="tab" />
    );

    const tab = screen.getByTestId('tab-portfolio') as HTMLButtonElement;
    expect(tab.style.lineHeight).toMatch(/^\d+(\.\d+)?px$/);
  });

  it('shows no scroll arrows when the row fits, even while hovered', () => {
    stubDom();
    stubOverflowMetrics(false);
    renderInMode(
      'dark',
      <UnderlineTabs testID="sub-tabs" tabs={TABS} activeKey="portfolio" onChange={vi.fn()} />
    );

    fireEvent.mouseEnter(screen.getByTestId('sub-tabs'));
    expect(screen.queryByTestId('sub-tabs-scroll-leading')).toBeNull();
    expect(screen.queryByTestId('sub-tabs-scroll-trailing')).toBeNull();
  });

  it('snaps the tabs clear of the arrows instead of reserving room for them', () => {
    stubDom();
    stubOverflowMetrics(false);
    const { unmount } = renderInMode(
      'dark',
      <UnderlineTabs testID="sub-tabs" tabs={TABS} activeKey="portfolio" onChange={vi.fn()} />
    );
    // A row that fits neither snaps nor insets: there is no arrow anywhere.
    const fitting = screen.getByTestId('sub-tabs-scroll') as HTMLElement;
    expect(fitting.style.scrollSnapType).toBe('none');
    expect(parseFloat(fitting.style.scrollPaddingInline)).toBe(0);
    unmount();

    stubOverflowMetrics(true);
    renderInMode(
      'dark',
      <UnderlineTabs
        testID="sub-tabs"
        tabTestIDPrefix="sub-tab"
        tabs={TABS}
        activeKey="portfolio"
        onChange={vi.fn()}
      />
    );
    const scroller = screen.getByTestId('sub-tabs-scroll') as HTMLElement;
    // No layout reserved on either side — the arrows overlay the row.
    expect(scroller.style.marginLeft).toBe('');
    expect(scroller.style.marginRight).toBe('');
    // What keeps a tab from resting under a chevron is the snap, halting at
    // the padded edge of the scroller rather than at its real one.
    expect(scroller.style.scrollSnapType).toBe('inline mandatory');
    expect(parseFloat(scroller.style.scrollPaddingInline)).toBeGreaterThan(0);
    expect((screen.getByTestId('sub-tab-portfolio') as HTMLElement).style.scrollSnapAlign).toBe(
      'start'
    );

    // Scrolling changes nothing about the row's box: no gutter is born, so
    // nothing the eye is holding slides sideways.
    scroller.scrollLeft = 100;
    fireEvent.scroll(scroller);
    expect(scroller.style.marginLeft).toBe('');
    expect(scroller.scrollLeft).toBe(100);
  });

  it('hovering an overflowing row at rest shows only the trailing arrow', () => {
    stubDom();
    stubOverflowMetrics(true);
    renderInMode(
      'dark',
      <UnderlineTabs testID="sub-tabs" tabs={TABS} activeKey="portfolio" onChange={vi.fn()} />
    );

    // Mounted alongside its fade (so it can fade in), but invisible and
    // unclickable before the row is hovered. The fade and the pointer gate
    // live on the slot that carries the well, not on the well itself: the
    // kit's bubble draws its own transform.
    const trailingSlot = screen.getByTestId('sub-tabs-scroll-trailing')
      .parentElement as HTMLElement;
    expect(trailingSlot.style.opacity).toBe('0');
    expect(trailingSlot.style.pointerEvents).toBe('none');
    expect(screen.queryByTestId('sub-tabs-scroll-leading')).toBeNull();

    fireEvent.mouseEnter(screen.getByTestId('sub-tabs'));
    expect(screen.queryByTestId('sub-tabs-scroll-leading')).toBeNull();
    expect(trailingSlot.style.opacity).toBe('1');
    expect(trailingSlot.style.pointerEvents).toBe('auto');
  });

  it('shows both arrows once the row has scrolled past the start', () => {
    stubDom();
    stubOverflowMetrics(true);
    renderInMode(
      'dark',
      <UnderlineTabs testID="sub-tabs" tabs={TABS} activeKey="portfolio" onChange={vi.fn()} />
    );

    const scroller = screen.getByTestId('sub-tabs-scroll') as HTMLDivElement;
    scroller.scrollLeft = 100;
    fireEvent.scroll(scroller);
    fireEvent.mouseEnter(screen.getByTestId('sub-tabs'));

    expect(screen.getByTestId('sub-tabs-scroll-leading')).toBeTruthy();
    expect(screen.getByTestId('sub-tabs-scroll-trailing')).toBeTruthy();
  });

  it('shows only the leading arrow once the row rests at the end', () => {
    stubDom();
    stubOverflowMetrics(true);
    renderInMode(
      'dark',
      <UnderlineTabs testID="sub-tabs" tabs={TABS} activeKey="portfolio" onChange={vi.fn()} />
    );

    const scroller = screen.getByTestId('sub-tabs-scroll') as HTMLDivElement;
    scroller.scrollLeft = 200; // maxOffset = contentWidth(300) - containerWidth(100)
    fireEvent.scroll(scroller);
    fireEvent.mouseEnter(screen.getByTestId('sub-tabs'));

    expect(screen.getByTestId('sub-tabs-scroll-leading')).toBeTruthy();
    expect(screen.queryByTestId('sub-tabs-scroll-trailing')).toBeNull();
  });

  it('clicking an arrow scrolls the row toward that edge', () => {
    stubDom();
    const { scrollBy } = stubOverflowMetrics(true);
    renderInMode(
      'dark',
      <UnderlineTabs testID="sub-tabs" tabs={TABS} activeKey="portfolio" onChange={vi.fn()} />
    );

    fireEvent.mouseEnter(screen.getByTestId('sub-tabs'));
    fireEvent.click(screen.getByTestId('sub-tabs-scroll-trailing'));
    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ left: expect.any(Number), behavior: 'smooth' })
    );
    expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0);

    scrollBy.mockClear();
    const scroller = screen.getByTestId('sub-tabs-scroll') as HTMLDivElement;
    scroller.scrollLeft = 200;
    fireEvent.scroll(scroller);
    fireEvent.click(screen.getByTestId('sub-tabs-scroll-leading'));
    expect(scrollBy.mock.calls[0][0].left).toBeLessThan(0);
  });

  it('keeps the scroll arrows out of the accessibility tree and the tab order', () => {
    stubDom();
    stubOverflowMetrics(true);
    renderInMode(
      'dark',
      <UnderlineTabs testID="sub-tabs" tabs={TABS} activeKey="portfolio" onChange={vi.fn()} />
    );

    const scroller = screen.getByTestId('sub-tabs-scroll') as HTMLDivElement;
    scroller.scrollLeft = 100;
    fireEvent.scroll(scroller);
    fireEvent.mouseEnter(screen.getByTestId('sub-tabs'));

    const leading = screen.getByTestId('sub-tabs-scroll-leading');
    const trailing = screen.getByTestId('sub-tabs-scroll-trailing');
    for (const arrow of [leading, trailing]) {
      expect(arrow.getAttribute('aria-hidden')).toBe('true');
      expect((arrow as HTMLButtonElement).tabIndex).toBe(-1);
    }
  });
});

describe('UnderlineTabs while the set is still being read', () => {
  it('a tab that joins before `settled` gets no motion; one that joins after does', () => {
    const { animate } = stubDom();
    const onChange = vi.fn();
    const draw = (tabs: typeof TABS, settled: boolean) => (
      <UnderlineTabs
        tabs={tabs}
        activeKey="portfolio"
        onChange={onChange}
        tabTestIDPrefix="sub-tab"
        settled={settled}
      />
    );
    const { rerender } = renderInMode('dark', draw(TABS, false));
    animate.mockClear();

    // Hydration lands a third tab: it is simply there.
    rerender(draw([...TABS, { key: 'payments', label: 'Payments' }], false));
    expect(screen.getByTestId('sub-tab-payments')).toBeTruthy();
    expect(animate).not.toHaveBeenCalled();

    rerender(draw([...TABS, { key: 'payments', label: 'Payments' }], true));
    expect(animate).not.toHaveBeenCalled();

    // The user installs one: it grows in.
    rerender(
      draw([...TABS, { key: 'payments', label: 'Payments' }, { key: 'memo', label: 'Memo' }], true)
    );
    expect(animate).toHaveBeenCalled();
  });
});
