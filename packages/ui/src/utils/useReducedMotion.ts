/**
 * The DOM expression of the reduce-motion signal.
 *
 * CSS transitions already collapse under the global
 * `@media (prefers-reduced-motion: reduce)` block in `theme/index.ts`, but a
 * transition driven from JS also needs the *timer* that swaps content at the
 * midpoint to collapse with it — otherwise the visual step lands 90ms after the
 * user's click for no reason. Components pass this boolean to
 * `resolveMotionMs` from `@salmon/shared`, exactly as mobile passes Reanimated's
 * `useReducedMotion()`.
 */
import { useEffect, useState } from 'react';
import { reducedMotion } from '@salmon/shared';

export function useReducedMotion(): boolean {
  const [enabled, setEnabled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(reducedMotion.query).matches === true
  );

  useEffect(() => {
    const query = window.matchMedia?.(reducedMotion.query);
    if (!query) return;
    const onChange = (event: MediaQueryListEvent) => setEnabled(event.matches);
    setEnabled(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return enabled;
}
