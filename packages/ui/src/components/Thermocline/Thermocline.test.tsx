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

// The debug switch, made mutable so each variant can be exercised.
let mockVariant: 'glass' | 'opaque' | 'tint' = 'glass';
vi.mock('./thermoclineVariant', () => ({
  get thermoclineVariant() {
    return mockVariant;
  },
}));

import { Thermocline } from './Thermocline';

let reducedTransparency = false;
let backdropSupported = true;

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
  vi.stubGlobal('CSS', {
    supports: vi.fn().mockImplementation(() => backdropSupported),
  });
}

describe('Thermocline (DOM)', () => {
  beforeEach(() => {
    mockVariant = 'glass';
    reducedTransparency = false;
    backdropSupported = true;
    stubEnvironment();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('fixed chrome with backdrop-filter support takes the blur rung, scrim always painted', () => {
    render(<Thermocline surface="chrome" tier="thin" />);

    expect(screen.getByTestId('thermocline').dataset.rung).toBe('blur');
    expect(screen.getByTestId('thermocline-scrim')).toBeTruthy();
  });

  it('a sheet never blurs on the DOM — rung 4 is fixed-chrome-only', () => {
    render(<Thermocline surface="sheet" tier="thick" />);

    expect(screen.getByTestId('thermocline').dataset.rung).toBe('tint');
    expect(screen.getByTestId('thermocline-scrim')).toBeTruthy();
  });

  it('without @supports the tint alone holds the floor', () => {
    backdropSupported = false;

    render(<Thermocline surface="chrome" />);

    expect(screen.getByTestId('thermocline').dataset.rung).toBe('tint');
    expect(screen.getByTestId('thermocline-scrim')).toBeTruthy();
  });

  it('prefers-reduced-transparency collapses to the opaque plane', () => {
    reducedTransparency = true;

    render(<Thermocline surface="chrome" tier="thick" />);

    expect(screen.getByTestId('thermocline').dataset.rung).toBe('opaque');
    expect(screen.getByTestId('thermocline-opaque')).toBeTruthy();
    expect(screen.queryByTestId('thermocline-scrim')).toBeNull();
  });

  describe('the debug variant switch', () => {
    it("'opaque' renders rung 5 as the identity", () => {
      mockVariant = 'opaque';

      render(<Thermocline surface="chrome" />);

      expect(screen.getByTestId('thermocline').dataset.rung).toBe('opaque');
    });

    it("'tint' renders the translucent ink without blur", () => {
      mockVariant = 'tint';

      render(<Thermocline surface="chrome" />);

      expect(screen.getByTestId('thermocline').dataset.rung).toBe('tint');
      expect(screen.getByTestId('thermocline-scrim')).toBeTruthy();
    });

    it('the OS signal outranks the variant', () => {
      mockVariant = 'tint';
      reducedTransparency = true;

      render(<Thermocline surface="chrome" />);

      expect(screen.getByTestId('thermocline').dataset.rung).toBe('opaque');
    });
  });

  describe('the refraction strip', () => {
    it('is part of the material, mounted by default', () => {
      render(<Thermocline surface="chrome" />);

      expect(screen.getByTestId('thermocline-refraction')).toBeTruthy();
      expect(screen.getByTestId('scales-background').dataset.variant).toBe('refraction');
    });

    it('stays mounted on the opaque rung', () => {
      reducedTransparency = true;

      render(<Thermocline surface="chrome" />);

      expect(screen.getByTestId('thermocline-refraction')).toBeTruthy();
    });

    it('can be turned off', () => {
      render(<Thermocline surface="chrome" refraction={false} />);

      expect(screen.queryByTestId('thermocline-refraction')).toBeNull();
    });
  });
});
