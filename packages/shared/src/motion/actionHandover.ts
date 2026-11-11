/**
 * The onboarding action handover. Every onboarding step draws its primary
 * action in the same slot, so moving between steps reads as one button whose
 * label changes — not a button that blinks out and back. The new step's
 * button starts lit or unlit as the last one was, then eases to its own state.
 * Each platform's `OnboardingLayout` marks its action slot with an
 * `OnboardingActionContext` that its `PrimaryButton` reads.
 *
 * @module motion/actionHandover
 */

// ponytail: one module-level slot — onboarding shows one action at a time.
let lastLit: boolean | null = null;

/** Whether the previous onboarding action was lit; null before the first one. */
export const previousActionLit = (): boolean | null => lastLit;

export function recordActionLit(lit: boolean): void {
  lastLit = lit;
}
