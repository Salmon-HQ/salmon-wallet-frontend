/**
 * @vitest-environment jsdom
 *
 * Regression guard for the DOM test-label contract: PrimaryButton must
 * forward `testID` to `data-testid` (Playwright's default selector) and
 * render an accessible button. These ids are referenced by the
 * apps/extension and apps/web Playwright suites.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mirror the repo convention: styled(Component)(styles) → the original
// Component, so the real MUI Button renders (it forwards data-testid and
// exposes role="button").
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
      deepFieldHeight: 180,
      fishStroke: 'rgba(7, 9, 17, 0.10)',
      fishScale: 1,
    },
    flesh: { band: '#FFF1EE' },
  },
  fleshTile: { width: 380, height: 40 },
  fleshFades: [],
  fleshTiledStrokes: [],
  palette: { salmon: { 500: '#FF5C45', 600: '#E64A34' }, neutral: { 0: '#FFFFFF', 1000: '#070911' } },
  colors: { button: { primaryBackground: '#fff', primaryText: '#000', disabledOpacity: 0.5 } },
  componentSizes: { buttonMinWidth: 64, buttonHeight: 48, buttonRadius: 12 },
  fontFamily: { sans: 'sans-serif' },
  fontSize: { md: 16 },
  fontWeight: { bold: 700 },
  letterSpacing: { widest: '1px' },
  shadowsCSS: { none: 'none' },
  opacity: { soft: 0.8 },
  duration: { normal: '200ms', fastest: '80ms' },
  easing: { ease: 'ease' },
}));

import { PrimaryButton } from './PrimaryButton';

describe('PrimaryButton (DOM test-label contract)', () => {
  it('forwards testID to data-testid and exposes an accessible button', () => {
    render(
      <PrimaryButton testID="lock-unlock-button" onClick={() => {}}>
        Unlock
      </PrimaryButton>
    );

    const byTestId = screen.getByTestId('lock-unlock-button');
    const byRole = screen.getByRole('button', { name: 'Unlock' });
    expect(byTestId).toBe(byRole);
  });

  it('omits data-testid when no testID is provided', () => {
    render(<PrimaryButton onClick={() => {}}>Submit</PrimaryButton>);

    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button.getAttribute('data-testid')).toBeNull();
  });
});
