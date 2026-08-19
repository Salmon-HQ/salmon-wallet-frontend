/**
 * Debug switch for the thermocline material — the owner's eye, not a user
 * setting. DOM mirror of `apps/mobile/src/debug/thermoclineVariant.ts`; keep
 * the two in step by hand when comparing looks across platforms.
 *
 * - `glass`  — the full degradation ladder (backdrop blur where supported).
 * - `opaque` — rung 5 as the identity: the nearest opaque plane everywhere.
 * - `tint`   — the translucent ink alone, no blur.
 *
 * All three keep the scrim floor and the refraction strip. The OS
 * `prefers-reduced-transparency` signal still wins over any variant.
 */
export type ThermoclineVariant = 'glass' | 'opaque' | 'tint';

export const thermoclineVariant: ThermoclineVariant = 'glass';
