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
  /** What the detail says about it beyond the one-line description. */
  details: PowerupsCatalogEntryDetails;
}

/**
 * The detail's facts (owner, 2026-09-11): what it does, what the user can do
 * with it, what leaves the device and where, who made it, where it acts. All
 * copy is translation keys; the network ids are formatted at render.
 */
export interface PowerupsCatalogEntryDetails {
  /** Translation key for the paragraph under "About". */
  aboutKey: string;
  /** Translation keys, one per thing the user can do with it. */
  actionKeys: readonly string[];
  /** Translation key for what leaves the device, and to whom. */
  usesKey: string;
  /** Translation key for who made it. */
  authorKey: string;
  /** The network ids it acts on. */
  networks: readonly string[];
}

/**
 * The Powerups catalogue: a bottom sheet over Home with two sections, Core
 * and Community. Tapping an entry opens its detail inside the same sheet,
 * where a single control installs it (which adds its Home sub-tab) or takes
 * it away again.
 *
 * The sheet rises exactly to `height` — Home measures the top of its
 * Portfolio / NFTs row and passes the room below it — so the balance and the
 * Send / Receive / Activity buttons stay visible above the catalogue.
 */
export interface PowerupsCatalogPropsBase extends Testable {
  visible: boolean;
  onClose: () => void;
  /** Every Powerup on offer for the active network, installed or not. */
  entries: readonly PowerupsCatalogEntry[];
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  /** The sheet's fixed height, in pixels: the room under the sub-tab row. */
  height?: number;
}
