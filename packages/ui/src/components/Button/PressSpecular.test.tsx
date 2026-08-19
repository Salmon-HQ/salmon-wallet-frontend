/**
 * @vitest-environment jsdom
 *
 * The press specular on the DOM (DESIGN.md §Shadow Vocabulary): a 12% radial
 * of `water.light` at the touch point, `screen` blend, shown at `:active`.
 * What jsdom can assert is the contract, not the pixels: the layer is mounted
 * inside both buttons, it disappears with the fill when the control is
 * disabled, and a pointer press records the touch point the highlight centres
 * on. The `:active` opacity and the reduce-motion step are CSS — the global
 * `prefers-reduced-motion` collapse turns the `flick` fade into a state
 * change, which is what mobile does under reduce.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mirror the repo convention: styled(Component)(styles) → the original
// Component, so the real MUI Button renders.
vi.mock('../../utils/styled', () => ({
  styled: (Component: React.ElementType) => () => Component,
}));

vi.mock('@salmon/shared', () => ({
  semantic: {
    surface: { shelf: '#10131C', raised: '#161C2D', crest: '#1B2233', bedrock: '#0B0F19' },
    text: { primary: '#EDF1F7', secondary: '#A7B1C4', tertiary: '#8B96AD', disabled: '#6F7B95' },
    border: { default: '#58637B', raised: '#6F7B95', strong: '#8B96AD' },
    scales: {
      deepFieldStroke: 'rgba(199, 211, 232, 0.06)',
      deepFieldScale: 3.2,
      fishStroke: 'rgba(7, 9, 17, 0.10)',
      fishScale: 1,
    },
    flesh: { band: '#FFF1EE' },
    water: { light: '#9FE0EF' },
  },
  motionDuration: { flick: '90ms' },
  motionEasing: { current: { css: 'cubic-bezier(0.32, 0.72, 0, 1)' } },
  fleshTile: { width: 380, height: 40 },
  fleshFades: [],
  fleshTiledStrokes: [],
  fleshVariantTiles: { marbled: { width: 150, height: 88 }, chevron: { width: 144, height: 84 } },
  fleshVariantFills: { marbled: [], chevron: [] },
  palette: { salmon: { 500: '#FF5C45', 600: '#E64A34' }, neutral: { 0: '#FFFFFF', 1000: '#070911' } },
  colors: {
    button: {
      primaryBackground: '#fff',
      primaryText: '#000',
      secondaryBackground: '#222',
      secondaryText: '#EDF1F7',
      disabledOpacity: 0.5,
    },
    background: { card: '#111' },
    border: { default: '#444' },
  },
  componentSizes: { buttonMinWidth: 64, buttonHeight: 48, buttonRadius: 12, buttonFleshScale: 1 },
  fontFamily: { sans: 'sans-serif' },
  fontSize: { bodyLg: 16 },
  fontWeight: { bold: 700 },
  letterSpacing: { widest: '1px' },
  shadowsCSS: { none: 'none', bezel: 'none' },
  opacity: { soft: 0.8 },
  duration: { normal: '200ms', fastest: '80ms' },
  easing: { ease: 'ease' },
}));

import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

describe('the press specular on the DOM buttons', () => {
  afterEach(cleanup);

  it('mounts the specular layer inside the primary button', () => {
    render(<PrimaryButton onClick={() => {}}>Send</PrimaryButton>);

    const button = screen.getByRole('button', { name: 'Send' });
    const layer = screen.getByTestId('press-specular');
    expect(button.contains(layer)).toBe(true);
    // Decorative light, never content.
    expect(layer.getAttribute('aria-hidden')).toBe('true');
  });

  it('mounts the specular layer inside the secondary button', () => {
    render(<SecondaryButton onClick={() => {}}>Cancel</SecondaryButton>);

    const button = screen.getByRole('button', { name: 'Cancel' });
    expect(button.contains(screen.getByTestId('press-specular'))).toBe(true);
  });

  it('is absent when the control is disabled — the light only touches a live control', () => {
    render(
      <>
        <PrimaryButton onClick={() => {}} disabled>
          Send
        </PrimaryButton>
        <SecondaryButton onClick={() => {}} loading>
          Cancel
        </SecondaryButton>
      </>
    );

    expect(screen.queryByTestId('press-specular')).toBeNull();
  });

  it('records the touch point so the highlight appears under the pointer', () => {
    render(<PrimaryButton onClick={() => {}}>Send</PrimaryButton>);

    const button = screen.getByRole('button', { name: 'Send' });
    fireEvent.pointerDown(button, { clientX: 42, clientY: 17 });

    // jsdom's rects are 0×0, so the point is the client coordinate itself.
    expect(button.style.getPropertyValue('--specular-x')).toBe('42px');
    expect(button.style.getPropertyValue('--specular-y')).toBe('17px');
  });
});
