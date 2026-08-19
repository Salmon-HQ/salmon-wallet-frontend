/**
 * TEMPORARY snow-variant switch — for judging the marine snow live.
 *
 * `'blizzard'` (default) draws the tuned field: hero flocs in the near
 * field, a moderate mid-field lift, and clustered patches — see
 * `packages/shared/src/theme/depthFieldBlizzard.ts` for the constants.
 * `'current'` draws the field exactly as it shipped, for comparison.
 *
 * Turn: flip the value below, save, let Fast Refresh reload. The DOM twin is
 * `packages/ui/src/components/DepthBackground/snowVariant.ts` — flip both to
 * compare the same field on both platforms.
 *
 * Delete this file (keeping the chosen variant hardwired) once the owner
 * signs one off.
 */
import type { SnowVariant } from '@salmon/shared';

export const DEBUG_SNOW_VARIANT: SnowVariant = 'blizzard';
