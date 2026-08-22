/**
 * useWaitExit — keeps a wait on screen until its closing wave has left it.
 *
 * `useWaitGate` decides whether a wait deserves a screen. This decides when the
 * screen is allowed to *stop being rendered*, and it exists because the two are
 * not the same moment. Product, 2026-08: *"que no se pase a la siguiente screen
 * hasta que la última onda salga de la pantalla, es decir, justo cuando el agua
 * está calma. Esto aplica siempre."*
 *
 * The wait screen already knows how to leave — it holds for whatever the front
 * in flight has left to travel, ebbs, and then calls `onExited`. What broke
 * that promise was the *caller*: every surface written as
 *
 * ```tsx
 * if (loading) return <LoadingScreen visible />;
 * return <Receipt />;
 * ```
 *
 * swaps branches the instant `loading` flips, unmounting the wait mid-wave. The
 * closing wave then plays nowhere, on exactly the screens where it matters most.
 *
 * This hook inverts the condition: the wait stays mounted with `visible={false}`
 * — which is what *starts* its exit — until it reports back.
 *
 * ```tsx
 * const showWait = useWaitGate(settling);
 * const { held, onExited } = useWaitExit(showWait);
 * if (held) return <LoadingScreen visible={showWait} onExited={onExited} />;
 * ```
 *
 * It is deliberately not a timer. The wait's own exit is bounded by
 * `wavefrontExitMs()`, and that bound is armed inside the wait, so a dropped
 * animation callback cannot strand a caller here either.
 *
 * @module hooks/useWaitExit
 */

import { useCallback, useEffect, useState } from 'react';

export interface WaitExit {
  /** Whether the wait screen must still be rendered. */
  held: boolean;
  /** Pass to the wait's `onExited`. */
  onExited: () => void;
}

/**
 * @param showWait Whether the wait screen wants to be visible — normally the
 *   return of `useWaitGate`.
 */
export function useWaitExit(showWait: boolean): WaitExit {
  // Starts `true`: a surface that never waited at all must render its content
  // on the first frame, not a wait screen nobody asked for.
  const [gone, setGone] = useState(true);

  useEffect(() => {
    if (showWait) setGone(false);
  }, [showWait]);

  return { held: showWait || !gone, onExited: useCallback(() => setGone(true), []) };
}
