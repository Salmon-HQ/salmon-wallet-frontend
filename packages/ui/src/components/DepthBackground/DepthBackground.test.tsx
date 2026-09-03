/**
 * @vitest-environment jsdom
 *
 * The water column's ground on the DOM: one static ramp, drawn from the
 * mode-active tokens. Nothing moves — marine snow is retired, and with it the
 * drift clock, the parallax and the reduced-motion branch.
 */
import React from 'react';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createSemantic } from '@salmon/shared';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { DepthBackground } from './DepthBackground';

afterEach(cleanup);

describe('DepthBackground: the ramp', () => {
  it('draws the gradient ramp from the mode-active tokens', () => {
    const { container } = renderInMode('dark', <DepthBackground />);
    const ground = container.firstElementChild as HTMLElement;
    const gradient = createSemantic('dark').water.gradient;
    expect(ground.style.backgroundImage).toContain('linear-gradient');
    expect(ground.style.backgroundColor).toBeTruthy();
    expect(ground.style.backgroundImage).toContain(asRenderedColor(gradient[gradient.length - 1]));
  });

  it('draws the light ramp when the mode is light', () => {
    const { container } = renderInMode('light', <DepthBackground />);
    const ground = container.firstElementChild as HTMLElement;
    const darkGradient = createSemantic('dark').water.gradient;
    expect(ground.style.backgroundImage).not.toContain(
      asRenderedColor(darkGradient[darkGradient.length - 1])
    );
  });

  it('is one still layer — nothing to animate, nothing under it', () => {
    const { container } = renderInMode('dark', <DepthBackground />);
    const ground = container.firstElementChild as HTMLElement;
    expect(ground.children).toHaveLength(0);
    expect(ground.getAttribute('aria-hidden')).toBe('true');
  });
});
