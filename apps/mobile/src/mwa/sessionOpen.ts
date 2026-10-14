import { useSyncExternalStore } from 'react';

/**
 * Whether the dApp activity (`MwaRoot`) is on screen. Both React roots share
 * one JS runtime and one `AppState`, and the OS takes one biometric prompt per
 * process: the app's own lock, behind it, must not ask for the finger the
 * dApp's lock is waiting for.
 */
let open = false;
const listeners = new Set<() => void>();

export function setMwaSessionOpen(next: boolean) {
  if (open === next) return;
  open = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMwaSessionOpen() {
  return useSyncExternalStore(subscribe, () => open);
}
