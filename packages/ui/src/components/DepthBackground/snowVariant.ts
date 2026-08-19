/**
 * TEMPORARY snow-variant switch — the DOM twin of
 * `apps/mobile/src/debug/snowVariant.ts`; see that file for the contract.
 *
 * `'blizzard'` (default) draws the tuned field (heroes + mid-field lift +
 * clustering, constants in `packages/shared/src/theme/depthFieldBlizzard.ts`);
 * `'current'` draws the field exactly as it shipped.
 *
 * Delete this file (keeping the chosen variant hardwired) once the owner
 * signs one off.
 */
import type { SnowVariant } from '@salmon/shared';

export const DEBUG_SNOW_VARIANT: SnowVariant = 'blizzard';
