/**
 * Swap — exchange one Solana token for another, routed by the provider the
 * backend's availability table chose for this caller (Jupiter by default,
 * 0x where Jupiter may not serve; spec 018 on the backend). Built by the
 * Salmon backend on `/ft/swap/build`, signed through core; the wallet never
 * calls a routing provider itself.
 */
import type { PowerupManifest } from '../manifest';
import {
  ASSOCIATED_TOKEN_PROGRAM,
  COMPUTE_BUDGET_PROGRAM,
  JUPITER_AGGREGATOR_PROGRAM,
  SYSTEM_PROGRAM,
  TOKEN_2022_PROGRAM,
  TOKEN_PROGRAM,
  ZEROEX_SETTLER_PROGRAM,
} from '../../core/verify';

export const swapManifest = {
  id: 'swap',
  iconName: 'ArrowsLeftRight',
  tier: 'core',
  // Neither routing provider has a devnet.
  networks: ['solana-mainnet'],
  nameKey: 'swap.catalog.name',
  descriptionKey: 'swap.catalog.description',
  aboutKey: 'swap.catalog.about',
  usageKey: 'swap.catalog.usage',
  actionKeys: ['swap.catalog.actions.swap'],
  authorKey: 'powerups.author.salmon',
  // The address and the amounts of the pair go to the Salmon backend, which
  // asks the provider; nothing goes to a provider from the device.
  permissions: ['address'],
  endpoints: [],
  // Every top-level program either provider's build invokes (probed live,
  // 2026-09-30): the compute budget core prepends, token-account setup and
  // wrapped-SOL handling, and the router itself. Anything else is refused
  // before the user signs.
  programs: [
    COMPUTE_BUDGET_PROGRAM,
    ASSOCIATED_TOKEN_PROGRAM,
    SYSTEM_PROGRAM,
    TOKEN_PROGRAM,
    TOKEN_2022_PROGRAM,
    JUPITER_AGGREGATOR_PROGRAM,
    ZEROEX_SETTLER_PROGRAM,
  ],
  locales: 'swap',
  entries: { tab: 'swap' },
} as const satisfies PowerupManifest;
