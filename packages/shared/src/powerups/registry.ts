/**
 * The Powerups registry — one entry per Powerup, read by both platforms'
 * Home (spec 027 §1). Copy is a translation KEY PATH resolved at render. An
 * installed Powerup's `id` IS its Home sub-tab key: there is no route to map,
 * because a Powerup is a surface of Home, not a screen of its own.
 */
import type { SolanaNetworkId } from '../types/blockchain';

export type PowerupId = 'swap';

export type PowerupTier = 'core' | 'community';

export interface PowerupEntry {
  id: PowerupId;
  /** Translation key for the display name. */
  nameKey: string;
  /** Translation key for the one-line description. */
  descriptionKey: string;
  /** Translation key for the detail's "About" paragraph. */
  aboutKey: string;
  /** Translation keys, one per thing the user can do with it. */
  actionKeys: readonly string[];
  /** Translation key for what leaves the device, and to whom. */
  usesKey: string;
  /** Translation key for who made it. */
  authorKey: string;
  /** `core` is what Salmon ships; `community` is what people may add later. */
  tier: PowerupTier;
  /** The networks the Powerup can act on; hidden elsewhere. */
  networks: readonly SolanaNetworkId[];
}

export const POWERUPS: readonly PowerupEntry[] = [
  {
    id: 'swap',
    nameKey: 'swap.catalog.name',
    descriptionKey: 'swap.catalog.description',
    aboutKey: 'swap.catalog.about',
    actionKeys: [
      'swap.catalog.actions.quote',
      'swap.catalog.actions.review',
      'swap.catalog.actions.receipt',
    ],
    usesKey: 'swap.catalog.uses',
    authorKey: 'powerups.author.salmon',
    tier: 'core',
    networks: ['solana-mainnet'],
  },
];

export function getPowerup(id: PowerupId): PowerupEntry | undefined {
  return POWERUPS.find((entry) => entry.id === id);
}

/** Whether the Powerup acts on `networkId`; `null` (no network yet) hides it. */
export function isPowerupOnNetwork(entry: PowerupEntry, networkId: string | null): boolean {
  return networkId !== null && (entry.networks as readonly string[]).includes(networkId);
}
