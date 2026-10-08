import type { PowerupManifest } from '../manifest';

/**
 * SKR (spec 039): what the wallet holds in Solana Mobile's SKR staking —
 * liquid and staked, earned, guardian, history. Read-only: it builds no
 * transaction, and its data comes from the Salmon backend (`/skr/stake`).
 */
export const skrManifest = {
  id: 'skr',
  iconName: 'Stack',
  tier: 'core',
  networks: ['solana-mainnet'],
  nameKey: 'skr.catalog.name',
  descriptionKey: 'skr.catalog.description',
  aboutKey: 'skr.catalog.about',
  usageKey: 'skr.catalog.usage',
  actionKeys: ['skr.catalog.actions.position', 'skr.catalog.actions.rewards'],
  authorKey: 'powerups.author.salmon',
  permissions: ['address'],
  endpoints: [],
  programs: [],
  locales: 'skr',
  entries: { tab: 'skr' },
} as const satisfies PowerupManifest;
