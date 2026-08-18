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
  lineHeight,
  semantic,
  spacing,
  wordmarkAspectRatio,
  wordmarkText,
} from '@salmon/shared';
import { Wordmark } from './Wordmark';

describe('Wordmark', () => {
  it('fills the title band but for one gap, so it never touches the mark', () => {
    // The band is bottom-anchored, so the subtraction surfaces as air above
    // the wordmark. Filling the band exactly measured a 0.0dp gap on device,
    // with the cap height flush against the mark's lower fin.
    render(<Wordmark />);
    const svg = screen.getByTestId('wordmark');
    const titleLine = Math.round(fontSize.headline * lineHeight.tight);
    expect(svg.props.height).toBe(2 * titleLine - spacing.md);
    expect(svg.props.width).toBe(svg.props.height * wordmarkAspectRatio);
  });

  it('is far larger than the title token drew it, at no cost to that token', () => {
    // "¿Y si agrandamos Salmon?" — the name is a graphic, so the flow keeps
    // exactly one heading size.
    render(<Wordmark />);
    const oneTitleLine = Math.round(fontSize.headline * lineHeight.tight);
    expect(screen.getByTestId('wordmark').props.height).toBeGreaterThan(1.5 * oneTitleLine);
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
