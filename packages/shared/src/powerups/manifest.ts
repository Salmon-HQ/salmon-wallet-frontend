/**
 * A Powerup's manifest — the one record that describes it (spec 029 §1).
 *
 * Core or community, every Powerup is a folder `powerups/<id>/` whose
 * `manifest.ts` exports one of these. The registry is a list of manifests;
 * the catalogue, Home and the disclosure read their fields. Nothing here is
 * enforced at runtime: `permissions` and `endpoints` are declarations the
 * reviewer checks against the code, and the disclosure the catalogue shows
 * is generated from them, so it cannot drift from what the folder declares.
 */
import type { SolanaNetworkId } from '../types/blockchain';

export type PowerupId = 'swap';

/** Origin only: who wrote it. It never decides the disclosure (spec 029 §4). */
export type PowerupTier = 'core' | 'community';

/** What leaves the device, as the folder declares it. `none` stands alone. */
export type PowerupPermission = 'address' | 'balances' | 'none';

export interface PowerupManifest {
  /** The folder name, the catalogue key and the Home sub-tab key. */
  id: PowerupId;
  tier: PowerupTier;
  /** The networks the Powerup acts on; hidden elsewhere. */
  networks: readonly SolanaNetworkId[];
  /** Translation key for the display name. */
  nameKey: string;
  /** Translation key for the one-line description. */
  descriptionKey: string;
  /** Translation key for the detail's "About" paragraph. */
  aboutKey: string;
  /** Translation keys, one per thing the user can do with it. */
  actionKeys: readonly string[];
  /** Translation key for who made it. */
  authorKey: string;
  /** What leaves the device. A reviewed declaration, not a capability. */
  permissions: readonly PowerupPermission[];
  /**
   * Every external origin the Powerup calls directly, as `https://host`.
   * Empty when it only talks to the Salmon backend.
   */
  endpoints: readonly string[];
  /** The locale namespace it contributes (`powerups/<id>/locales`). */
  locales: string;
  /** The component keys each platform mounts, resolved by id inside each twin. */
  entries: {
    /** The Home sub-tab surface, when the Powerup has one. */
    tab?: string;
  };
}

/** The name the rest of the app has always read the registry's records by. */
export type PowerupEntry = PowerupManifest;
