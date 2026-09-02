/**
 * @vitest-environment jsdom
 *
 * What this suite protects: the sheet's ground. A sheet is a membrane, and
 * the thermocline is the material a membrane is made of — see DESIGN.md
 * §The thermocline is the sheet material. The rules that can regress are the
 * default (a sheet grounds on the thick tier) and the override (a caller's
 * own ground wins outright).
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

  it('carries no scales layer — the membrane field is retired (2026-09-01)', () => {
    render(
      <BaseSheetDialog visible onClose={vi.fn()}>
        <div>sheet body</div>
      </BaseSheetDialog>
    );

    expect(screen.queryByTestId('scales-background')).toBeNull();
  });
});
