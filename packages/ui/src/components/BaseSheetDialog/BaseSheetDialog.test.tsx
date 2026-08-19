/**
 * @vitest-environment jsdom
 *
 * What this suite protects: the sheet's ground. A sheet is a membrane, and
 * the thermocline is the material a membrane is made of — see DESIGN.md
 * §The thermocline is the sheet material. The rules that can regress are the
 * default (a sheet grounds on the thick tier), the override (a caller's own
 * ground wins outright), and the one that cost the most to learn: the
 * material carries exactly one scales layer, because a second copy reads as
 * a band — see §The membrane field.
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// `@salmon/shared` pulls React Native through its barrel, which Vitest cannot
// parse. Same treatment as the other component suites here: mock the tokens
// the dialog and the material read.
vi.mock('@salmon/shared', () => ({
  colors: {
    background: { primary: '#0B0F19', secondary: '#111624' },
    border: { default: '#58637B' },
  },
  borderRadius: { xl: 20 },
  spacing: { none: 0, sm: 8, md: 12, xl: 16, '2xl': 24 },
  componentSizes: {
    sheetWidthSm: 360,
    sheetWidthBase: 400,
    sheetWidthMd: 440,
    sheetWidthXl: 520,
    sheetMaxHeight: 720,
  },
  semantic: {
    surface: {
      raised: '#161C2D',
      crest: '#111624',
      membraneThin: 'rgba(11, 15, 25, 0.62)',
      membraneThick: 'rgba(11, 15, 25, 0.80)',
    },
    scales: { membraneFieldStroke: 'rgba(7, 9, 17, 0.45)' },
  },
}));

// The seigaiha drawing is pinned by its own suite; here it only needs to be
// countable, because the rule under test is how many copies of it exist.
vi.mock('../ScalesBackground', () => ({
  ScalesBackground: ({ variant }: { variant: string }) => (
    <div data-testid="scales-background" data-variant={variant} />
  ),
}));

import { BaseSheetDialog } from './BaseSheetDialog';

afterEach(() => {
  cleanup();
});

describe('BaseSheetDialog ground', () => {
  it('grounds on the thermocline by default', () => {
    render(
      <BaseSheetDialog visible onClose={vi.fn()}>
        <div>sheet body</div>
      </BaseSheetDialog>
    );

    expect(screen.getByTestId('thermocline')).toBeTruthy();
    expect(screen.getByText('sheet body')).toBeTruthy();
  });

  it('lets an explicit background win, and does not draw the default too', () => {
    render(
      <BaseSheetDialog visible onClose={vi.fn()} background={<div data-testid="own-ground" />}>
        <div>sheet body</div>
      </BaseSheetDialog>
    );

    expect(screen.getByTestId('own-ground')).toBeTruthy();
    expect(screen.queryByTestId('thermocline')).toBeNull();
  });

  it('carries exactly one scales layer — a second copy would read as a band', () => {
    render(
      <BaseSheetDialog visible onClose={vi.fn()}>
        <div>sheet body</div>
      </BaseSheetDialog>
    );

    expect(screen.getAllByTestId('scales-background')).toHaveLength(1);
  });
});
