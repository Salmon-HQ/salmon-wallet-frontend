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

  /** The one global rule that paints the ring on plain DOM + MUI controls. */
  const globalRing = (): Record<string, unknown> => {
    const entry = Object.entries(cssBaseline()).find(([selector]) =>
      selector.startsWith(':focus-visible')
    );
    expect(entry, 'no global :focus-visible rule in CssBaseline').toBeDefined();
    return entry![1];
  };

  it('ships a global focus-visible ring that also covers plain DOM elements', () => {
    const ring = globalRing();

    expect(ring.outline).toContain(semantic.state.focusVisible);
    expect(ring.boxShadow).toContain(semantic.depth.abyss);
  });

  it('draws the ring inside the border box so clipping ancestors cannot eat it', () => {
    const ring = globalRing();

    // Almost every focusable in this app sits inside a `BlurContainer` or a
    // scroll container with `overflow: hidden`. An offset ring gets cut off
    // there, so both halves must point inward.
    expect(ring.outlineOffset).toBe(`-${semantic.state.focusRingWidth}px`);
    expect(ring.boxShadow).toContain('inset');
  });

  it('outranks the MUI resets that silently ate the ring', () => {
    // `.MuiButtonBase-root` ships `outline: 0` (0-1-0) and
    // `.MuiButton-disableElevation` ships `box-shadow: none` (0-2-0), both
    // injected after CssBaseline. The global selectors are repeated to reach
    // 0-3-0; drop a repeat and the ring disappears from real controls while
    // every unit test here still passes.
    const selector = Object.keys(cssBaseline()).find((s) => s.startsWith(':focus-visible'));

    expect(selector?.match(/:focus-visible/g)).toHaveLength(3);
  });

  it('removes an outline only where the node is not the control it belongs to', () => {
    const removals = Object.entries(cssBaseline())
      .filter(([, rules]) => rules?.outline === 'none')
      .map(([selector]) => selector);

    // Pointer focus is not owed a ring; and the inner `<input>` of a MUI
    // field (plus the visually hidden `<input>` in Switch/Checkbox/Radio) is
    // never the control's visual boundary — ringing it drew a hard-cornered
    // rectangle inside the real, rounded control. Anything else appearing
    // here is a ring being deleted rather than relocated.
    expect([...removals].sort()).toEqual(
      [
        '.MuiInputBase-input:focus-visible:focus-visible, .MuiButtonBase-root input:focus-visible:focus-visible',
        ':focus:not(:focus-visible)',
      ].sort()
    );
  });

  it('relocates the field ring to the element that owns the field shape', () => {
    const boundary = Object.entries(cssBaseline()).find(([selector]) =>
      selector.startsWith('.MuiInputBase-root')
    );

    expect(boundary, 'inner input ring suppressed with nothing taking it over').toBeDefined();
    expect(boundary![1].outline).toContain(semantic.state.focusVisible);
  });
});
