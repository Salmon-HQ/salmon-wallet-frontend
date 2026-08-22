/**
 * One radius for every control.
 *
 * The product owner's decision: a button must read with the same roundness as
 * a token list row and a text input. It is not a pill. `buttonRadius` used to
 * be 28 — on a 56px control that is a full pill — and inputs sat at 8, so the
 * two references he named disagreed with each other and with the buttons.
 *
 * These assertions exist so a future call site cannot quietly reintroduce a
 * pill by editing one of the aliases instead of the shared number.
 */
import { describe, expect, it } from 'vitest';
import { borderRadius, componentSizes } from './spacing';

/** The one number. Change this line and the whole system moves together. */
const CONTROL_RADIUS = 12;

describe('the control radius', () => {
  it('is 12 — the token-list-row radius, not a pill', () => {
    expect(borderRadius.lg).toBe(CONTROL_RADIUS);
  });

  it.each([
    ['componentSizes.buttonRadius', componentSizes.buttonRadius],
    ['componentSizes.inputRadius', componentSizes.inputRadius],
    ['componentSizes.actionButtonRadius', componentSizes.actionButtonRadius],
    // The tab bar too — the product owner's call: it is a control, not a pill
    // (it was 28). `GlassTabBar` consumes this token on all its layers.
    ['componentSizes.tabBarRadius', componentSizes.tabBarRadius],
    ['borderRadius.button', borderRadius.button],
  ])('%s resolves to the control radius', (_name, value) => {
    expect(value).toBe(CONTROL_RADIUS);
  });

  it('has no control token at a pill radius', () => {
    // A pill is half the control height or more. The shortest control in the
    // system is 42px (`buttonHeightCompact`), so anything at 21+ is a pill.
    const pillFloor = componentSizes.buttonHeightCompact / 2;
    for (const value of [
      componentSizes.buttonRadius,
      componentSizes.inputRadius,
      componentSizes.actionButtonRadius,
      componentSizes.tabBarRadius,
      borderRadius.button,
    ]) {
      expect(value).toBeLessThan(pillFloor);
    }
  });
});
