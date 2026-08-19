/**
 * Debug switch for the balance card's light — the owner's eye, not a user
 * setting. Flip the constant, reload, compare live on the device: sit on the
 * home screen, switch chains, and watch whether the card reads as a lit pane
 * at depth or as a grey rectangle with a gradient on it.
 *
 * - `none`    — the card as it shipped: the per-chain vertical pane gradient
 *   and nothing else. The reference, not a fallback.
 * - `caustic` — the water's own light on the card's face: a cold `water.light`
 *   reflection gathered on the upper-left shoulder, under the gate's shadow
 *   and above the amount. Static, gradient-only, no blur, no motion.
 *
 * Tunables live next to the layer in `components/BalanceCard/BalanceCard.tsx`
 * (`CAUSTIC_*`, each with its band and the reason the band ends where it does).
 * The colour is not tunable: it is `water.light`, the one cold ink the system
 * allows.
 *
 * Delete this file once one reading is adopted: fold the winner into
 * `BalanceCard.tsx` and remove the loser's branch.
 */
export type CardLight = 'none' | 'caustic';

export const cardLight: CardLight = 'caustic';
