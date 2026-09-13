/**
 * The catalogue both platforms draw: the registry's entries for the active
 * network.
 *
 * It lives here rather than in either app because it is the same list on both
 * — only the icon's renderer is platform code, and each twin resolves the
 * name the manifest declares. It lists what the wallet can actually install
 * and nothing else: a row for something that does not exist is a promise,
 * not a product — and in a public repo it is also an announcement.
 */
import type { PowerupsCatalogEntry } from '../types/ui/index';
import { describeDisclosure } from './disclosure';
import { POWERUPS, isPowerupOnNetwork } from './registry';

export interface PowerupCatalogParams {
  /** The network the screen stands on; a Powerup is offered only where it acts. */
  networkId: string | null;
  /** What this device has installed — an installed entry stays in its tier. */
  installedIds: readonly string[];
  /**
   * The backend's kill switch for `networkId` (spec 029 §5.2): only these
   * ids are offered. Absent from the list means not offered, not mountable.
   */
  allowedIds: readonly string[];
  /** The switched-off ids and why; an installed one stays listed with its reason. */
  disabledReasons?: Readonly<Record<string, 'region' | 'maintenance' | 'deprecated'>>;
}

export function getPowerupCatalog({
  networkId,
  installedIds,
  allowedIds,
  disabledReasons = {},
}: PowerupCatalogParams): PowerupsCatalogEntry[] {
  const real = POWERUPS.filter(
    (entry) =>
      isPowerupOnNetwork(entry, networkId) &&
      (allowedIds.includes(entry.id) ||
        (installedIds.includes(entry.id) && entry.id in disabledReasons))
  ).map((entry): PowerupsCatalogEntry => ({
    id: entry.id,
    nameKey: entry.nameKey,
    descriptionKey: entry.descriptionKey,
    tier: entry.tier,
    iconName: entry.iconName,
    installed: installedIds.includes(entry.id),
    disabledReason: disabledReasons[entry.id],
    details: {
      aboutKey: entry.aboutKey,
      actionKeys: entry.actionKeys,
      disclosure: describeDisclosure(entry),
      authorKey: entry.authorKey,
      networks: entry.networks,
    },
  }));
  return real;
}
