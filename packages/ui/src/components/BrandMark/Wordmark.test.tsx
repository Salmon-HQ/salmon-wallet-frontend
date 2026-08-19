/**
 * @vitest-environment jsdom
 *
 * The product's name is a graphic, not the flow's heading token — but it must
 * still read as the name of the screen to a screen reader.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@salmon/shared', async () => {
  const theme = await import('../../../../shared/src/theme');
  return { ...theme };
});

import {
  fontSize,
  onboardingMarkTitleGap,
  wordmarkAspectRatio,
  wordmarkText,
} from '../../../../shared/src/theme';
import { Wordmark } from './Wordmark';

afterEach(cleanup);

describe('Wordmark', () => {
  it('draws at the token the text it replaced was set from', () => {
    render(<Wordmark />);
    const svg = screen.getByTestId('wordmark');
    expect(svg.getAttribute('height')).toBe(String(fontSize.headline));
    expect(svg.getAttribute('width')).toBe(String(fontSize.headline * wordmarkAspectRatio));
  });

  it('carries its own name for a screen reader, as the heading of the screen', () => {
    render(<Wordmark />);
    const svg = screen.getByRole('heading', { level: 1 });
    expect(svg.getAttribute('aria-label')).toBe(wordmarkText);
  });

  it('centres itself and pins its own gap, whatever slot it lands in', () => {
    // A vector has no `textAlign`, so the slot cannot centre it — the
    // component says where it goes, mirroring the React Native twin.
    render(<Wordmark />);
    const style = screen.getByTestId('wordmark').style;
    expect(style.alignSelf).toBe('center');
    // The grid's own fish→title air — the same distance success keeps between
    // its mark and "Congratulations!" (owner, 2026-08-18).
    expect(style.marginTop).toBe(`${onboardingMarkTitleGap}px`);
    expect(style.marginBottom).toBe('auto');
  });
});
