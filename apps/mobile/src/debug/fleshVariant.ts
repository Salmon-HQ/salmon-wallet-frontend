/**
 * TEMPORARY flesh-texture switch — for judging the CTA texture candidates.
 *
 * `FleshBackground` reads this to pick which drawing fills salmon CTAs:
 *  - `'current'` — the shipped `flesh.ts` stroke texture.
 *  - `'marbled'` — wide tapered veins sweeping in nested arcs (organic,
 *    closest to the reference photos).
 *  - `'marbled'` — nested regular Vs (graphic, "brand mark").
 *
 * Flip the value below, save, let Fast Refresh reload — every salmon CTA
 * updates at once. The DOM side reads the mirror constant in
 * `packages/ui/src/components/FleshBackground/fleshVariant.ts`; keep the two
 * in step while judging (sharing one switch would drag app debug state into
 * `@salmon/shared`, which is not worth it for a temporary flag).
 *
 * Delete this file once a variant is signed off: fold the winner into the
 * components as the only drawing and drop the losers from
 * `packages/shared/src/theme/fleshVariants.ts`.
 */
import type { FleshVariant } from '@salmon/shared';

export const DEBUG_FLESH_VARIANT: FleshVariant = 'marbled';
