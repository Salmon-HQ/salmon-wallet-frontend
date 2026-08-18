/**
 * The product's name is a graphic, not the flow's heading token.
 *
 * That distinction is what lets the welcome screen show "Salmon" at twice the
 * size without touching the one title token every other screen shares.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
}));

import {
  fontSize,
  onboardingIdentityGridFull,
  semantic,
  spacing,
  wordmarkAspectRatio,
  wordmarkText,
} from '@salmon/shared';
import { Wordmark } from './Wordmark';

describe('Wordmark', () => {
  it('draws at the token the text it replaced was set from', () => {
    // Locked to the flow's heading size, so the drawn name cannot drift from
    // the typography. It was enlarged once and taken back down.
    render(<Wordmark />);
    const svg = screen.getByTestId('wordmark');
    expect(svg.props.height).toBe(fontSize.headline);
    expect(svg.props.width).toBe(fontSize.headline * wordmarkAspectRatio);
  });

  it('stays narrower than the mark it sits under', () => {
    // A name wider than the mark stops being a lockup and starts competing.
    render(<Wordmark />);
    expect(screen.getByTestId('wordmark').props.width).toBeLessThan(
      onboardingIdentityGridFull.markSize
    );
  });

  it('centres itself and pins its own gap, whatever slot it lands in', () => {
    // The regression this replaces: measured at x=24 on both a Pixel 9 Pro and
    // an iPhone 17 — flush against the band's left padding, under a centred
    // mark. A vector has no `textAlign`, so the slot could not centre it.
    render(<Wordmark />);
    const style = screen.getByTestId('wordmark').props.style;
    const flat = (Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean);
    const merged = Object.assign({}, ...flat);
    expect(merged.alignSelf).toBe('center');
    expect(merged.marginTop).toBe(spacing.md);
    expect(merged.marginBottom).toBe('auto');
  });

  it('is white, and still readable as the name of the screen', () => {
    render(<Wordmark />);
    const argb = (hex: string) => (0xff000000 + parseInt(hex.slice(1), 16)) >>> 0;
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain(String(argb(semantic.text.primary)));
    expect(json).not.toContain(String(argb(semantic.text.accent)));
    // Drawn, so it carries its own name for a screen reader.
    expect(screen.getByTestId('wordmark').props.accessibilityLabel).toBe(wordmarkText);
  });
});
