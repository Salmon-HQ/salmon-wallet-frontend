/**
 * Payments — ask for USDC on the device, pay what you scanned (spec 033).
 *
 * The receiver's half is this Powerup: a Home sub-tab that composes a Solana
 * Pay transfer request, shows it as a code and reads the network itself to
 * know when it was paid. It builds no transaction and talks to no third
 * party; the payer's transfer is core Send.
 */
import type { PowerupManifest } from '../manifest';

export const paymentsManifest = {
  id: 'payments',
  iconName: 'QrCode',
  tier: 'core',
  networks: ['solana-mainnet', 'solana-devnet'],
  nameKey: 'payments.catalog.name',
  descriptionKey: 'payments.catalog.description',
  aboutKey: 'payments.catalog.about',
  usageKey: 'payments.catalog.usage',
  actionKeys: ['payments.catalog.actions.ask', 'payments.catalog.actions.track'],
  authorKey: 'powerups.author.salmon',
  permissions: ['address'],
  endpoints: [],
  // Nothing of its own: the receiver signs nothing, and the payer's transfer
  // runs through core Send under Send's rules.
  programs: [],
  locales: 'payments',
  entries: { tab: 'payments' },
} as const satisfies PowerupManifest;
