/**
 * usePowerupState — a Powerup's own persisted state, on this device.
 *
 * The Powerups boundary forbids `storage` under `powerups/**` (spec 027 §2),
 * and a Powerup that holds something the user returns to — a list of payment
 * requests, a position — still has to keep it somewhere. This is the one seam:
 * one storage key holds a record keyed by Powerup id, and each Powerup reads
 * and writes its own slice through this hook, never the key.
 *
 * Same shape as `useInstalledPowerups`: a module-level store with subscribers,
 * because the same slice is read by more than one mounted surface (a list and
 * the sheet open over it), and a `useState` per caller would let one write
 * what the other never hears about. Writes are immutable and write-through.
 *
 * @module hooks/usePowerupState
 */

import { useCallback, useSyncExternalStore } from 'react';

import { getStorage, STORAGE_KEYS } from '../storage';

type PowerupStateRecord = Readonly<Record<string, unknown>>;

const EMPTY: PowerupStateRecord = Object.freeze({});

let record: PowerupStateRecord = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function isRecord(value: unknown): value is PowerupStateRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!loaded) {
    loaded = true;
    void (async () => {
      try {
        const stored = await getStorage().getItem<unknown>(STORAGE_KEYS.POWERUP_STATE);
        if (isRecord(stored)) {
          record = stored;
          emit();
        }
      } catch (error) {
        console.error('[usePowerupState] Failed to read the Powerup state:', error);
      }
    })();
  }
  return () => {
    listeners.delete(listener);
  };
}

function persist(next: PowerupStateRecord): void {
  record = next;
  emit();
  void (async () => {
    try {
      await getStorage().setItem(STORAGE_KEYS.POWERUP_STATE, next);
    } catch (error) {
      console.error('[usePowerupState] Failed to persist the Powerup state:', error);
    }
  })();
}

/** Test seam: drop the cache so the next subscriber re-reads storage. */
export function resetPowerupStateForTest(): void {
  record = EMPTY;
  loaded = false;
  listeners.clear();
}

export type PowerupStateUpdater<T> = T | ((previous: T) => T);

/**
 * The slice for `powerupId`, hydrated from storage, and a setter that takes a
 * value or a functional update. `initial` stands in until storage has been
 * read and whenever the slice was never written.
 */
export function usePowerupState<T>(
  powerupId: string,
  initial: T
): [T, (update: PowerupStateUpdater<T>) => void] {
  const current = useSyncExternalStore(
    subscribe,
    () => record,
    () => EMPTY
  );
  const slice = (powerupId in current ? current[powerupId] : initial) as T;

  const setSlice = useCallback(
    (update: PowerupStateUpdater<T>) => {
      // Read from the module, not the render: two writes in one tick compose.
      const previous = (powerupId in record ? record[powerupId] : initial) as T;
      const next = typeof update === 'function' ? (update as (p: T) => T)(previous) : update;
      persist({ ...record, [powerupId]: next });
    },
    [powerupId, initial]
  );

  return [slice, setSlice];
}
