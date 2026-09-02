/**
 * @vitest-environment jsdom
 *
 * The seigaiha motif serialised into a repeating `background-image` data
 * URI — the DOM alternative to the mobile `react-native-svg` pattern. See
 * DESIGN.md §The water column for why the DOM never mounts a live
 * full-viewport `<svg><pattern>` here.
 */
import React from 'react';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createSemantic } from '@salmon/shared';

import { renderInMode } from '../../test/renderInMode';
import { ScalesBackground } from './ScalesBackground';

afterEach(cleanup);

describe('ScalesBackground (DOM)', () => {
  it('draws the deep field as a repeating background-image data URI', () => {
    const { container } = renderInMode('dark', <ScalesBackground variant="deepField" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.backgroundImage).toContain('data:image/svg+xml');
    expect(el.style.backgroundRepeat).toBe('repeat');
  });

  it('the deep field fades downward via a mask rather than to nothing', () => {
    const { container } = renderInMode('dark', <ScalesBackground variant="deepField" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.maskImage).toContain('linear-gradient');
  });

  it('the stroke differs between modes, reading the active tokens', () => {
    const darkStroke = createSemantic('dark').scales.deepFieldStroke;
    const lightStroke = createSemantic('light').scales.deepFieldStroke;
    expect(darkStroke).not.toBe(lightStroke);

    const dark = renderInMode('dark', <ScalesBackground variant="deepField" />);
    const darkImage = (dark.container.firstElementChild as HTMLElement).style.backgroundImage;
    cleanup();
    const light = renderInMode('light', <ScalesBackground variant="deepField" />);
    const lightImage = (light.container.firstElementChild as HTMLElement).style.backgroundImage;

    expect(darkImage).not.toBe(lightImage);
  });

  it('the refraction sweep masks the sweep gradient with the tile instead of painting it', () => {
    const { container } = renderInMode('dark', <ScalesBackground variant="refraction" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.backgroundImage).toContain('linear-gradient(to right');
    expect(el.style.maskImage).toContain('data:image/svg+xml');
  });

  it('an explicit strokeColor overrides the variant default', () => {
    const { container } = renderInMode(
      'dark',
      <ScalesBackground variant="fish" strokeColor="#123456" />
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.backgroundImage).toContain(encodeURIComponent('#123456'));
  });
});
