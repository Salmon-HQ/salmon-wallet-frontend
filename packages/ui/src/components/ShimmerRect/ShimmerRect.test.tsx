/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { ShimmerRect } from './ShimmerRect';

afterEach(cleanup);

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('ShimmerRect', () => {
  it('grounds the container on the dark skeleton base', () => {
    const { container } = renderInMode('dark', <ShimmerRect width={100} height={16} />);

    const root = container.firstElementChild as HTMLDivElement;
    expect(root.style.backgroundColor).toBe(asRenderedColor(createSemantic('dark').skeleton.base));
  });

  it('takes the light skeleton base when the mode is light', () => {
    const light = createSemantic('light').skeleton.base;
    expect(light).not.toBe(createSemantic('dark').skeleton.base);

    const { container } = renderInMode('light', <ShimmerRect width={100} height={16} />);
    const root = container.firstElementChild as HTMLDivElement;
    expect(root.style.backgroundColor).toBe(asRenderedColor(light));
  });

  it('runs the band as a keyframe animation by default', () => {
    mockReducedMotion(false);
    const { container } = renderInMode('dark', <ShimmerRect width={100} height={16} />);

    const root = container.firstElementChild as HTMLDivElement;
    const band = root.firstElementChild as HTMLDivElement;
    expect(band.style.animation).toContain('sw-shimmer-band');
    expect(document.head.innerHTML).toContain('@keyframes sw-shimmer-band');
  });

  it('never starts the loop under reduced motion, parking the band off-view', () => {
    mockReducedMotion(true);
    const { container } = renderInMode('dark', <ShimmerRect width={100} height={16} />);

    const root = container.firstElementChild as HTMLDivElement;
    const band = root.firstElementChild as HTMLDivElement;
    expect(band.style.animation).toBe('');
    expect(band.style.transform).toContain('translateX(-200px)');
  });
});
