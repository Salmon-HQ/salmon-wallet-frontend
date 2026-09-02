/**
 * TaskChromeContext — a task flow's grip on the shell's chrome, and the count
 * of times the shell has surfaced, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/contexts/TaskChromeContext.tsx` and the
 * semantics are identical, because the verb they drive is the same one:
 *
 * - `isTaskEngaged` — a task owns the screen, so the content leaves with the
 *   sink and comes back with the float. Engagement is COUNTED, not a boolean:
 *   more than one flow can publish, and a bare flag let whichever tore down
 *   first pull the chrome back under a flow that was still running.
 * - `surfaceKey` — bumped every time the screen surfaces (a wait ending, an
 *   unlock). Home keys its content on it so the float plays when the water
 *   clears rather than under the overlay. `LoadingScreen` calls `surface()`
 *   from its own exit, which is why no call site has to remember to.
 *
 * There is no RN here and no `packages/shared` state: the provider is app
 * shell wiring, and the extension mounts one instance above `App`.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export interface TaskChromeContextValue {
  /** Whether any task currently owns the screen. */
  isTaskEngaged: boolean;
  /**
   * Publisher side. `owner` identifies the claim: pass a value stable for the
   * lifetime of the publisher, and always release it on unmount — a claim left
   * open keeps the shell's chrome off screen.
   */
  setTaskEngaged: (owner: symbol, engaged: boolean) => void;
  /** Bumped each time the screen surfaces. */
  surfaceKey: number;
  /** Publisher side of {@link surfaceKey}: every wait that ends calls this. */
  surface: () => void;
}

const TaskChromeContext = createContext<TaskChromeContextValue>({
  isTaskEngaged: false,
  setTaskEngaged: () => {},
  surfaceKey: 0,
  // No-op outside a provider — onboarding shows the wait too, and it has no
  // shell to surface.
  surface: () => {},
});

export function TaskChromeProvider({ children }: { children: React.ReactNode }) {
  const claimsRef = useRef<Set<symbol>>(new Set());
  const [isTaskEngaged, setIsTaskEngaged] = useState(false);
  const [surfaceKey, setSurfaceKey] = useState(0);
  const surface = useCallback(() => setSurfaceKey((count) => count + 1), []);

  const setTaskEngaged = useCallback((owner: symbol, engaged: boolean) => {
    const claims = claimsRef.current;
    if (engaged) claims.add(owner);
    else claims.delete(owner);
    // Only the transition matters to consumers; setting the same value again
    // would re-render the whole shell on every publisher render.
    setIsTaskEngaged(claims.size > 0);
  }, []);

  const value = useMemo(
    () => ({ isTaskEngaged, setTaskEngaged, surfaceKey, surface }),
    [isTaskEngaged, setTaskEngaged, surfaceKey, surface]
  );
  return <TaskChromeContext.Provider value={value}>{children}</TaskChromeContext.Provider>;
}

export function useTaskChrome(): TaskChromeContextValue {
  return useContext(TaskChromeContext);
}

export default TaskChromeContext;
