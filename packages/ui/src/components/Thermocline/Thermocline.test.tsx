/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `@salmon/shared` pulls React Native through its barrel, which Vitest cannot
// parse. Same treatment as the other component suites here: mock the tokens
// the material reads.
vi.mock('@salmon/shared', () => ({
  semantic: {
    surface: {
      raised: '#161C2D',
      crest: '#111624',
      membraneThin: 'rgba(11, 15, 25, 0.62)',
      membraneThick: 'rgba(11, 15, 25, 0.80)',
    },
    scales: {
      refractionScale: 0.5,
      refractionOpacity: 0.08,
      refractionHeight: 24,
      refractionSweep: ['#9FE0EF', '#FF9E8B', '#7BEFCB'],
    },
  },
}));

vi.mock('../ScalesBackground', () => ({
  ScalesBackground: ({ variant }: { variant: string }) => (
    <div data-testid="scales-background" data-variant={variant} />
  ),
}));

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
    render(<Thermocline tier="thin" />);

    expect(screen.getByTestId('thermocline').dataset.rung).toBe('tint');
    expect(screen.getByTestId('thermocline-scrim')).toBeTruthy();
  });

  it('the thick tier is the same material, tinted thicker', () => {
    render(<Thermocline tier="thick" />);

    expect(screen.getByTestId('thermocline').dataset.rung).toBe('tint');
    expect(screen.getByTestId('thermocline-scrim')).toBeTruthy();
  });

  it('prefers-reduced-transparency collapses to the opaque plane', () => {
    reducedTransparency = true;

    render(<Thermocline tier="thick" />);

    expect(screen.getByTestId('thermocline').dataset.rung).toBe('opaque');
    expect(screen.getByTestId('thermocline-opaque')).toBeTruthy();
    expect(screen.queryByTestId('thermocline-scrim')).toBeNull();
  });

  describe('the refraction strip', () => {
    it('is part of the material, mounted by default', () => {
      render(<Thermocline />);

      expect(screen.getByTestId('thermocline-refraction')).toBeTruthy();
      expect(screen.getByTestId('scales-background').dataset.variant).toBe('refraction');
    });

    it('stays mounted on the opaque rung', () => {
      reducedTransparency = true;

      render(<Thermocline />);

      expect(screen.getByTestId('thermocline-refraction')).toBeTruthy();
    });

    it('can be turned off', () => {
      render(<Thermocline refraction={false} />);

      expect(screen.queryByTestId('thermocline-refraction')).toBeNull();
    });
  });
});
