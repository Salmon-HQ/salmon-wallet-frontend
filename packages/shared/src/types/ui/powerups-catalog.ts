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
}

/**
 * The Powerups catalogue: a bottom sheet over Home with two sections, Core
 * and Community. Tapping an entry opens its detail inside the same sheet,
 * where a single control installs it (which adds its Home sub-tab) or takes
 * it away again.
 *
 * The sheet rises only as far as `maxHeight` — Home measures the bottom of
 * its Send / Receive / Activity row and passes it — so the balance and those
 * buttons stay visible above the catalogue.
 */
export interface PowerupsCatalogPropsBase extends Testable {
  visible: boolean;
  onClose: () => void;
  /** Every Powerup on offer for the active network, installed or not. */
  entries: readonly PowerupsCatalogEntry[];
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  /** The tallest the sheet may rise, in pixels. */
  maxHeight?: number;
}
