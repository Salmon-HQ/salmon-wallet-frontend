/**
 * @vitest-environment jsdom
 *
 * jsdom has none of `ResizeObserver` or `Element.animate` — stubbed here,
 * the same pattern `UnderlineTabs.test.tsx` uses.
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { PortfolioSubTabs } from './PortfolioSubTabs';

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
});
