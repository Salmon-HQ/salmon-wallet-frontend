/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { BarChart } from './BarChart';

afterEach(cleanup);

describe('BarChart', () => {
  it('draws each value as a share of the tallest, the newest lit', () => {
    renderInMode(
      'dark',
      <BarChart testID="bars" values={[20, 40, 30]} accessibilityLabel="Last payouts" />
    );

    const heights = [0, 1, 2].map((i) => screen.getByTestId(`bars-bar-${i}`).style.height);
    expect(heights).toEqual(['50%', '100%', '75%']);
    expect(screen.getByTestId('bars-bar-2').style.backgroundColor).not.toBe(
      screen.getByTestId('bars-bar-0').style.backgroundColor
    );
    expect(screen.getByRole('img', { name: 'Last payouts' })).toBeTruthy();
  });
});
