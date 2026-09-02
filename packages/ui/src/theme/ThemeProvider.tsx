/**
 * The DOM side of the theme — the same contract mobile has, on the browser.
 *
 * `packages/shared` owns the preference (persisted in
 * `STORAGE_KEYS.APPEARANCE`) and resolves the tokens for the active mode, but
 * it cannot read the OS colour scheme: that reader is platform code. Here it
 * is `matchMedia('(prefers-color-scheme: dark)')`, live, so a system switch
 * moves the app while it is open.
 *
 * Mounting this provider does three things: it feeds the shared provider the
 * system scheme, it writes the resolved tokens onto the document root as
 * `--sw-*` custom properties (plus `color-scheme`), and it supplies the MUI
 * theme for the active mode — MUI sits *inside*, so a mode change rebuilds it.
 *
 * The hooks below are deliberately named and shaped like the mobile ones
 * (`apps/mobile/src/theme/useThemedStyles.ts`), so a component ported from RN
 * keeps reading `t.text.primary` off `useSemantic()` unchanged.
 */
import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import type { Semantic, ShadowTable, SystemScheme, ThemeMode } from '@salmon/shared';
import {
  ThemeContext,
  semantic as deepWater,
  shadows as deepWaterShadows,
  ThemeProvider as SharedThemeProvider,
} from '@salmon/shared';

import { applySemanticCssVars } from './cssVars';
import { salmonThemeFor } from './index';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Stands in when the `@salmon/shared` barrel was mocked without the context —
 * the same guard mobile carries, for the same reason: `useContext(undefined)`
 * throws, and a component test that never asked for a theme would fail on
 * that instead of on what it was written to check.
 */
const ABSENT_THEME = createContext<{ mode: ThemeMode; semantic: Semantic } | null>(null);
const THEME = (ThemeContext ?? ABSENT_THEME) as typeof ABSENT_THEME;

/** The active theme, or deep water when nothing provides one. */
function useThemeOrDeepWater(): { mode: ThemeMode; semantic: Semantic; shadows?: ShadowTable } {
  return useContext(THEME) ?? { mode: 'dark', semantic: deepWater };
}

/** The OS colour scheme, live. `null` where `matchMedia` is unavailable. */
export function useSystemScheme(): SystemScheme {
  const query = useMemo(
    () =>
      typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(DARK_QUERY) : null,
    []
  );

  return useSyncExternalStore(
    (onChange) => {
      query?.addEventListener('change', onChange);
      return () => query?.removeEventListener('change', onChange);
    },
    () => (query ? (query.matches ? 'dark' : 'light') : null),
    () => null
  );
}

/** Writes the active tokens onto the document root and supplies MUI's theme. */
function ThemeSurface({ children }: { children: React.ReactNode }) {
  const { mode, semantic } = useThemeOrDeepWater();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      applySemanticCssVars(document.documentElement, semantic, mode);
    }
  }, [mode, semantic]);

  return <MuiThemeProvider theme={salmonThemeFor(mode)}>{children}</MuiThemeProvider>;
}

/**
 * The app-root provider. Wrap the tree in it once, above `<CssBaseline />`.
 */
export function SalmonThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemScheme();

  return (
    <SharedThemeProvider systemScheme={systemScheme}>
      <ThemeSurface>{children}</ThemeSurface>
    </SharedThemeProvider>
  );
}

/** The active mode's tokens — the DOM twin of mobile's `useSemantic()`. */
export function useSemantic(): Semantic {
  return useThemeOrDeepWater().semantic;
}

/** The active mode, for the places where the drawing changes, not a colour. */
export function useThemeMode(): ThemeMode {
  return useThemeOrDeepWater().mode;
}

/** The active mode's elevations. */
export function useShadows(): ShadowTable {
  return useThemeOrDeepWater().shadows ?? deepWaterShadows;
}
