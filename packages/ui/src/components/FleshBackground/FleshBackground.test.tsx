/**
 * @vitest-environment jsdom
 *
 * The DOM mirror of the mobile test: the component renders the marbled
 * drawing — every fill in `fleshFills`, as pattern paths.
 */
import React from 'react';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createSemantic, fleshFills } from '@salmon/shared';

import { renderInMode } from '../../test/renderInMode';
import { FleshBackground } from './FleshBackground';

afterEach(cleanup);

describe('FleshBackground (DOM)', () => {
  it('renders the marbled drawing', () => {
    const { container } = renderInMode('dark', <FleshBackground />);
    expect(container.querySelectorAll('pattern path').length).toBe(fleshFills.length);
  });

  it('draws the dark band from the active tokens by default', () => {
    const { container } = renderInMode('dark', <FleshBackground />);
    const paths = container.querySelectorAll('pattern path');
    expect(paths[0].getAttribute('fill')).toBe(createSemantic('dark').flesh.band);
  });

  it('the band is theme-invariant by ruling — same ink in both modes', () => {
    const light = createSemantic('light').flesh.band;
    expect(light).toBe(createSemantic('dark').flesh.band);

    const { container } = renderInMode('light', <FleshBackground />);
    const paths = container.querySelectorAll('pattern path');
    expect(paths[0].getAttribute('fill')).toBe(light);
  });

  it('an explicit color prop overrides the theme-active band', () => {
    const { container } = renderInMode('dark', <FleshBackground color="#ABCDEF" />);
    const paths = container.querySelectorAll('pattern path');
    expect(paths[0].getAttribute('fill')).toBe('#ABCDEF');
  });
});
