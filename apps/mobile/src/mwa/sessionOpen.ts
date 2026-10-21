import { useSyncExternalStore } from 'react';

/**
 * Whether the dApp activity (`MwaRoot`) is on screen. Both React roots share
 * one JS runtime and one `AppState`, and the OS takes one biometric prompt per
 * process: the app's own lock, behind it, must not ask for the finger the
 * dApp's lock is waiting for.
 */
// A count, not a flag: a dApp can reopen the activity while the previous one
// is still closing, and that close must not clear the new session.
let openCount = 0;
const listeners = new Set<() => void>();

export function setMwaSessionOpen(next: boolean) {
  openCount = Math.max(0, openCount + (next ? 1 : -1));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMwaSessionOpen() {
  return useSyncExternalStore(subscribe, () => openCount > 0);
}
