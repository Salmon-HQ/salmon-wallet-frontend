/**
 * The Powerups entry — the ONE module the apps import Powerup code from
 * (`@salmon/shared/powerups`). The root `@salmon/shared` barrel does not
 * re-export it; that is what lets the bundlers alias this file to
 * `index.off.ts` and drop every Powerup from a build (spec 027 §3).
 *
 * A Powerup proposes, core signs: nothing under `powerups/**` imports
 * `core/signing`, `core/broadcast`, `crypto` or `storage` — the lint boundary
 * in `eslint.config.js` fails the build when one does.
 */
export const POWERUPS_ENABLED = true;

export { POWERUPS, POWERUP_TAB_KEYS, getPowerup, isPowerupOnNetwork } from './registry';
export { getPowerupCatalog } from './catalog';
export type { PowerupCatalogParams } from './catalog';
export type {
  PowerupEntry,
  PowerupId,
  PowerupManifest,
  PowerupPermission,
  PowerupTier,
} from './registry';
export { describeDisclosure } from './disclosure';
export type { PowerupDisclosureLine } from './disclosure';
export { powerupTranslations } from './locales';
export * from './backend';
export * from './memo';
