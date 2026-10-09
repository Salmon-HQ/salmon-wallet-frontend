/**
 * A figure has to fit any phone: it keeps to one line and shrinks rather than
 * wrapping or clipping, and its colour says whether it is a gain.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));

import { fontSize, s, semantic } from '@salmon/shared';
import { StatGrid, StatTile } from './StatTile';

const flatten = (style: unknown) =>
  Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));

describe('StatTile', () => {
  it('shows the label in capitals, the value with its unit, and the caption', () => {
    render(<StatTile label="My stake" value="46,045.70" unit="SKR" caption="≈ $746.73" />);

    expect(screen.getByText('MY STAKE')).toBeTruthy();
    expect(screen.getByText('46,045.70')).toBeTruthy();
    expect(screen.getByText('SKR')).toBeTruthy();
    expect(screen.getByText('≈ $746.73')).toBeTruthy();
  });

  it('keeps the value on one line and lets it shrink to fit', () => {
    render(<StatTile value="46,045.70" size="hero" />);

    const value = screen.getByText('46,045.70');
    expect(value.props.numberOfLines).toBe(1);
    expect(value.props.adjustsFontSizeToFit).toBe(true);
    expect(flatten(value.props.style).fontSize).toBe(s(fontSize.display));
  });

  it('inks a gain with the change-positive token', () => {
    render(<StatTile value="+6,045.71" tone="positive" />);

    expect(flatten(screen.getByText('+6,045.71').props.style).color).toBe(semantic.change.positive);
  });

  it('carries a pill on its label line', () => {
    render(<StatTile label="Price" value="$0.016" pill={{ label: '−4.2%', tone: 'negative' }} />);

    expect(screen.getByText('−4.2%')).toBeTruthy();
  });
});

describe('StatGrid', () => {
  it('gives every figure an equal share of the row', () => {
    render(
      <StatGrid
        testID="grid"
        items={[
          { key: 'earned', label: 'Earned', value: '1', testID: 'earned' },
          { key: 'available', label: 'Available', value: '0', testID: 'available' },
        ]}
      />
    );

    for (const id of ['earned', 'available']) {
      const style = flatten(screen.getByTestId(id).props.style);
      expect(style.flex).toBe(1);
      expect(style.minWidth).toBe(0);
    }
    expect(flatten(screen.getByTestId('grid').props.style).flexDirection).toBe('row');
  });
});
