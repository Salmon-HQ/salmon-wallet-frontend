/**
 * Each bar is a share of the tallest, so the row reads the same on any phone
 * width; the newest one is lit, and a screen reader hears what the row is.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { BarChart } from './BarChart';

const flatten = (style: unknown) =>
  Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));

describe('BarChart', () => {
  it('draws each value as a share of the tallest, the newest lit', () => {
    render(<BarChart testID="bars" values={[20, 40, 30]} accessibilityLabel="Last payouts" />);

    const heights = [0, 1, 2].map(
      (i) => flatten(screen.getByTestId(`bars-bar-${i}`).props.style).height
    );
    expect(heights).toEqual(['50%', '100%', '75%']);
    const last = flatten(screen.getByTestId('bars-bar-2').props.style).backgroundColor;
    expect(last).not.toBe(flatten(screen.getByTestId('bars-bar-0').props.style).backgroundColor);
    expect(screen.getByLabelText('Last payouts')).toBeTruthy();
  });
});
