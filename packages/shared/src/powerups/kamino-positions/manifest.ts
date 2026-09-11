/**
 * Kamino Positions — the community, read-only fixture Powerup (spec 029
 * §2.1, joint test T2). It exists to prove the catalogue, the generated
 * disclosure and the kill switch end to end for a third-party entry; it
 * mounts no Home surface yet.
 */
import type { PowerupManifest } from '../manifest';

export const kaminoPositionsManifest: PowerupManifest = {
  id: 'kamino-positions',
  tier: 'community',
  networks: ['solana-mainnet'],
  nameKey: 'kamino-positions.catalog.name',
  descriptionKey: 'kamino-positions.catalog.description',
  aboutKey: 'kamino-positions.catalog.about',
  actionKeys: ['kamino-positions.catalog.actions.positions'],
  authorKey: 'powerups.author.community',
  // Read-only: it asks Kamino's own API about the address, nothing else.
  permissions: ['address'],
  endpoints: ['https://api.kamino.finance'],
  locales: 'kamino-positions',
  entries: {},
};
