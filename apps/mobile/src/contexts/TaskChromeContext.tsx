/**
 * TaskChromeContext — the swap task's grip on the tab shell's chrome.
 *
 * Review and its outcome live in an RN Modal (their own window), but the
 * verb plays in the shell before the window appears: the gate header is a
 * COMPUERTA that rises out of the frame while the step content sinks, and
 * the floating tab bar sinks with the content. This context is how the deep
 * SwapScreen tells the shell-level chrome (GateContainer, GlassTabBar) that
 * a task is engaged.
 *
 * The signal is `isTaskStep || isTaskWindowVisible` on the publisher side:
 * true the moment the task begins (chrome leaves during the beat, before
 * the window covers it) and held until the window has actually gone (chrome
 * returns exactly as the shell's delayed float begins).
 */
import React, { createContext, useContext, useMemo, useState } from 'react';

interface TaskChromeContextValue {
  /** Whether a task (review/success window) currently owns the screen. */
  isTaskEngaged: boolean;
  /** Publisher side — only the task owner (SwapScreen) calls this. */
  setTaskEngaged: (engaged: boolean) => void;
}

const TaskChromeContext = createContext<TaskChromeContextValue>({
  isTaskEngaged: false,
  setTaskEngaged: () => {},
});

export function TaskChromeProvider({ children }: { children: React.ReactNode }) {
  const [isTaskEngaged, setTaskEngaged] = useState(false);
  const value = useMemo(() => ({ isTaskEngaged, setTaskEngaged }), [isTaskEngaged]);
  return <TaskChromeContext.Provider value={value}>{children}</TaskChromeContext.Provider>;
}

export function useTaskChrome(): TaskChromeContextValue {
  return useContext(TaskChromeContext);
}

export default TaskChromeContext;
