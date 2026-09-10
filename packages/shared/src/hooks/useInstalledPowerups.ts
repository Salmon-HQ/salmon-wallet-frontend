/**
 * useInstalledPowerups — which Powerups this device has installed.
 *
 * Installation is per device and persisted (nothing about it is on-chain or
 * on the account): the catalogue installs, the Home tab row and the tab-order
 * sheet read, and uninstalling takes the tab away again. Nothing is installed
 * out of the box — Swap included.
 *
 * It lives in `hooks/`, not under `powerups/`, because it touches storage and
 * the Powerups boundary forbids that (spec 027 §2). Two surfaces read it at
 * once on the same screen — Home's tab row and the catalogue sheet floating
 * over it — so the state is a module-level store with subscribers rather than
 * a `useState` per caller, which would let the sheet install a Powerup the
 * row behind it never hears about.
 *
 * @module hooks/useInstalledPowerups
 */

import { useCallback, useSyncExternalStore } from 'react';

import { getStorage, STORAGE_KEYS } from '../storage';

const EMPTY: readonly string[] = [];

let installed: readonly string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!loaded) {
    loaded = true;
    void (async () => {
      try {
        const stored = await getStorage().getItem<string[]>(STORAGE_KEYS.INSTALLED_POWERUPS);
        if (Array.isArray(stored) && stored.every((id) => typeof id === 'string')) {
          installed = stored;
          emit();
        }
      } catch (error) {
        console.error('[useInstalledPowerups] Failed to read the installed list:', error);
      }
    })();
  }
  return () => {
    listeners.delete(listener);
  };
}

function persist(next: readonly string[]): void {
  installed = next;
  emit();
  void (async () => {
    try {
      await getStorage().setItem(STORAGE_KEYS.INSTALLED_POWERUPS, [...next]);
    } catch (error) {
      console.error('[useInstalledPowerups] Failed to persist the installed list:', error);
    }
  })();
}

/** Test seam: drop the cache so the next subscriber re-reads storage. */
export function resetInstalledPowerupsForTest(): void {
  installed = EMPTY;
  loaded = false;
  listeners.clear();
}

export interface UseInstalledPowerupsResult {
  /** The installed ids, in the order they were installed. */
  installed: readonly string[];
  isInstalled: (id: string) => boolean;
  install: (id: string) => void;
  uninstall: (id: string) => void;
}

export function useInstalledPowerups(): UseInstalledPowerupsResult {
  const ids = useSyncExternalStore(
    subscribe,
    () => installed,
    () => EMPTY
  );

  const isInstalled = useCallback((id: string) => ids.includes(id), [ids]);
  const install = useCallback(
    (id: string) => {
      if (installed.includes(id)) return;
      persist([...installed, id]);
    },
    // `installed` is read from the module, not from the render — the callback
    // never goes stale and never needs to change identity.
    []
  );
  const uninstall = useCallback((id: string) => {
    if (!installed.includes(id)) return;
    persist(installed.filter((entry) => entry !== id));
  }, []);

  return { installed: ids, isInstalled, install, uninstall };
}
