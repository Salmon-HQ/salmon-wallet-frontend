/**
 * TaskChromeContext — a task flow's grip on the tab shell's chrome.
 *
 * A task lives in its own window (swap's review modal, the send flow's
 * full-screen wait), but the verb plays in the shell before that window
 * appears: the gate header is a COMPUERTA that rises out of the frame while
 * the step content sinks, and the floating tab bar sinks with the content.
 * This context is how a deep flow tells the shell-level chrome
 * (GateContainer) that a task is engaged.
 *
 * The signal is held from the moment the task begins — so the chrome leaves
 * during the beat, before the window covers it — until the window has
 * actually gone, so the chrome returns exactly as the shell's delayed float
 * begins.
 *
 * Engagement is COUNTED, not a boolean. There is more than one publisher now
 * (swap and send), and a bare flag let whichever flow tore down first pull
 * the chrome back under a flow that was still running. Each publisher holds
 * its own claim under its own key, and the chrome stays engaged while any
 * claim is open.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

interface TaskChromeContextValue {
  /** Whether any task currently owns the screen. */
  isTaskEngaged: boolean;
  /**
   * Publisher side. `owner` identifies the claim: pass a value stable for the
   * lifetime of the publisher (a `useRef(Symbol())`), and always release it on
   * unmount — a claim left open keeps the shell's chrome off screen.
   */
  setTaskEngaged: (owner: symbol, engaged: boolean) => void;
}

const TaskChromeContext = createContext<TaskChromeContextValue>({
  isTaskEngaged: false,
  setTaskEngaged: () => {},
});

export function TaskChromeProvider({ children }: { children: React.ReactNode }) {
  const claimsRef = useRef<Set<symbol>>(new Set());
  const [isTaskEngaged, setIsTaskEngaged] = useState(false);

  const setTaskEngaged = useCallback((owner: symbol, engaged: boolean) => {
    const claims = claimsRef.current;
    if (engaged) claims.add(owner);
    else claims.delete(owner);
    // Only the transition matters to consumers; setting the same value again
    // would re-render the whole shell on every publisher render.
    setIsTaskEngaged(claims.size > 0);
  }, []);

  const value = useMemo(() => ({ isTaskEngaged, setTaskEngaged }), [isTaskEngaged, setTaskEngaged]);
  return <TaskChromeContext.Provider value={value}>{children}</TaskChromeContext.Provider>;
}

export function useTaskChrome(): TaskChromeContextValue {
  return useContext(TaskChromeContext);
}

/**
 * Publisher-side convenience: a stable claim key plus an engage/release call
 * that cannot be told apart from any other publisher's.
 *
 * Releases on unmount, which is the case a raw `setTaskEngaged` kept getting
 * wrong — a flow torn down mid-task used to leave the shell headless.
 */
export function useTaskChromeClaim(): (engaged: boolean) => void {
  const { setTaskEngaged } = useTaskChrome();
  const ownerRef = useRef<symbol>(Symbol('task-chrome-claim'));

  React.useEffect(() => {
    const owner = ownerRef.current;
    return () => setTaskEngaged(owner, false);
  }, [setTaskEngaged]);

  return useCallback(
    (engaged: boolean) => setTaskEngaged(ownerRef.current, engaged),
    [setTaskEngaged]
  );
}

export default TaskChromeContext;
