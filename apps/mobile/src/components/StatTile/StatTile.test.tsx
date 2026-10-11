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

  it('keeps the value and its unit on one line that shrinks to fit, as one', () => {
    render(<StatTile value="46,045.70" unit="SKR" size="hero" />);

    const value = screen.getByText('46,045.70');
    const unit = screen.getByText('SKR');
    // One line of text holds both, so the unit follows the figure at a
    // space's distance however much the line shrinks.
    const line = value.parent!.parent!;
    expect(unit.parent!.parent).toBe(line);
    expect(line.props.numberOfLines).toBe(1);
    expect(line.props.adjustsFontSizeToFit).toBe(true);
    expect(flatten(value.props.style).fontSize).toBe(s(fontSize.display));
  });

  it('inks a gain with the change-positive token', () => {
    render(<StatTile value="+6,045.71" tone="positive" />);

    expect(flatten(screen.getByText('+6,045.71').props.style).color).toBe(semantic.change.positive);
  });

  it('sets its pill beside the figure, centred on the tile', () => {
    render(
      <StatTile
        testID="price"
        label="Price"
        value="$0.016"
        pill={{ testID: 'change', label: '−4.2%', tone: 'negative' }}
      />
    );

    expect(screen.getByText('−4.2%')).toBeTruthy();
    const tile = flatten(screen.getByTestId('price').props.style);
    expect(tile.flexDirection).toBe('row');
    expect(tile.alignItems).toBe('center');
  });

  it('closes the value line with a note at the end, in its tone', () => {
    render(<StatTile value="5.03B" note={{ text: '70.38% of circulating', tone: 'accent' }} />);

    const note = flatten(screen.getByText('70.38% of circulating').props.style);
    expect(note.color).toBe(semantic.accent.ink);
  });

  it("reads its digits in the font's own widths, not table columns", () => {
    render(<StatTile value="46,045.71" size="hero" />);

    expect(flatten(screen.getByText('46,045.71').props.style).fontVariant).toBeUndefined();
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
