/**
 * The wait's tip rotation: which tip is showing and the clock that advances
 * it. Both `LoadingScreen` twins run this; each keeps its own fade (mobile on
 * the UI thread, the DOM through a CSS transition) and advances the index from
 * inside it, which is why the tick hands `advance` to the caller rather than
 * advancing on its own.
 */

import { useCallback, useEffect, useState } from 'react';

export interface UseWaitTipsOptions {
  /** How many tips there are. Rotation only runs for two or more. */
  count: number;
  /** Time between ticks, ms. */
  intervalMs: number;
  /** False while the wait is hidden or tips are off: the clock does not run. */
  active: boolean;
  /**
   * Called every `intervalMs`. The caller plays its fade and calls `advance`
   * when the old tip is out of sight. Must be referentially stable — it is
   * an effect dependency, and a fresh function every render restarts the
   * clock.
   */
  onTick: (advance: () => void) => void;
}

export interface WaitTips {
  /** Index of the tip on screen. */
  index: number;
  /** Moves to the next tip, wrapping at `count`. */
  advance: () => void;
}

export function useWaitTips({ count, intervalMs, active, onTick }: UseWaitTipsOptions): WaitTips {
  const [index, setIndex] = useState(0);

  const advance = useCallback(() => {
    setIndex((previous) => (count > 0 ? (previous + 1) % count : 0));
  }, [count]);

  useEffect(() => {
    if (!active || count <= 1) return undefined;
    const interval = setInterval(() => onTick(advance), intervalMs);
    return () => clearInterval(interval);
  }, [active, count, intervalMs, onTick, advance]);

  return { index, advance };
}
