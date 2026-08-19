/**
 * TEMPORARY flesh-texture switch — DOM mirror of
 * `apps/mobile/src/debug/fleshVariant.ts`; keep the two values in step while
 * the CTA texture candidates are being judged (sharing one switch would drag
 * app debug state into `@salmon/shared`, which is not worth it for a
 * temporary flag).
 *
 * `'current'` is the shipped `flesh.ts` stroke texture; `'marbled'` and
 * `'chevron'` are the candidates in
 * `packages/shared/src/theme/fleshVariants.ts`. Delete this file once a
 * variant is signed off.
 */
import type { FleshVariant } from '@salmon/shared';

export const DEBUG_FLESH_VARIANT: FleshVariant = 'marbled';
