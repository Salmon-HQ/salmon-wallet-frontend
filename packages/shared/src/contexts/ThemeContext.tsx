/**
 * ThemeContext — the active appearance mode and the tokens resolved for it.
 *
 * The provider owns one preference ('system' | 'light' | 'dark'), persists it
 * exactly the way `CurrencyContext` persists the display currency, and hands
 * consumers the token objects for the mode that preference resolves to.
 *
 * It does **not** read the OS colour scheme. That reader is platform code —
 * `useColorScheme()` on React Native, `matchMedia('(prefers-color-scheme:
 * dark)')` in a browser — and `packages/shared` has to stay runtime-agnostic,
 * so the app passes it in:
 *
 * ```tsx
 * <ThemeProvider systemScheme={useColorScheme()}>{children}</ThemeProvider>
 * ```
 *
 * @module contexts/ThemeContext
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getStorage, STORAGE_KEYS } from '../storage';
import { createSemantic, type Semantic, type ThemeMode } from '../theme/semantic';
import { createShadows, type ShadowTable } from '../theme/shadows';

// ============================================================================
// Types
// ============================================================================

/** What the user chose. 'system' follows whatever the OS reports. */
export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

/** The scheme the platform reports, or null when it cannot tell. */
export type SystemScheme = 'light' | 'dark' | null;

export interface ThemeContextValue {
  /** The mode actually being rendered. */
  mode: ThemeMode;
  /** The stored preference, which may be 'system'. */
  preference: ThemePreference;
  /** Change the preference (persists to storage). */
  setPreference: (preference: ThemePreference) => Promise<void>;
  /** Tokens for `mode`. */
  semantic: Semantic;
  /** Elevations for `mode`. */
  shadows: ShadowTable;
  /** False until the stored preference has been read back. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export interface ThemeProviderProps {
  children: ReactNode;
  /**
   * The OS colour scheme, supplied by the platform. Under the 'system'
   * preference this is what picks the mode; `null` (or omitted) falls back to
   * dark, which is the mode the product is designed against.
   */
  systemScheme?: SystemScheme;
}

/** Deep water is the default: an unset or unreadable preference lands here. */
const FALLBACK_MODE: ThemeMode = 'dark';

export function ThemeProvider({ children, systemScheme = null }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  // --------------------------------------------------
  // Load saved preference from storage
  // --------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const storage = getStorage();
        const saved = await storage.getItem<string>(STORAGE_KEYS.APPEARANCE);
        if (saved && THEME_PREFERENCES.includes(saved as ThemePreference)) {
          setPreferenceState(saved as ThemePreference);
        }
      } catch (error) {
        console.error('[ThemeContext] Failed to load saved appearance:', error);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // --------------------------------------------------
  // Actions
  // --------------------------------------------------
  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    try {
      const storage = getStorage();
      await storage.setItem(STORAGE_KEYS.APPEARANCE, next);
    } catch (error) {
      console.error('[ThemeContext] Failed to persist appearance:', error);
    }
  }, []);

  const mode: ThemeMode = preference === 'system' ? (systemScheme ?? FALLBACK_MODE) : preference;

  // One `createSemantic` / `createShadows` call per mode, not per render: the
  // token objects are identities that memoised styles are keyed on downstream.
  const semantic = useMemo(() => createSemantic(mode), [mode]);
  const shadows = useMemo(() => createShadows(mode), [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, preference, setPreference, semantic, shadows, ready }),
    [mode, preference, setPreference, semantic, shadows, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access the active mode and its tokens.
 *
 * @throws Error if used outside of ThemeProvider
 *
 * @example
 * ```tsx
 * const { semantic } = useTheme();
 * return <Text style={{ color: semantic.text.primary }}>…</Text>;
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used within a ThemeProvider. ' +
        'Make sure to wrap your app with <ThemeProvider>.'
    );
  }

  return context;
}

export { ThemeContext };
