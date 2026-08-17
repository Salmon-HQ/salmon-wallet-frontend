/**
 * useWaitGate — decides whether a wait is long enough to deserve a screen.
 *
 * A waiting screen is information, and information that appears and leaves
 * inside a quarter of a second is noise. Two thresholds, both tokens:
 *
 * - `motionMs.waitDelay` (400ms): below this the wait screen never mounts, and
 *   the caller goes straight from the decision to the result.
 * - `motionMs.waitMinVisible` (600ms): once it has mounted it stays at least
 *   this long, or `waitDelay` would only move the flicker rather than remove
 *   it (a 410ms wait would show the screen for 10ms).
 *
 * These are **gates, not transitions**: `resolveMotionMs` must not be applied
 * to them. A reduced-motion user reads the same words for the same time; what
 * reduced motion removes is travel, not information.
 *
 * The gate never delays the real work — it only delays a *screen*. It also
 * never applies to a failure: an error is rendered the moment it is known, so
 * callers pass `active=false` on error and render the error directly.
 *
 * @module hooks/useWaitGate
 */

import { useEffect, useRef, useState } from 'react';
import { motionMs } from '../theme/durations';

export interface UseWaitGateOptions {
  /** Delay before the wait screen may mount. Defaults to `motionMs.waitDelay`. */
  delayMs?: number;
  /** Minimum time on screen once mounted. Defaults to `motionMs.waitMinVisible`. */
  minVisibleMs?: number;
}

/**
 * @param active Whether the underlying work is still in flight.
 * @returns Whether the waiting screen should be rendered.
 */
export function useWaitGate(active: boolean, options: UseWaitGateOptions = {}): boolean {
  const { delayMs = motionMs.waitDelay, minVisibleMs = motionMs.waitMinVisible } = options;
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      if (shownAtRef.current !== null) return undefined;
      const timer = setTimeout(() => {
        shownAtRef.current = Date.now();
        setVisible(true);
      }, delayMs);
      return () => clearTimeout(timer);
    }

    const shownAt = shownAtRef.current;
    if (shownAt === null) {
      setVisible(false);
      return undefined;
    }

    const remaining = minVisibleMs - (Date.now() - shownAt);
    if (remaining <= 0) {
      shownAtRef.current = null;
      setVisible(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      shownAtRef.current = null;
      setVisible(false);
    }, remaining);
    return () => clearTimeout(timer);
  }, [active, delayMs, minVisibleMs]);

  return visible;
}
