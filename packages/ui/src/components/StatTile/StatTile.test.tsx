/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { StatGrid, StatTile } from './StatTile';

afterEach(cleanup);

describe('StatTile', () => {
  it('shows the label in capitals, the value with its unit, and the caption', () => {
    renderInMode(
      'dark',
      <StatTile label="My stake" value="46,045.70" unit="SKR" caption="≈ $746.73" />
    );

    expect(screen.getByText('MY STAKE')).toBeTruthy();
    expect(screen.getByText('SKR')).toBeTruthy();
    expect(screen.getByText('≈ $746.73')).toBeTruthy();
  });

  it('keeps the value on one line and ends it with an ellipsis rather than overflowing', () => {
    renderInMode('dark', <StatTile value="46,045.70" size="hero" />);

    const value = screen.getByText('46,045.70');
    expect(value.style.whiteSpace).toBe('nowrap');
    expect(value.style.textOverflow).toBe('ellipsis');
  });

  it('inks a gain with the change-positive token', () => {
    renderInMode('dark', <StatTile value="+6,045.71" tone="positive" />);

    expect(screen.getByText('+6,045.71').style.color).toBe(
      asRenderedColor(createSemantic('dark').change.positive)
    );
  });

  it('sets its pill beside the figure, centred on the tile', () => {
    renderInMode(
      'dark',
      <StatTile
        testID="price"
        label="Price"
        value="$0.016"
        pill={{ label: '−4.2%', tone: 'negative' }}
      />
    );

    expect(screen.getByText('−4.2%')).toBeTruthy();
    expect(screen.getByTestId('price').style.flexDirection).toBe('row');
    expect(screen.getByTestId('price').style.alignItems).toBe('center');
  });

  it('closes the value line with a note at the end, in its tone', () => {
    renderInMode(
      'dark',
      <StatTile value="5.03B" note={{ text: '70.38% of circulating', tone: 'accent' }} />
    );

    expect(screen.getByText('70.38% of circulating').style.color).toBe(
      asRenderedColor(createSemantic('dark').accent.ink)
    );
  });

  it("reads its digits in the font's own widths, not table columns", () => {
    renderInMode('dark', <StatTile value="46,045.71" size="hero" />);

    expect(screen.getByText('46,045.71').style.fontVariantNumeric).toBe('');
  });
});

describe('StatGrid', () => {
  it('gives every figure an equal share of the row', () => {
    renderInMode(
      'dark',
      <StatGrid
        testID="grid"
        items={[
          { key: 'earned', label: 'Earned', value: '1', testID: 'earned' },
          { key: 'available', label: 'Available', value: '0', testID: 'available' },
        ]}
      />
    );

    for (const id of ['earned', 'available']) {
      expect(screen.getByTestId(id).style.flex).toMatch(/^1/);
      expect(screen.getByTestId(id).style.minWidth).toBe('0px');
    }
    expect(screen.getByTestId('grid').style.display).toBe('flex');
  });
});
