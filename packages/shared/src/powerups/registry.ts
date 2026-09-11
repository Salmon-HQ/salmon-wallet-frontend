/**
 * The Powerups registry — the manifests, one per Powerup folder, read by
 * both platforms' Home (spec 027 §1, spec 029 §1). Copy is a translation KEY
 * PATH resolved at render. An installed Powerup's `id` IS its Home sub-tab
 * key: there is no route to map, because a Powerup is a surface of Home, not
 * a screen of its own.
 */
import type { PowerupEntry, PowerupId } from './manifest';
import { kaminoPositionsManifest } from './kamino-positions/manifest';
import { memoManifest } from './memo/manifest';
import { swapManifest } from './swap/manifest';

export type {
  PowerupEntry,
  PowerupId,
  PowerupManifest,
  PowerupPermission,
  PowerupTier,
} from './manifest';

export const POWERUPS: readonly PowerupEntry[] = [
  swapManifest,
  kaminoPositionsManifest,
  memoManifest,
];

export function getPowerup(id: PowerupId): PowerupEntry | undefined {
  return POWERUPS.find((entry) => entry.id === id);
}

/** Whether the Powerup acts on `networkId`; `null` (no network yet) hides it. */
export function isPowerupOnNetwork(entry: PowerupEntry, networkId: string | null): boolean {
  return networkId !== null && (entry.networks as readonly string[]).includes(networkId);
}
