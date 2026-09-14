/**
 * The Swap Powerup's manifest (spec 029 §7). The one record the registry
 * imports; every other Swap file stays where it was.
 */
import type { PowerupManifest } from '../manifest';
import {
  ASSOCIATED_TOKEN_PROGRAM,
  COMPUTE_BUDGET_PROGRAM,
  SWAP_SETTLER_PROGRAM,
  SYSTEM_PROGRAM,
  TOKEN_2022_PROGRAM,
  TOKEN_PROGRAM,
} from '../../core/verify';

export const swapManifest = {
  id: 'swap',
  iconName: 'ArrowsLeftRight',
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
  // The settler is what the route's instructions call; the rest is the
  // plumbing the backend adds around them — a compute budget, the destination
  // token account when it has to be created, and closing the intermediate
  // accounts a route opens so their rent returns to the user.
  programs: [
    SWAP_SETTLER_PROGRAM,
    COMPUTE_BUDGET_PROGRAM,
    TOKEN_PROGRAM,
    TOKEN_2022_PROGRAM,
    ASSOCIATED_TOKEN_PROGRAM,
    SYSTEM_PROGRAM,
  ],
  locales: 'swap',
  entries: { tab: 'swap' },
} as const satisfies PowerupManifest;
