/**
 * Debug switch for the sink-and-float verb's depth reading — the owner's
 * eye, not a user setting. Flip the constant, reload, compare live on the
 * device: drive a cheap passage (home's chain switch, a settings panel) and
 * watch what the swap says.
 *
 * - `current`  — the shipped verb: 28dp of travel, no scale on the exit.
 *   Translation dominates, so the swap reads as a Y-slide.
 * - `pushback` — the depth re-weighting: scale carries the Z (the Material
 *   shared-Z-axis / iOS sheet push-back reading, per DESIGN.md), travel
 *   shrinks to a small buoyancy accent. The outgoing recedes instead of
 *   sliding away.
 *
 * Tunables live next to the verb in `utils/sinkAndFloat.ts` (`PUSHBACK_*`,
 * each with its band). Clocks, curves, the beat and the stagger are shared
 * by both variants — only the geometry differs.
 *
 * Delete this file once one reading is adopted: fold the winner into
 * `sinkAndFloat.ts` and remove the loser's branch.
 */
export type VerbDepth = 'current' | 'pushback';

export const verbDepth: VerbDepth = 'pushback';
