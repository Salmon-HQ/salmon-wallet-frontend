/**
 * The Powerups entry — the ONE module the apps import Powerup code from
 * (`@salmon/shared/powerups`). The root `@salmon/shared` barrel does not
 * re-export it; that is what lets the bundlers swap this file for
 * `index.off.ts` and drop every Powerup from a build (spec 027 §3).
 *
 * A Powerup proposes, core signs: nothing under `powerups/**` imports
 * `core/signing`, `core/broadcast`, `crypto` or `storage` — the lint boundary
 * in `eslint.config.js` fails the build when one does.
 */
export const POWERUPS_ENABLED = true;

export { POWERUPS, getPowerup, isPowerupOnNetwork } from './registry';
export type { PowerupEntry, PowerupId, PowerupTier } from './registry';
export { powerupTranslations } from './locales';
export * from './swap';
