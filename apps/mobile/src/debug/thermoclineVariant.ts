/**
 * Debug switch for the thermocline material — the owner's eye, not a user
 * setting. Flip the constant, reload, compare. The DOM mirror lives at
 * `packages/ui/src/components/Thermocline/thermoclineVariant.ts`.
 *
 * - `glass`  — the full degradation ladder (liquid glass / blur / opaque).
 * - `opaque` — rung 5 as the identity: the nearest opaque plane everywhere.
 * - `tint`   — the translucent ink alone, no blur.
 *
 * All three keep the scrim floor (legibility never varies with the switch)
 * and the refraction strip. The OS Reduce Transparency signal still wins
 * over any variant — accessibility outranks the debug eye.
 */
export type ThermoclineVariant = 'glass' | 'opaque' | 'tint';

export const thermoclineVariant: ThermoclineVariant = 'glass';
