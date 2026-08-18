/**
 * The reserved-height table, pinned.
 *
 * A slot grid is only worth having if its numbers cannot drift. Every height
 * here is derived from a token, so the assertions check two separate things:
 * that each part still equals the token arithmetic it claims, and that the
 * fixed total still equals the sum of its parts. Assert only the total and a
 * token change silently redistributes the grid; assert only the parts and the
 * total can be edited out from under them.
 */
import { describe, expect, it } from 'vitest';
import {
  onboardingCompactHeight,
  onboardingGridCompact,
  onboardingGridFull,
  onboardingSlots,
  resolveOnboardingGrid,
  type OnboardingGrid,
} from './onboardingGrid';
import { componentSizes, spacing } from './spacing';

const reserved = (g: OnboardingGrid) => [
  g.chrome,
  g.mark,
  g.title,
  g.description,
  g.assist,
  g.secondary,
  g.action,
];

describe('the onboarding slot grid', () => {
  it('names eight slots, with the action last so nothing sits below it', () => {
    expect([...onboardingSlots]).toEqual([
      'chrome',
      'mark',
      'title',
      'description',
      'body',
      'assist',
      'secondary',
      'action',
    ]);
    expect(onboardingSlots[onboardingSlots.length - 1]).toBe('action');
  });

  it.each([
    ['full', onboardingGridFull],
    ['compact', onboardingGridCompact],
  ])('%s: the fixed total is the sum of its parts', (_rung, grid) => {
    expect(grid.fixedTotal).toBe(reserved(grid).reduce((sum, h) => sum + h, 0));
  });

  it.each([
    ['full', onboardingGridFull],
    ['compact', onboardingGridCompact],
  ])('%s: no reserved slot is zero — an empty slot still occupies its band', (_rung, grid) => {
    for (const height of reserved(grid)) expect(height).toBeGreaterThan(0);
  });

  it('the full grid reserves what its tokens say it does', () => {
    expect(onboardingGridFull.chrome).toBe(componentSizes.headerHeight);
    expect(onboardingGridFull.mark).toBe(componentSizes.logoSizeMedium + spacing['2xl']);
    expect(onboardingGridFull.title).toBe(2 * 30 + spacing.md);
    expect(onboardingGridFull.description).toBe(2 * 24 + spacing['2xl']);
    expect(onboardingGridFull.assist).toBe(componentSizes.buttonHeightSmall + spacing.lg);
    expect(onboardingGridFull.secondary).toBe(componentSizes.buttonHeight + spacing.lg);
    expect(onboardingGridFull.action).toBe(
      spacing.lg + componentSizes.buttonHeight + spacing['2xl']
    );
    expect(onboardingGridFull.fixedTotal).toBe(572);
  });

  it('the assist band is exactly the derivable helper it was sized for', () => {
    // 44 (TextButton) + 16 (gap) = 60 — the helper's measured footprint. The
    // helper appearing on Success must land in space that was always there.
    expect(onboardingGridFull.assist).toBe(60);
    expect(onboardingGridCompact.assist).toBe(60);
  });

  it('reserves the mark band at unlock size, and draws 80 everywhere else', () => {
    // The band is sized by unlock, which keeps the larger mark; every other
    // screen centres its 80 inside that band rather than shrinking it.
    expect(onboardingGridFull.markSize).toBe(componentSizes.logoSizeSmall);
    expect(onboardingGridFull.markBox).toBeGreaterThanOrEqual(onboardingGridFull.markSize);
    expect(onboardingGridCompact.markBox).toBeGreaterThanOrEqual(onboardingGridCompact.markSize);
  });

  it('the compact rung reserves strictly less, and only in the mark and description', () => {
    expect(onboardingGridCompact.fixedTotal).toBeLessThan(onboardingGridFull.fixedTotal);
    expect(onboardingGridCompact.mark).toBeLessThan(onboardingGridFull.mark);
    expect(onboardingGridCompact.description).toBeLessThan(onboardingGridFull.description);
    for (const key of ['chrome', 'title', 'assist', 'secondary', 'action'] as const) {
      expect(onboardingGridCompact[key]).toBe(onboardingGridFull[key]);
    }
  });

  it('leaves a phone enough body for the three-input confirmation step', () => {
    // 844pt frame less its insets. Three 56pt inputs and two 16pt gaps = 200.
    const phone = 751;
    expect(resolveOnboardingGrid(phone)).toBe(onboardingGridCompact);
    expect(phone - onboardingGridCompact.fixedTotal).toBeGreaterThanOrEqual(200);
  });

  it('picks a rung by available height, and the full grid before measurement', () => {
    expect(resolveOnboardingGrid(undefined)).toBe(onboardingGridFull);
    expect(resolveOnboardingGrid(onboardingCompactHeight)).toBe(onboardingGridCompact);
    expect(resolveOnboardingGrid(onboardingCompactHeight + 1)).toBe(onboardingGridFull);
  });
});
