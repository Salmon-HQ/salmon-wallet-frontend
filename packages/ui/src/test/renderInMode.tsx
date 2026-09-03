/**
 * Render a kit component under a known mode.
 *
 * The shared `ThemeProvider` resolves `preference: 'system'` against the
 * `systemScheme` it is handed, so passing the mode as the system scheme is
 * enough to pin a test to dark or light without touching storage. Every kit
 * test uses this so "both modes" means the same thing everywhere.
 */
import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { ThemeProvider, type ThemeMode } from '@salmon/shared';

export function renderInMode(mode: ThemeMode, node: React.ReactNode): RenderResult {
  return render(<ThemeProvider systemScheme={mode}>{node}</ThemeProvider>);
}

/** The CSS colour string jsdom normalises a token to, for style comparisons. */
export function asRenderedColor(token: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = token;
  return probe.style.backgroundColor;
}
