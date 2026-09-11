import type { Testable } from './testable';

/**
 * A catalogue row, as either platform draws it. The tier union is spelled out
 * here rather than imported from the registry so this contract carries no
 * dependency on the Powerups module the build flag aliases away.
 */
export interface PowerupsCatalogEntry {
  id: string;
  /** Translation key for the display name. */
  nameKey: string;
  /** Translation key for the description shown in the detail. */
  descriptionKey: string;
  /** `core` is what Salmon ships; `community` is what people may add later. */
  tier: 'core' | 'community';
  /** Whether this device has it installed — the detail shows `−` instead of `+`. */
  installed: boolean;
  /**
   * Set when the backend has switched the Powerup off (spec 029 §5.2). Only
   * an installed one is listed in that state: it stays so the user can read
   * why and remove it; a new install is not offered.
   */
  disabledReason?: 'region' | 'maintenance' | 'deprecated';
  /** What the detail says about it beyond the one-line description. */
  details: PowerupsCatalogEntryDetails;
}

/**
 * The detail's facts (owner, 2026-09-11): what it does, what the user can do
 * with it, what leaves the device and where, who made it, where it acts. All
 * copy is translation keys; the network ids are formatted at render.
 */
/** One line of the generated disclosure: a key and what it interpolates. */
export interface PowerupsCatalogDisclosureLine {
  key: string;
  params?: Record<string, string>;
}

export interface PowerupsCatalogEntryDetails {
  /** Translation key for the paragraph under "About". */
  aboutKey: string;
  /** Translation keys, one per thing the user can do with it. */
  actionKeys: readonly string[];
  /**
   * What leaves the device and where it goes — generated from the manifest's
   * `permissions` + `endpoints`, never written per Powerup (spec 029 §2.1).
   */
  disclosure: readonly PowerupsCatalogDisclosureLine[];
  /** Translation key for who made it. */
  authorKey: string;
  /** The network ids it acts on. */
  networks: readonly string[];
}

/**
 * The Powerups catalogue's content: two sections, Core and Community; an
 * entry opens its detail, where a single control installs it (which adds
 * its Home sub-tab) or takes it away again.
 *
 * The container is the platform's (owner, 2026-09-11): mobile draws it as a
 * sheet over Home that rises to the sub-tab row; the extension draws it as a
 * page of Home's stack, because a side panel's sheet neither animates well
 * nor fits the detail. Each twin adds its own container props to this base.
 */
export interface PowerupsCatalogPropsBase extends Testable {
  /** Every Powerup on offer for the active network, installed or not. */
  entries: readonly PowerupsCatalogEntry[];
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
}
