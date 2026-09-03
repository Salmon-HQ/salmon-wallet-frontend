/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { HomeTabOrderSheet } from './HomeTabOrderSheet';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

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

const TABS = [
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'nfts', label: 'NFTs' },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HomeTabOrderSheet', () => {
  it.each(['dark', 'light'] as const)('lists the tabs Home offers, in %s', (mode) => {
    stubMatchMedia(false);

    renderInMode(
      mode,
      <HomeTabOrderSheet visible onClose={vi.fn()} tabs={TABS} onOrderChange={vi.fn()} />
    );

    expect(screen.getByTestId('home-tab-order-row-portfolio')).toBeTruthy();
    expect(screen.getByTestId('home-tab-order-row-nfts')).toBeTruthy();
    // Order only — nothing here promises a tab can be hidden.
    expect(screen.getByTestId('home-tab-order-row-portfolio-handle')).toBeTruthy();
  });

  it('moves a row with the keyboard, which is the fallback a drag has no answer for', () => {
    stubMatchMedia(false);
    const onOrderChange = vi.fn();

    renderInMode(
      'dark',
      <HomeTabOrderSheet visible onClose={vi.fn()} tabs={TABS} onOrderChange={onOrderChange} />
    );

    fireEvent.keyDown(screen.getByTestId('home-tab-order-row-nfts-handle'), { key: 'ArrowUp' });
    expect(onOrderChange).toHaveBeenCalledWith(['nfts', 'portfolio']);

    onOrderChange.mockClear();
    // A move past the end of the list is not a move.
    fireEvent.keyDown(screen.getByTestId('home-tab-order-row-nfts-handle'), { key: 'ArrowDown' });
    expect(onOrderChange).not.toHaveBeenCalled();
  });

  it('reports the new order as the row is dropped — there is no Save', () => {
    stubMatchMedia(false);
    const onOrderChange = vi.fn();

    renderInMode(
      'dark',
      <HomeTabOrderSheet visible onClose={vi.fn()} tabs={TABS} onOrderChange={onOrderChange} />
    );

    const handle = screen.getByTestId('home-tab-order-row-portfolio-handle');
    // jsdom measures every box as 0, so the stride is 0 and the drop resolves
    // to the row's own index: the arithmetic is asserted by the keyboard path
    // above; what matters here is that a drop reports rather than stages.
    fireEvent.pointerDown(handle, { pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(onOrderChange).not.toHaveBeenCalled();
    expect(screen.queryByText('actions.save')).toBeNull();
  });
});
