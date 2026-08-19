/**
 * Debug switch for the sheet ground material — the owner's eye, not a user
 * setting. Flip the constant, reload, compare.
 *
 * - `current`     — the shipped look: opaque `colors.background.primary`
 *                   fill (plus the legacy texture overlay on the NFT sheets).
 * - `thermocline` — every sheet that mounts through `BottomSheetContainer`
 *                   without its own `background` gets the thermocline at its
 *                   thick tier, the way the Receive sheet already does. The
 *                   legacy texture overlay is suppressed so the two materials
 *                   never stack.
 *
 * Sheets with an explicit `background` (Receive) are untouched either way,
 * and the OS Reduce Transparency signal still collapses the thermocline to
 * its opaque plane — accessibility outranks the debug eye.
 *
 * Delete this file once the owner picks a material; the winner gets
 * hardwired in `BottomSheetContainer` and the loser's path retires.
 */
export type SheetMaterial = 'current' | 'thermocline';

export const sheetMaterial: SheetMaterial = 'current';
