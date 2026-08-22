/**
 * Debug switch for the balance card's light — the owner's eye, not a user
 * setting. Flip the constant, reload, compare live on the device: sit on the
 * home screen, switch chains, and watch whether the card reads as a lit pane
 * at depth or as a grey rectangle with a gradient on it.
 *
 * The first pass shipped one reading and it was invisible on the device, which
 * is the one outcome that cannot be judged. So the switch now carries a range
 * rather than a proposal, and the question it asks is not "is this right?" but
 * "where between these does it stop being a reflection?".
 *
 * - `none`    — the card as it shipped: the per-chain vertical pane gradient
 *   and nothing else. The reference, not a fallback.
 * - `subtle`  — the first pass, preserved verbatim so the reading that was
 *   already judged stays on the dial and the comparison is honest.
 * - `present` — the intended reading: the same gathered shape, opened up until
 *   it is actually visible on an OLED phone at arm's length.
 * - `bold`    — deliberately past the point of comfort. It exists to bracket
 *   the answer from above: if `bold` reads as a header treatment or a glow,
 *   then the truth is between `present` and `bold`, and that is a far more
 *   useful thing to know than another invisible reading.
 *
 * Every reading is the same light — the same two crossing filaments on the same
 * axes, in the same `water.light` ink. Only how bright it peaks, how far it
 * survives, and how much the second filament carries change between them.
 * Static, gradient-only, no blur, no motion, at every reading.
 *
 * The per-reading numbers and the contrast arithmetic that bounds them live
 * next to the layer in `components/BalanceCard/BalanceCard.tsx`
 * (`CAUSTIC_READINGS`). The colour is not tunable: it is `water.light`, the one
 * cold ink the system allows.
 *
 * Delete this file once one reading is adopted: fold the winner's numbers into
 * `BalanceCard.tsx` and remove the rest.
 */
export type CardLight = 'none' | 'subtle' | 'present' | 'bold';

export const cardLight: CardLight = 'present';
