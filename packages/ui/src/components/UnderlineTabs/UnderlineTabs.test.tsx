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
});
