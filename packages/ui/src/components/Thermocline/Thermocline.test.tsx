/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { createSemantic } from '@salmon/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asRenderedColor, renderInMode } from '../../test/renderInMode';
import { Thermocline } from './Thermocline';

let reducedTransparency = false;

function stubEnvironment() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-transparency') && reducedTransparency,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

describe('Thermocline (DOM)', () => {
  beforeEach(() => {
    reducedTransparency = false;
    stubEnvironment();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the tint — the translucent ink alone, scrim always painted', () => {
    renderInMode('dark', <Thermocline tier="thin" />);

    expect(screen.getByTestId('thermocline').dataset.rung).toBe('tint');
    expect(screen.getByTestId('thermocline-scrim').style.background).toContain(
      asRenderedColor(createSemantic('dark').surface.membraneThin)
    );
  });

  it('takes the light scrim when the mode is light', () => {
    const light = createSemantic('light').surface.membraneThin;
    expect(light).not.toBe(createSemantic('dark').surface.membraneThin);

    renderInMode('light', <Thermocline tier="thin" />);
    expect(screen.getByTestId('thermocline-scrim').style.background).toContain(
      asRenderedColor(light)
    );
  });

  it('the thick tier is the same material, tinted thicker', () => {
    renderInMode('dark', <Thermocline tier="thick" />);

    expect(screen.getByTestId('thermocline').dataset.rung).toBe('tint');
    expect(screen.getByTestId('thermocline-scrim').style.background).toContain(
      asRenderedColor(createSemantic('dark').surface.membraneThick)
    );
  });

  it('prefers-reduced-transparency collapses to the opaque plane', () => {
    reducedTransparency = true;

    renderInMode('dark', <Thermocline tier="thick" />);

    expect(screen.getByTestId('thermocline').dataset.rung).toBe('opaque');
    expect(screen.getByTestId('thermocline-opaque')).toBeTruthy();
    expect(screen.queryByTestId('thermocline-scrim')).toBeNull();
  });

  it('the membrane field is retired — no field layer renders (2026-09-01)', () => {
    renderInMode('dark', <Thermocline />);

    expect(screen.queryByTestId('thermocline-field')).toBeNull();
  });
});
