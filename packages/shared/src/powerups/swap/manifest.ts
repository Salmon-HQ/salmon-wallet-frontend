/**
 * The Swap Powerup's manifest (spec 029 §7). The one record the registry
 * imports; every other Swap file stays where it was.
 */
import type { PowerupManifest } from '../manifest';

export const swapManifest: PowerupManifest = {
  id: 'swap',
  tier: 'core',
  networks: ['solana-mainnet'],
  nameKey: 'swap.catalog.name',
  descriptionKey: 'swap.catalog.description',
  aboutKey: 'swap.catalog.about',
  actionKeys: [
    'swap.catalog.actions.quote',
    'swap.catalog.actions.review',
    'swap.catalog.actions.receipt',
  ],
  authorKey: 'powerups.author.salmon',
  // The address and the balances go to the Salmon backend to build the
  // route; the Swap calls no third party of its own.
  permissions: ['address', 'balances'],
  endpoints: [],
  locales: 'swap',
  entries: { tab: 'swap' },
};
