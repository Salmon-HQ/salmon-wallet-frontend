/**
 * `prefers-reduced-motion` — the DOM's answer to Reanimated's
 * `useReducedMotion()`.
 *
 * Live, like the theme's system-scheme reader: the user can flip the setting
 * while the panel is open, and every motion decision in the kit is taken at
 * render from this hook rather than once at module load.
 */
import { useMemo, useSyncExternalStore } from 'react';

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

/** `true` when the platform asks for motion to be collapsed. */
export function useReducedMotion(): boolean {
  const query = useMemo(
    () =>
      typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(REDUCE_QUERY) : null,
    []
  );

  return useSyncExternalStore(
    (onChange) => {
      query?.addEventListener('change', onChange);
      return () => query?.removeEventListener('change', onChange);
    },
    () => query?.matches ?? false,
    () => false
  );
}
