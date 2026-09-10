/**
 * The catalogue both platforms draw: the registry's entries for the active
 * network, plus the design frames' mock entries behind the developer flag.
 *
 * It lives here rather than in either app because it is the same list on both
 * — only the icon is platform code, and that is resolved by id inside each
 * twin. A catalogue that advertised four things the wallet cannot install
 * would be a promise, not a product, so the mocks are developer-only.
 */
import type { PowerupsCatalogEntry } from '../types/ui/index';
import { POWERUPS, isPowerupOnNetwork } from './registry';

/** The `.pen` frames' catalogue. Developer mode only — none of these exist. */
export const MOCK_POWERUPS: readonly Omit<PowerupsCatalogEntry, 'installed'>[] = [
  {
    id: 'wallet-guard',
    nameKey: 'powerups.catalog.wallet_guard.name',
    descriptionKey: 'powerups.catalog.wallet_guard.description',
    tier: 'core',
  },
  {
    id: 'staking',
    nameKey: 'powerups.catalog.staking.name',
    descriptionKey: 'powerups.catalog.staking.description',
    tier: 'core',
  },
  {
    id: 'auto-compound',
    nameKey: 'powerups.catalog.auto_compound.name',
    descriptionKey: 'powerups.catalog.auto_compound.description',
    tier: 'community',
  },
  {
    id: 'nft-floor-watch',
    nameKey: 'powerups.catalog.nft_floor_watch.name',
    descriptionKey: 'powerups.catalog.nft_floor_watch.description',
    tier: 'community',
  },
];

export interface PowerupCatalogParams {
  /** Developer mode: the mock entries join the real ones. */
  includeMocks: boolean;
  /** The network the screen stands on; a Powerup is offered only where it acts. */
  networkId: string | null;
  /** What this device has installed — an installed entry stays in its tier. */
  installedIds: readonly string[];
}

export function getPowerupCatalog({
  includeMocks,
  networkId,
  installedIds,
}: PowerupCatalogParams): PowerupsCatalogEntry[] {
  const real = POWERUPS.filter((entry) => isPowerupOnNetwork(entry, networkId)).map(
    (entry): PowerupsCatalogEntry => ({
      id: entry.id,
      nameKey: entry.nameKey,
      descriptionKey: entry.descriptionKey,
      tier: entry.tier,
      installed: installedIds.includes(entry.id),
    })
  );
  if (!includeMocks) return real;
  return [...real, ...MOCK_POWERUPS.map((entry) => ({ ...entry, installed: false }))];
}
