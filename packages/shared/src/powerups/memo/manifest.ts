/**
 * Memo — the reference transaction-building Powerup (spec 029 §2.2, joint
 * test T3): one Memo-program instruction carrying a note, built by the
 * Salmon backend through the generic path and signed through core. It is
 * the smallest thing that exercises every step a real Powerup will take.
 */
import type { PowerupManifest } from '../manifest';

export const memoManifest: PowerupManifest = {
  id: 'memo',
  tier: 'core',
  networks: ['solana-mainnet', 'solana-devnet'],
  nameKey: 'memo.catalog.name',
  descriptionKey: 'memo.catalog.description',
  aboutKey: 'memo.catalog.about',
  actionKeys: ['memo.catalog.actions.write'],
  authorKey: 'powerups.author.salmon',
  permissions: ['address'],
  endpoints: [],
  locales: 'memo',
  entries: { tab: 'memo' },
};
