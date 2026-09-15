/**
 * The Powerups registry — the manifests, one per Powerup folder, read by
 * both platforms' Home (spec 027 §1, spec 029 §1). Copy is a translation KEY
 * PATH resolved at render. An installed Powerup's `id` IS its Home sub-tab
 * key: there is no route to map, because a Powerup is a surface of Home, not
 * a screen of its own.
 */
import type { PowerupEntry } from './manifest';
import { memoManifest } from './memo/manifest';
import { paymentsManifest } from './payments/manifest';

export type { PowerupEntry, PowerupManifest, PowerupPermission, PowerupTier } from './manifest';

/**
 * The manifests, in the order the product offers them: the catalogue lists a
 * tier in this order, and `POWERUP_TAB_KEYS` gives Home its default sub-tab
 * arrangement from it, so the two can never disagree.
 */
const MANIFESTS = [paymentsManifest, memoManifest] as const;

export const POWERUPS: readonly PowerupEntry[] = MANIFESTS;

/**
 * Every id a manifest declares. Derived, never written: a new Powerup folder
 * widens this union by existing, and every union that builds on it — Home's
 * `HomeSubTabKey` — widens with it.
 */
export type PowerupId = (typeof MANIFESTS)[number]['id'];

/**
 * The ids that carry a Home sub-tab, in registry order. Home takes its
 * default tab arrangement from this, so a Powerup's place in the stored
 * arrangement survives an uninstall without anyone listing the ids twice.
 */
export const POWERUP_TAB_KEYS: readonly string[] = MANIFESTS.filter(
  (entry) => entry.entries.tab !== undefined
).map((entry) => entry.id);

export function getPowerup(id: PowerupId): PowerupEntry | undefined {
  return POWERUPS.find((entry) => entry.id === id);
}

/** Whether the Powerup acts on `networkId`; `null` (no network yet) hides it. */
export function isPowerupOnNetwork(entry: PowerupEntry, networkId: string | null): boolean {
  return networkId !== null && (entry.networks as readonly string[]).includes(networkId);
}
