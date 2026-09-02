/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { SkeletonRow } from './SkeletonRow';

afterEach(cleanup);

describe('SkeletonRow', () => {
  it('renders a single row, exposing testID and label', () => {
    renderInMode('dark', <SkeletonRow testID="row" accessibilityLabel="Loading" />);
    const row = screen.getByTestId('row');
    expect(row.getAttribute('aria-label')).toBe('Loading');
  });

  it('renders one Card per count', () => {
    renderInMode('dark', <SkeletonRow testID="rows" count={3} />);
    // Each row is a Card (a div with a border) — three shimmer leading marks confirm three rows.
    const leadingMarks = document.querySelectorAll('[style*="border-radius: 20px"]');
    expect(leadingMarks.length).toBeGreaterThanOrEqual(3);
  });

  it('draws the dark skeleton ground inside its shimmer rects', () => {
    renderInMode('dark', <SkeletonRow testID="row" />);
    const bands = document.querySelectorAll('div[style*="background:"]');
    expect(bands.length).toBeGreaterThan(0);
  });

  it('takes a different ground in light mode', () => {
    const dark = createSemantic('dark').skeleton.base;
    const light = createSemantic('light').skeleton.base;
    expect(dark).not.toBe(light);

    renderInMode('light', <SkeletonRow testID="row" />);
    const band = document.querySelector('[data-testid="row"] div[style*="linear-gradient"]');
    const shimmerRoot = band?.parentElement as HTMLDivElement;
    expect(shimmerRoot.style.backgroundColor).toBe(asRenderedColor(light));
  });

  it('renders one shimmer rect per placeholder — leading mark, title and subtitle', () => {
    renderInMode('dark', <SkeletonRow testID="row" />);
    // lines defaults to 2 and no trailingWidth: leading + title + subtitle = 3 bands.
    const bands = document.querySelectorAll('div[style*="linear-gradient"]');
    expect(bands.length).toBe(3);
  });
});
