/**
 * @vitest-environment jsdom
 *
 * The secondary line is one text run that ellipsises at its end. Split into
 * flex segments, the side panel's 400 rendered "S$104.48": the ticker clipped
 * mid-glyph and the separator gone.
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
      { formatValue: (value: number) => `$${value.toFixed(2)}` },
    ],
  };
});

const { TokenListItem } = await import('./TokenListItem');

afterEach(cleanup);

const sol = {
  name: 'Solana',
  symbol: 'SOL',
  logo: undefined,
  price: 104.48,
  uiAmount: 0.020065379,
  usdBalance: 2.09,
  last24HoursChange: { perc: 0.67 },
};

describe('TokenListItem', () => {
  it('draws the secondary line as one text run that ellipsises at its end', () => {
    renderInMode('dark', <TokenListItem token={sol as never} />);

    const subline = screen.getByTestId('token-row-subline-SOL');
    expect(subline.textContent).toBe('SOL · $104.48 · +0.67%');
    expect(subline.style.whiteSpace).toBe('nowrap');
    expect(subline.style.textOverflow).toBe('ellipsis');
    expect(subline.style.overflow).toBe('hidden');
    // No segment is a flex item of its own — a flex child with `overflow:
    // hidden` is what let the ticker be clipped ahead of the name column.
    expect(subline.style.display).not.toBe('flex');
    for (const child of Array.from(subline.children)) {
      expect((child as HTMLElement).style.flexShrink).toBe('');
      expect((child as HTMLElement).style.overflow).toBe('');
    }
  });
});
