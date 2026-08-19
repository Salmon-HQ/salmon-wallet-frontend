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
  identityClusterLead,
  onboardingCompactHeight,
  onboardingContentGridCompact,
  onboardingContentGridFull,
  onboardingCredentialGridCompact,
  onboardingCredentialGridFull,
  onboardingIdentityGridCompact,
  onboardingIdentityGridFull,
  onboardingLockGridCompact,
  onboardingLockGridFull,
  onboardingSlots,
  resolveOnboardingGrid,
  type OnboardingGrid,
} from './onboardingGrid';
import { componentSizes, spacing } from './spacing';

const reserved = (g: OnboardingGrid) => [
  g.chrome,
  g.lead,
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
  ['credential/full', onboardingCredentialGridFull],
  ['credential/compact', onboardingCredentialGridCompact],
  ['lock/full', onboardingLockGridFull],
  ['lock/compact', onboardingLockGridCompact],
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

  it.each(grids)('%s: no content slot is zero — an empty slot still occupies its band', (_n, g) => {
    // `lead` is the exception and is allowed to be zero: it is not a slot, it
    // is the space a family gives back when it needs less `body` than its
    // siblings, and the families whose `body` is full give nothing back.
    for (const height of reserved(g).filter((h) => h !== g.lead)) {
      expect(height).toBeGreaterThan(0);
    }
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

  it('the mark-led families draw it large — it is the screen, not a badge on it', () => {
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
    // `credential` is the same front door with a field on it.
    expect(onboardingCredentialGridFull.markSize).toBe(onboardingIdentityGridFull.markSize);
    expect(onboardingCredentialGridFull.mark).toBe(onboardingIdentityGridFull.mark);
  });

  it('content keeps the mark subordinate and hands the middle to the words', () => {
    expect(onboardingContentGridFull.markSize).toBe(componentSizes.logoSizeSmall);
    expect(onboardingContentGridFull.mark).toBe(onboardingContentGridFull.markSize + spacing.lg);
    expect(onboardingContentGridFull.body).toBeGreaterThan(onboardingIdentityGridFull.body);
  });

  it('the full grids reserve what their tokens say they do', () => {
    // credential's body: two fields and the strength meter under them.
    expect(onboardingCredentialGridFull.body).toBe(
      2 * componentSizes.inputHeight + componentSizes.buttonHeightSmall + 2 * spacing.lg
    );
    // identity reserves the same body as credential, minus whatever the owner
    // tunes into the cluster lead: the lock is the reference, and welcome's
    // emptiness sits under the mark where the fields would be.
    expect(onboardingIdentityGridFull.body).toBe(
      onboardingCredentialGridFull.body - identityClusterLead
    );
    expect(onboardingIdentityGridFull.description).toBe(2 * 24 + spacing['2xl']);
    expect(onboardingContentGridFull.description).toBe(2 * 24 + spacing['2xl']);
    expect(onboardingIdentityGridFull.stack).toBe(817);
  });

  it('the lock collapses its empty description so title→input equals fish→title', () => {
    // The fish sits one title line (30) above the title's ink, because the
    // title band anchors its text down over a `spacing.md` of padding. The
    // title band ends `spacing.md` below the text, so a description band of
    // `titleLine − spacing.md` makes title→input one title line too.
    expect(onboardingLockGridFull.description).toBe(30 - spacing.md);
    expect(spacing.md + onboardingLockGridFull.description).toBe(30);
    // The band survives at both rungs — collapsed is not removed.
    expect(onboardingLockGridCompact.description).toBe(onboardingLockGridFull.description);
    // The freed height went to `body`, so the lock's stack matches its
    // siblings' and the control bands hold their Y.
    expect(onboardingLockGridFull.stack).toBe(onboardingCredentialGridFull.stack);
    expect(onboardingLockGridCompact.stack).toBe(onboardingCredentialGridCompact.stack);
  });

  it('welcome and the lock share one cluster — same mark size, same band Y', () => {
    // The lock is the identity reference (owner, 2026-08-18). Parity is by
    // the shared `heroCluster` constant and the one `identityClusterLead`
    // knob, not by two numbers that happen to agree.
    const id = onboardingIdentityGridFull;
    const lock = onboardingLockGridFull;
    expect(id.markSize).toBe(lock.markSize);
    expect(id.mark).toBe(lock.mark);
    // Same Y for the mark band: everything above it agrees.
    expect(id.chrome + id.lead).toBe(lock.chrome + lock.lead);
    expect(id.lead).toBe(identityClusterLead);
    expect(lock.lead).toBe(identityClusterLead);
  });

  it('spends on body or lead exactly what it saved elsewhere, so all stacks match', () => {
    // This is why the primary action, the secondary, the assist band and the
    // chrome sit at one Y across all sixteen screens even though the mark and
    // the body deliberately differ between the two families.
    expect(onboardingContentGridFull.stack).toBe(onboardingIdentityGridFull.stack);
    expect(onboardingCredentialGridFull.stack).toBe(onboardingIdentityGridFull.stack);
    expect(onboardingLockGridFull.stack).toBe(onboardingIdentityGridFull.stack);
    expect(onboardingContentGridCompact.stack).toBe(onboardingIdentityGridCompact.stack);
    expect(onboardingCredentialGridCompact.stack).toBe(onboardingIdentityGridCompact.stack);
    expect(onboardingLockGridCompact.stack).toBe(onboardingIdentityGridCompact.stack);
    // content buys its taller body by shrinking the mark...
    expect(onboardingContentGridFull.body - onboardingCredentialGridFull.body).toBe(
      onboardingCredentialGridFull.mark - onboardingContentGridFull.mark
    );
    // ...and identity pays any tuned-in lead out of its body, never the bands.
    expect(onboardingIdentityGridFull.lead).toBe(
      onboardingCredentialGridFull.body - onboardingIdentityGridFull.body
    );
    expect(onboardingCredentialGridFull.lead).toBe(0);
    expect(onboardingContentGridFull.lead).toBe(0);
  });

  it('identity no longer lifts — the lock is the reference and welcome matches it', () => {
    // The 92pt lead that raised welcome's fish above the lock's is gone
    // (owner, 2026-08-18): the two screens share every band above `body`, so
    // the fish, the title and the description sit at one Y across them.
    const id = onboardingIdentityGridFull;
    const cred = onboardingCredentialGridFull;
    for (const key of ['chrome', 'mark', 'markSize', 'title', 'description', 'assist', 'secondary', 'action'] as const) {
      expect(id[key]).toBe(cred[key]);
    }
    expect(id.lead - cred.lead).toBe(identityClusterLead);
  });

  it.each([
    ['identity', onboardingIdentityGridFull, onboardingIdentityGridCompact],
    ['credential', onboardingCredentialGridFull, onboardingCredentialGridCompact],
    ['content', onboardingContentGridFull, onboardingContentGridCompact],
  ])('%s: the compact rung reserves less, and only in the description', (_n, full, compact) => {
    expect(compact.stack).toBeLessThan(full.stack);
    expect(compact.description).toBeLessThan(full.description);
    for (const key of ['chrome', 'lead', 'mark', 'markSize', 'title', 'body', 'assist', 'secondary', 'action'] as const) {
      expect(compact[key]).toBe(full[key]);
    }
  });

  it('lock: the compact rung pays out of body — its description is already collapsed', () => {
    // The lock's description is a fixed run of air, not copy, so the rung has
    // no line to drop there; the height the siblings save on description the
    // lock saves on the body that had absorbed it. The stacks stay in step.
    const full = onboardingLockGridFull;
    const compact = onboardingLockGridCompact;
    expect(compact.stack).toBeLessThan(full.stack);
    expect(compact.body).toBeLessThan(full.body);
    for (const key of ['chrome', 'lead', 'mark', 'markSize', 'title', 'description', 'assist', 'secondary', 'action'] as const) {
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

  it('keeps the rung boundary clear of every phone in use', () => {
    // A Pixel 9 Pro has 876dp of layout height and an iPhone 17 about 781pt
    // once the Dynamic Island and the home indicator are out. At 800 those two
    // sat either side of the boundary and resolved to different tables from the
    // same bundle. The boundary belongs nowhere near a shipping handset.
    const shortestPhoneInUse = 781;
    expect(onboardingCompactHeight).toBeLessThan(shortestPhoneInUse - 100);
    for (const variant of ['identity', 'credential', 'lock', 'content'] as const) {
      expect(resolveOnboardingGrid(variant, 781).variant).toBe(variant);
      expect(resolveOnboardingGrid(variant, 781)).toBe(resolveOnboardingGrid(variant, 876));
    }
  });

  it('never removes an element between rungs — it only tightens a band', () => {
    // Losing a whole line of copy because a device is two points shorter is not
    // degradation, it is a defect. The compact rung reserves one description
    // line instead of two and changes nothing else; every other band, the mark
    // size and the lead are identical, so no element can vanish with the rung.
    for (const [full, compact] of [
      [onboardingIdentityGridFull, onboardingIdentityGridCompact],
      [onboardingCredentialGridFull, onboardingCredentialGridCompact],
      [onboardingContentGridFull, onboardingContentGridCompact],
    ] as const) {
      const differing = (Object.keys(full) as (keyof OnboardingGrid)[]).filter(
        (key) => full[key] !== compact[key]
      );
      expect(differing.sort()).toEqual(['description', 'stack']);
      expect(compact.description).toBeGreaterThan(0);
    }
    // The lock carries no description copy at either rung, so its rung
    // tightens `body` instead — still a band, never an element.
    const lockDiffering = (Object.keys(onboardingLockGridFull) as (keyof OnboardingGrid)[]).filter(
      (key) => onboardingLockGridFull[key] !== onboardingLockGridCompact[key]
    );
    expect(lockDiffering.sort()).toEqual(['body', 'stack']);
  });

  it('picks a table by variant and available height, full before measurement', () => {
    expect(resolveOnboardingGrid('identity', undefined)).toBe(onboardingIdentityGridFull);
    expect(resolveOnboardingGrid('content', undefined)).toBe(onboardingContentGridFull);
    expect(resolveOnboardingGrid('credential', undefined)).toBe(onboardingCredentialGridFull);
    expect(resolveOnboardingGrid('lock', undefined)).toBe(onboardingLockGridFull);
    expect(resolveOnboardingGrid('lock', onboardingCompactHeight)).toBe(onboardingLockGridCompact);
    expect(resolveOnboardingGrid('credential', onboardingCompactHeight)).toBe(
      onboardingCredentialGridCompact
    );
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
    expect(onboardingCredentialGridFull.variant).toBe('credential');
    expect(onboardingLockGridFull.variant).toBe('lock');
    expect(onboardingContentGridCompact.variant).toBe('content');
  });
});
