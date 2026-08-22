/**
 * @vitest-environment jsdom
 *
 * The shimmer is decorative: under the OS reduce-motion flag the sweep must
 * not run, and the resting gradient must stay so the placeholder leaves no
 * visual hole. The guard is pure CSS (`@media (prefers-reduced-motion:
 * reduce)`), so the observable surface in jsdom is the stylesheet the
 * component installs.
 */
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The shared barrel drags react-native into a jsdom suite, so the tokens the
// skeleton reads are mocked with plausible literals — the test asserts the
// media guard, not the token values.
vi.mock('@salmon/shared', () => ({
  colors: {
    card: { background: '#101418', border: '#1d232b' },
    skeleton: { base: 'rgba(255,255,255,0.05)', highlight: 'rgba(255,255,255,0.1)' },
  },
  spacing: { xxs: 2, xs: 4, md: 12, lg: 16 },
  borderRadius: { sm: 4, md: 8, xl: 16 },
  borderWidth: { thin: 1 },
  componentSizes: {
    checkboxSize: 20,
    iconSizeXs: 16,
    shimmerOffset: 200,
    shimmerWidth: 400,
    skeletonBalanceWidth: 60,
  },
  durationMs: { shimmer: 1500 },
  easing: { easeInOut: 'ease-in-out' },
  reducedMotion: { query: '(prefers-reduced-motion: reduce)' },
}));

const reducedMotion = { query: '(prefers-reduced-motion: reduce)' };

const { DerivedAccountCardSkeleton } = await import('./DerivedAccountCardSkeleton');

afterEach(cleanup);

describe('DerivedAccountCardSkeleton', () => {
  it('runs the shimmer sweep as an animation, and calms it under reduce-motion', () => {
    render(<DerivedAccountCardSkeleton />);

    const css = document.head.innerHTML;
    expect(css).toContain('animation');
    // The calm variant is declared for the same rects: the media block turns
    // the sweep off while the gradient itself stays painted.
    expect(css).toContain(reducedMotion.query.slice(1, -1));
    expect(css).toContain('animation:none');
  });
});
