/**
 * Memo — the reference transaction-building Powerup (spec 029 §2.2, joint
 * test T3): one Memo-program instruction carrying a note, built by the
 * Salmon backend through the generic path and signed through core. It is
 * the smallest thing that exercises every step a real Powerup will take.
 */
import type { PowerupManifest } from '../manifest';
import { COMPUTE_BUDGET_PROGRAM, MEMO_PROGRAM } from '../../core/verify';

export const memoManifest = {
  id: 'memo',
  iconName: 'PencilSimple',
  // Community, though Salmon wrote it: memo is the fixture that exercises the
  // contributed path end to end — the badge, the generated disclosure and the
  // review a community entry gets. A core tier would test the easy half.
  tier: 'community',
  networks: ['solana-mainnet', 'solana-devnet'],
  nameKey: 'memo.catalog.name',
  descriptionKey: 'memo.catalog.description',
  aboutKey: 'memo.catalog.about',
  actionKeys: ['memo.catalog.actions.write'],
  authorKey: 'powerups.author.community',
  permissions: ['address'],
  endpoints: [],
  programs: [MEMO_PROGRAM, COMPUTE_BUDGET_PROGRAM],
  locales: 'memo',
  entries: { tab: 'memo' },
} as const satisfies PowerupManifest;
