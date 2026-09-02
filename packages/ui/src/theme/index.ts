/**
 * The DOM theme — what is left once MUI left (2026-09-02, spec 028 lot 4
 * close): the focus ring, and nothing else. Every token reaches the kit
 * through `useSemantic()` (`./ThemeProvider`) or the `--sw-*` custom
 * properties (`./cssVars`); the global baseline that used to ride on
 * `CssBaseline` is `<Global>` inside `SalmonThemeProvider`.
 */
import { semantic } from '@salmon/shared';

/** The ring's geometry is mode-invariant; its inks follow the live mode. */
const { focusRingWidth, focusRingOffset } = semantic.state;

/**
 * The focus ring, drawn *inside* the control's border box.
 *
 * Inset because almost every focusable surface sits inside a clipping
 * ancestor (a sheet, a scroll container): an outline pulled inward is never
 * clipped and inherits the control's own `border-radius`. The `depth.abyss`
 * band beneath the salmon is a separator: `state.focusVisible` measures
 * 9.29:1 on `surface.shelf` but only 1.53:1 on a salmon `accent.fill` button;
 * `depth.abyss` measures 6.50:1 on that same fill. Whichever surface the ring
 * lands on, one of the two bands clears the 3:1 WCAG 2.2 1.4.11 asks of a
 * focus indicator. Never replaced by a bare `outline: none`.
 */
export const focusRing = {
  outline: `${focusRingWidth}px solid var(--sw-state-focusVisible)`,
  outlineOffset: `-${focusRingWidth}px`,
  boxShadow: `inset 0 0 0 ${focusRingWidth + focusRingOffset}px var(--sw-depth-abyss)`,
} as const;

/**
 * Opt-out for a field whose visual boundary is an outer wrapper rather than
 * the input itself. Pair it with `focusRingOnWrapper` on the wrapper.
 */
export const focusRingNone = {
  outline: 'none',
  boxShadow: 'none',
} as const;

/** The ring, for a wrapper that owns a field's shape. See `focusRingNone`. */
export const focusRingOnWrapper = focusRing;
