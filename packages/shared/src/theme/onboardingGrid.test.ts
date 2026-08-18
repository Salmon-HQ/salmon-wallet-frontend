/**
 * The reserved-height tables, pinned — one per variant.
 *
 * A slot grid is only worth having if its numbers cannot drift. Every height
 * here is derived from a token, so the assertions check two separate things:
 * that each part still equals the token arithmetic it claims, and that the
 * stack still equals the sum of its parts. Assert only the total and a token
 * change silently redistributes the grid; assert only the parts and the total
 * can be edited out from under them.
 *
 * The invariant the product owner asked for is **within a family**: every
 * screen of one variant agrees on all eight reserved heights, so every slot on
 * them lands at the same Y. Between families the mark and the body differ on
 * purpose — a screen that greets is not shaped like a screen that shows twelve
 * words.
 */
import { describe, expect, it } from 'vitest';
import {
  onboardingCompactHeight,
  onboardingContentGridCompact,
  onboardingContentGridFull,
  onboardingIdentityGridCompact,
  onboardingIdentityGridFull,
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
  g.body,
  g.assist,
  g.secondary,
  g.action,
];

const grids: [string, OnboardingGrid][] = [
  ['identity/full', onboardingIdentityGridFull],
  ['identity/compact', onboardingIdentityGridCompact],
  ['content/full', onboardingContentGridFull],
  ['content/compact', onboardingContentGridCompact],
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

  it.each(grids)('%s: the stack is the sum of its parts, body included', (_name, grid) => {
    // Every slot is reserved, so the stack has one height — which is what
    // makes centring it possible without any slot's Y depending on content.
    expect(grid.stack).toBe(reserved(grid).reduce((sum, h) => sum + h, 0));
  });

  it.each(grids)('%s: no reserved slot is zero — an empty slot still occupies its band', (_n, g) => {
    for (const height of reserved(g)) expect(height).toBeGreaterThan(0);
  });

  it.each(grids)('%s: the bands that hold controls are identical in both families', (_n, grid) => {
    // Deliberately shared across variants: the chrome band, the assist band,
    // the secondary and the primary action. Only the mark and the body differ
    // between families, and the two differences cancel — see the stack test.
    expect(grid.chrome).toBe(componentSizes.headerHeight);
    expect(grid.title).toBe(2 * 30 + spacing.md);
    // 44 (TextButton) + 16 (gap) = 60 — the derivable helper's measured
    // footprint. The helper appearing on Success must land in space that was
    // always there.
    expect(grid.assist).toBe(componentSizes.buttonHeightSmall + spacing.lg);
    expect(grid.assist).toBe(60);
    expect(grid.secondary).toBe(componentSizes.buttonHeight + spacing.lg);
    expect(grid.action).toBe(spacing.lg + componentSizes.buttonHeight + spacing['2xl']);
  });

  it('identity draws the mark large — it is the screen, not a badge on it', () => {
    // Welcome, unlock and the password screen. The first pass drew it at 80
    // and it read as a small mark floating above an enormous void.
    expect(onboardingIdentityGridFull.markSize).toBe(componentSizes.logoSizeLarge + spacing['4xl']);
    expect(onboardingIdentityGridFull.markSize).toBe(177);
    expect(onboardingIdentityGridFull.mark).toBe(
      onboardingIdentityGridFull.markSize + spacing['2xl']
    );
    // Substantially larger than the first pass, not a nudge.
    expect(onboardingIdentityGridFull.markSize).toBeGreaterThan(
      2 * onboardingContentGridFull.markSize
    );
  });

  it('content keeps the mark subordinate and hands the middle to the words', () => {
    expect(onboardingContentGridFull.markSize).toBe(componentSizes.logoSizeSmall);
    expect(onboardingContentGridFull.mark).toBe(onboardingContentGridFull.markSize + spacing.lg);
    expect(onboardingContentGridFull.body).toBeGreaterThan(onboardingIdentityGridFull.body);
  });

  it('the full grids reserve what their tokens say they do', () => {
    // identity's body: two fields and the strength meter under them.
    expect(onboardingIdentityGridFull.body).toBe(
      2 * componentSizes.inputHeight + componentSizes.buttonHeightSmall + 2 * spacing.lg
    );
    expect(onboardingIdentityGridFull.description).toBe(2 * 24 + spacing['2xl']);
    expect(onboardingContentGridFull.description).toBe(2 * 24 + spacing['2xl']);
    expect(onboardingIdentityGridFull.stack).toBe(817);
  });

  it('spends on body exactly what it saved on the mark, so both stacks match', () => {
    // This is why the primary action, the secondary, the assist band and the
    // chrome sit at one Y across all sixteen screens even though the mark and
    // the body deliberately differ between the two families.
    expect(onboardingContentGridFull.stack).toBe(onboardingIdentityGridFull.stack);
    expect(onboardingContentGridCompact.stack).toBe(onboardingIdentityGridCompact.stack);
    expect(onboardingContentGridFull.body - onboardingIdentityGridFull.body).toBe(
      onboardingIdentityGridFull.mark - onboardingContentGridFull.mark
    );
  });

  it.each([
    ['identity', onboardingIdentityGridFull, onboardingIdentityGridCompact],
    ['content', onboardingContentGridFull, onboardingContentGridCompact],
  ])('%s: the compact rung reserves less, and only in the description', (_n, full, compact) => {
    expect(compact.stack).toBeLessThan(full.stack);
    expect(compact.description).toBeLessThan(full.description);
    for (const key of ['chrome', 'mark', 'markSize', 'title', 'body', 'assist', 'secondary', 'action'] as const) {
      expect(compact[key]).toBe(full[key]);
    }
  });

  it('never shrinks the mark — its size is unconditional', () => {
    // A mark that changes size with the viewport changes size between two
    // screens of one flow on one device. The description pays for the compact
    // rung instead.
    expect(onboardingIdentityGridCompact.markSize).toBe(onboardingIdentityGridFull.markSize);
    expect(onboardingContentGridCompact.markSize).toBe(onboardingContentGridFull.markSize);
  });

  it('picks a table by variant and available height, full before measurement', () => {
    expect(resolveOnboardingGrid('identity', undefined)).toBe(onboardingIdentityGridFull);
    expect(resolveOnboardingGrid('content', undefined)).toBe(onboardingContentGridFull);
    expect(resolveOnboardingGrid('identity', onboardingCompactHeight)).toBe(
      onboardingIdentityGridCompact
    );
    expect(resolveOnboardingGrid('content', onboardingCompactHeight)).toBe(
      onboardingContentGridCompact
    );
    expect(resolveOnboardingGrid('identity', onboardingCompactHeight + 1)).toBe(
      onboardingIdentityGridFull
    );
  });

  it('every grid reports the variant it belongs to', () => {
    expect(onboardingIdentityGridFull.variant).toBe('identity');
    expect(onboardingContentGridCompact.variant).toBe('content');
  });
});
