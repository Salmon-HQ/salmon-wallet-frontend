import { describe, expect, it, vi } from 'vitest';
import { semantic } from '../../../shared/src/theme';

// The `@salmon/shared` barrel pulls React Native in, which Vitest cannot parse
// (every other test in this package mocks it for the same reason). The theme
// only reads design tokens, and the token barrel is plain TypeScript, so the
// mock is the real tokens rather than stand-ins.
vi.mock('@salmon/shared', () => import('../../../shared/src/theme'));

const { salmonTheme } = await import('./index');

type StyleRules = Record<string, Record<string, unknown>>;

const cssBaseline = (): StyleRules =>
  salmonTheme.components?.MuiCssBaseline?.styleOverrides as StyleRules;

describe('salmonTheme', () => {
  it('runs a dark palette on the depth tokens', () => {
    expect(salmonTheme.palette.mode).toBe('dark');
    expect(salmonTheme.palette.background.default).toBe(semantic.depth.column);
    expect(salmonTheme.palette.background.paper).toBe(semantic.surface.shelf);
  });

  it('never puts white text on a salmon fill', () => {
    // White measures 3.06:1 on salmon-500 and fails AA; `text.onAccent` is the
    // only legal ink on that fill.
    expect(salmonTheme.palette.primary.contrastText).toBe(semantic.text.onAccent);
  });

  it('ships a global focus-visible ring that also covers plain DOM elements', () => {
    const ring = cssBaseline()['*:focus-visible, .Mui-focusVisible'];

    expect(ring.outline).toContain(semantic.state.focusVisible);
    expect(ring.boxShadow).toContain(semantic.depth.abyss);
  });

  it('removes an outline only for pointer focus, which is not owed a ring', () => {
    const removals = Object.entries(cssBaseline())
      .filter(([, rules]) => rules?.outline === 'none')
      .map(([selector]) => selector);

    expect(removals).toEqual([':focus:not(:focus-visible)']);
  });
});
