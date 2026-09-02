/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSemantic } from '@salmon/shared';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { PriceChart, buildLinePath, resampleYs } from './PriceChart';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

afterEach(cleanup);

const SERIES = [
  { timestamp: 1, price: 10 },
  { timestamp: 2, price: 11 },
  { timestamp: 3, price: 13 },
];

describe('PriceChart', () => {
  it('selects the period with an underline row — the same travelling rule as the sub-tabs', () => {
    const onPeriodChange = vi.fn();
    renderInMode(
      'dark',
      <PriceChart data={SERIES} selectedPeriod="1M" onPeriodChange={onPeriodChange} />
    );

    expect(screen.getByTestId('price-chart-line')).toBeTruthy();
    fireEvent.click(screen.getByTestId('price-chart-period-1W'));
    expect(onPeriodChange).toHaveBeenCalledWith('1W');
  });

  it('draws the skeleton, never a series, while nothing has resolved', () => {
    renderInMode(
      'dark',
      <PriceChart data={[]} selectedPeriod="1M" onPeriodChange={() => {}} loading />
    );
    expect(screen.queryByTestId('price-chart-line')).toBeNull();
    expect(screen.queryByTestId('price-chart-period-1M')).toBeNull();
  });

  it('keeps the drawn series and attenuates it while the next period is in flight', () => {
    renderInMode(
      'dark',
      <PriceChart data={SERIES} selectedPeriod="1M" onPeriodChange={() => {}} pending />
    );
    const line = screen.getByTestId('price-chart-line');
    expect(line).toBeTruthy();
    expect((line.parentElement as HTMLElement).getAttribute('aria-busy')).toBe('true');
  });

  it.each(['dark', 'light'] as const)(
    'says a failed load in the %s mode’s secondary ink',
    (mode) => {
      renderInMode(
        mode,
        <PriceChart data={[]} selectedPeriod="1M" onPeriodChange={() => {}} error />
      );
      const empty = screen.getByTestId('price-chart-error') as HTMLElement;
      expect(empty.textContent).toBe("Couldn't load chart data");
      expect(empty.style.color).toBe(asRenderedColor(createSemantic(mode).text.secondary));
    }
  );

  it('resamples every series to one point count so two periods morph, not swap', () => {
    const short = resampleYs(SERIES, 100, { min: 10, max: 13 });
    const long = resampleYs([...SERIES, ...SERIES, ...SERIES], 100, { min: 10, max: 13 });
    expect(short.length).toBe(long.length);
    expect(buildLinePath(short, 200).startsWith('M 0 ')).toBe(true);
    expect(buildLinePath([], 200)).toBe('');
  });
});
