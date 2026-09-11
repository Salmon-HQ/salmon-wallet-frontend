/**
 * The catalogue both platforms draw: the registry's entries for the active
 * network, plus the design frames' mock entries behind the developer flag.
 *
 * It lives here rather than in either app because it is the same list on both
 * — only the icon is platform code, and that is resolved by id inside each
 * twin. A catalogue that advertised four things the wallet cannot install
 * would be a promise, not a product, so the mocks are developer-only.
 */
import type { PowerupsCatalogEntry, PowerupsCatalogEntryDetails } from '../types/ui/index';
import { POWERUPS, isPowerupOnNetwork } from './registry';

/** What every mock says in its detail: a placeholder, not a promise. */
const mockDetails = (tier: PowerupsCatalogEntry['tier']): PowerupsCatalogEntryDetails => ({
  aboutKey: 'powerups.catalog.mock.about',
  actionKeys: [],
  usesKey: 'powerups.catalog.mock.uses',
  authorKey: tier === 'core' ? 'powerups.author.salmon' : 'powerups.author.community',
  networks: ['solana-mainnet'],
});

/** The `.pen` frames' catalogue. Developer mode only — none of these exist. */
export const MOCK_POWERUPS: readonly Omit<PowerupsCatalogEntry, 'installed'>[] = [
  {
    id: 'wallet-guard',
    nameKey: 'powerups.catalog.wallet_guard.name',
    descriptionKey: 'powerups.catalog.wallet_guard.description',
    tier: 'core',
    details: mockDetails('core'),
  },
  {
    id: 'staking',
    nameKey: 'powerups.catalog.staking.name',
    descriptionKey: 'powerups.catalog.staking.description',
    tier: 'core',
    details: mockDetails('core'),
  },
  {
    id: 'auto-compound',
    nameKey: 'powerups.catalog.auto_compound.name',
    descriptionKey: 'powerups.catalog.auto_compound.description',
    tier: 'community',
    details: mockDetails('community'),
  },
  {
    id: 'nft-floor-watch',
    nameKey: 'powerups.catalog.nft_floor_watch.name',
    descriptionKey: 'powerups.catalog.nft_floor_watch.description',
    tier: 'community',
    details: mockDetails('community'),
  },
];

export interface PowerupCatalogParams {
  /** Developer mode: the mock entries join the real ones. */
  includeMocks: boolean;
  /** The network the screen stands on; a Powerup is offered only where it acts. */
  networkId: string | null;
  /** What this device has installed — an installed entry stays in its tier. */
  installedIds: readonly string[];
  /**
   * The backend's kill switch for `networkId` (spec 029 §5.2): only these
   * ids are offered. Absent from the list means not offered, not mountable.
   */
  allowedIds: readonly string[];
}

export function getPowerupCatalog({
  includeMocks,
  networkId,
  installedIds,
  allowedIds,
}: PowerupCatalogParams): PowerupsCatalogEntry[] {
  const real = POWERUPS.filter(
    (entry) => isPowerupOnNetwork(entry, networkId) && allowedIds.includes(entry.id)
  ).map((entry): PowerupsCatalogEntry => ({
    id: entry.id,
    nameKey: entry.nameKey,
    descriptionKey: entry.descriptionKey,
    tier: entry.tier,
    installed: installedIds.includes(entry.id),
    details: {
      aboutKey: entry.aboutKey,
      actionKeys: entry.actionKeys,
      usesKey: entry.usesKey,
      authorKey: entry.authorKey,
      networks: entry.networks,
    },
  }));
  if (!includeMocks) return real;
  return [...real, ...MOCK_POWERUPS.map((entry) => ({ ...entry, installed: false }))];
}
