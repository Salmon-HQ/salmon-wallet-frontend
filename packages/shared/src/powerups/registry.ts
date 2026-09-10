/**
 * The Powerups registry — one entry per Powerup, read by both platforms'
 * navigation (spec 027 §1). Copy is a translation KEY PATH resolved at
 * render; the route is a key each platform maps to its own screen.
 */
import type { SolanaNetworkId } from '../types/blockchain';

export type PowerupId = 'swap';

export type PowerupTier = 'official' | 'community';

export interface PowerupEntry {
  id: PowerupId;
  /** Translation key for the display name. */
  nameKey: string;
  /** Translation key for the one-line description. */
  descriptionKey: string;
  tier: PowerupTier;
  /** A placement, not a tier: a featured Powerup is still official or community. */
  featured?: boolean;
  /** The networks the Powerup can act on; hidden elsewhere. */
  networks: readonly SolanaNetworkId[];
  /** The screen key: mobile pushes `/${route}`, the DOM opens the page of that name. */
  route: string;
}

export const POWERUPS: readonly PowerupEntry[] = [
  {
    id: 'swap',
    nameKey: 'swap.catalog.name',
    descriptionKey: 'swap.catalog.description',
    tier: 'official',
    networks: ['solana-mainnet'],
    route: 'swap',
  },
];

export function getPowerup(id: PowerupId): PowerupEntry | undefined {
  return POWERUPS.find((entry) => entry.id === id);
}

/** Whether the Powerup acts on `networkId`; `null` (no network yet) hides it. */
export function isPowerupOnNetwork(entry: PowerupEntry, networkId: string | null): boolean {
  return networkId !== null && (entry.networks as readonly string[]).includes(networkId);
}
