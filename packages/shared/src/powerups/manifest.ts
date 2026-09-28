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
import type { PowerupIconName } from '../types/ui/powerup-icon';

/** Origin only: who wrote it. It never decides the disclosure (spec 029 §4). */
export type PowerupTier = 'core' | 'community';

/** What leaves the device, as the folder declares it. `none` stands alone. */
export type PowerupPermission = 'address' | 'balances' | 'none';

export interface PowerupManifest {
  /**
   * The folder name, the catalogue key and the Home sub-tab key. A manifest
   * is the ONE place an id is written: the registry derives `PowerupId` from
   * the ids its manifests declare, so nothing else lists them by hand.
   */
  id: string;
  tier: PowerupTier;
  /** The networks the Powerup acts on; hidden elsewhere. */
  networks: readonly SolanaNetworkId[];
  /**
   * The glyph it wears in the catalogue, from the kit's allow-list. A Powerup
   * ships no art: each twin resolves this name against its own icon module.
   */
  iconName: PowerupIconName;
  /** Translation key for the display name. */
  nameKey: string;
  /** Translation key for the one-line description. */
  descriptionKey: string;
  /** Translation key for the detail's "About" paragraph. */
  aboutKey: string;
  /**
   * Translation key for the one line Home shows under the sub-tabs on the
   * Powerup's own tab: how to use it, not what it is (the catalogue's
   * `descriptionKey` and `aboutKey` say that). Every tab starts with it.
   */
  usageKey: string;
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
  /**
   * Every Solana program the Powerup's own transaction may invoke.
   *
   * Core checks the built transaction against this list before the user signs,
   * so a backend that returns something other than what the confirmation
   * screen describes is refused rather than signed. A program reached by
   * cross-program invocation is not an instruction and is not listed: what is
   * declared is what the transaction says it will call.
   *
   * Empty for a Powerup that builds no transaction.
   */
  programs: readonly string[];
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
