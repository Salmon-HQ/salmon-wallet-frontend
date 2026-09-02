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
  identityClusterCenterOffset,
  onboardingCompactHeight,
  onboardingContentGridCompact,
  onboardingContentGridFull,
  onboardingContentTightGridCompact,
  onboardingContentTightGridFull,
  onboardingCredentialGridCompact,
  onboardingCredentialGridFull,
  onboardingIdentityGridCompact,
  onboardingIdentityGridFull,
  onboardingLockGridCompact,
  onboardingLockGridFull,
  onboardingSlots,
  resolveOnboardingBands,
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
  ['credential/full', onboardingCredentialGridFull],
  ['credential/compact', onboardingCredentialGridCompact],
  ['lock/full', onboardingLockGridFull],
  ['lock/compact', onboardingLockGridCompact],
  ['content/full', onboardingContentGridFull],
  ['content/compact', onboardingContentGridCompact],
  ['contentTight/full', onboardingContentTightGridFull],
  ['contentTight/compact', onboardingContentTightGridCompact],
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
    // Except a band whose union across the variant's screens is genuinely
    // zero: `contentTight` has one screen and it offers a single action, so
    // its `secondary` collapses rather than reserving a hole nothing can ever
    // fill. Asserted on its own below.
    const bands =
      g.variant === 'contentTight' ? reserved(g).filter((_h, i) => i !== 6) : reserved(g);
    for (const height of bands) {
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
    if (grid.variant !== 'contentTight') {
      expect(grid.secondary).toBe(componentSizes.buttonHeight + spacing.lg);
    }
    expect(grid.action).toBe(spacing.lg + componentSizes.buttonHeight + spacing['2xl']);
  });

  it("the mark-led families draw it at the wait's size — one fish on every identity moment", () => {
    // Welcome, unlock and the password screen share the wait screen's mark
    // (owner, 2026-09-02); before that they drew it at 177.
    expect(onboardingIdentityGridFull.markSize).toBe(componentSizes.markHero);
    expect(onboardingIdentityGridFull.markSize).toBe(96);
    expect(onboardingIdentityGridFull.mark).toBe(
      onboardingIdentityGridFull.markSize + spacing['2xl']
    );
    // Still the largest mark in the flow — content keeps its small one.
    expect(onboardingIdentityGridFull.markSize).toBeGreaterThan(onboardingContentGridFull.markSize);
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
    // identity reserves the same body as credential: welcome's emptiness sits
    // under the mark where the fields would be.
    expect(onboardingIdentityGridFull.body).toBe(onboardingCredentialGridFull.body);
    expect(onboardingIdentityGridFull.description).toBe(2 * 24 + spacing['2xl']);
    expect(onboardingContentGridFull.description).toBe(2 * 24 + spacing['2xl']);
    expect(onboardingIdentityGridFull.stack).toBe(736);
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

  it('the consent collapses its empty description so title→copy equals one title line', () => {
    // Same mechanism as the lock, same constant: the copy lives in `body`,
    // which is top-anchored, so a description band of `titleLine − spacing.md`
    // plus the title band's own `spacing.md` tail puts "Help improve Salmon"
    // exactly one title line above its copy — the ~230pt hole is gone.
    expect(onboardingContentTightGridFull.description).toBe(30 - spacing.md);
    expect(spacing.md + onboardingContentTightGridFull.description).toBe(30);
    expect(onboardingContentTightGridFull.description).toBe(onboardingLockGridFull.description);
    // The band survives at both rungs — collapsed is not removed.
    expect(onboardingContentTightGridCompact.description).toBe(
      onboardingContentTightGridFull.description
    );
    // The freed height went to `body`, so the stack matches `content`'s and
    // the control bands hold their Y; everything else is `content`'s table.
    expect(onboardingContentTightGridFull.stack).toBe(onboardingContentGridFull.stack);
    expect(onboardingContentTightGridCompact.stack).toBe(onboardingContentGridCompact.stack);
    // `body` holds what both collapsed bands gave back — the description
    // above, and the secondary below (see the next test).
    expect(onboardingContentTightGridFull.body - onboardingContentGridFull.body).toBe(
      onboardingContentGridFull.description -
        onboardingContentTightGridFull.description +
        onboardingContentGridFull.secondary -
        onboardingContentTightGridFull.secondary
    );
    expect(onboardingContentTightGridFull.mark).toBe(onboardingContentGridFull.mark);
    expect(onboardingContentTightGridFull.markSize).toBe(onboardingContentGridFull.markSize);
  });

  it('contentTight reserves nothing for a secondary its one screen can never have', () => {
    // The union rule cuts both ways: a band no screen in the variant can fill
    // is a hole, not an allowance. The consent screen offers a single action,
    // so the band collapses and `body` takes the height — the stack, and with
    // it the assist band and the action, are exactly `content`'s.
    for (const grid of [onboardingContentTightGridFull, onboardingContentTightGridCompact]) {
      expect(grid.secondary).toBe(0);
    }
    expect(onboardingContentGridFull.secondary).toBeGreaterThan(0);
    expect(onboardingContentTightGridFull.stack).toBe(onboardingContentGridFull.stack);
    expect(onboardingContentTightGridCompact.stack).toBe(onboardingContentGridCompact.stack);
    expect(onboardingContentTightGridFull.assist).toBe(onboardingContentGridFull.assist);
    expect(onboardingContentTightGridFull.action).toBe(onboardingContentGridFull.action);
  });

  describe('a screen with an assist and no secondary', () => {
    // `assist` is the quiet line over the bottom-most primary. With no
    // secondary to hold the band between them, the line would hang in mid-air,
    // so it anchors to the bottom of the region the two share and `body` takes
    // the height freed above it — the password screen's case.
    const grid = onboardingContentGridFull;
    const withSecondary = resolveOnboardingBands(grid, true);
    const withoutSecondary = resolveOnboardingBands(grid, false);

    it('puts its assist directly above the action', () => {
      expect(withoutSecondary.secondary).toBe(0);
      expect(withoutSecondary.assist).toBe(grid.assist);
    });

    it('hands the freed height to body, so the action does not move', () => {
      expect(withoutSecondary.body).toBe(grid.body + grid.secondary);
      // The action is the last band of a stack whose height did not change,
      // so its top edge sits at `stack − action` on both — the button under
      // the thumb is at the same Y as on every sibling screen. The assist,
      // one band up, is the only thing that moved.
      expect(withoutSecondary.stack).toBe(grid.stack);
      expect(withoutSecondary.action).toBe(grid.action);
      const actionTop = (g: OnboardingGrid) => g.stack - g.action;
      expect(actionTop(withoutSecondary)).toBe(actionTop(grid));
      const assistTop = (g: OnboardingGrid) => g.stack - g.action - g.secondary - g.assist;
      expect(assistTop(withoutSecondary)).toBe(assistTop(grid) + grid.secondary);
    });

    it('leaves a screen that carries a secondary exactly as it was', () => {
      expect(withSecondary).toBe(grid);
      // And a variant whose band is already collapsed is returned untouched
      // either way — the two mechanisms cannot double-count.
      expect(resolveOnboardingBands(onboardingContentTightGridFull, false)).toBe(
        onboardingContentTightGridFull
      );
      expect(resolveOnboardingBands(onboardingContentTightGridFull, true)).toBe(
        onboardingContentTightGridFull
      );
    });
  });

  it('welcome and the lock share one cluster — same mark size, same band', () => {
    // Parity is by the shared `heroCluster` constant, not by two numbers that
    // happen to agree. The band's Y is not in the grid any more: the layouts
    // centre the mark band on the screen (owner, 2026-08-18), and the shared
    // `minStack` floor makes both doors clamp to one Y when a short viewport
    // cannot hold a centred fish.
    const id = onboardingIdentityGridFull;
    const lock = onboardingLockGridFull;
    expect(id.markSize).toBe(lock.markSize);
    expect(id.mark).toBe(lock.mark);
    expect(id.chrome).toBe(lock.chrome);
    expect(id.minStack).toBe(lock.minStack);
    expect(onboardingIdentityGridCompact.minStack).toBe(onboardingLockGridCompact.minStack);
  });

  it('the owner-tunable centre offset starts at dead centre', () => {
    // Positive drops both doors' fish below the screen's centre, negative
    // lifts them — one knob, two screens, identical by construction.
    expect(identityClusterCenterOffset).toBe(0);
  });

  it('minStack is the stack with body squeezed to its family’s tallest content', () => {
    // The centring lead may grow only while the viewport holds this, so the
    // fish never buys its centre by pushing real content into the actions.
    const id = onboardingIdentityGridFull;
    const lock = onboardingLockGridFull;
    // identity's floor is the 80pt biometric icon; lock's is the field with
    // the forgot row under it. The hero pair shares the taller of the two.
    const identityFloor = id.stack - id.body + 80;
    const lockFloor =
      lock.stack -
      lock.body +
      componentSizes.inputHeight +
      spacing.sm +
      componentSizes.buttonHeightSmall;
    expect(id.minStack).toBe(Math.max(identityFloor, lockFloor));
    expect(id.minStack).toBeLessThan(id.stack);
    expect(onboardingLockGridFull.minStack).toBeLessThan(onboardingLockGridFull.stack);
  });

  it('spends on body exactly what it saved elsewhere, so all stacks match', () => {
    // This is why the primary action, the secondary, the assist band and the
    // chrome sit at one Y across all sixteen screens even though the mark and
    // the body deliberately differ between the two families.
    expect(onboardingContentGridFull.stack).toBe(onboardingIdentityGridFull.stack);
    expect(onboardingCredentialGridFull.stack).toBe(onboardingIdentityGridFull.stack);
    expect(onboardingLockGridFull.stack).toBe(onboardingIdentityGridFull.stack);
    expect(onboardingContentTightGridFull.stack).toBe(onboardingIdentityGridFull.stack);
    expect(onboardingContentGridCompact.stack).toBe(onboardingIdentityGridCompact.stack);
    expect(onboardingCredentialGridCompact.stack).toBe(onboardingIdentityGridCompact.stack);
    expect(onboardingLockGridCompact.stack).toBe(onboardingIdentityGridCompact.stack);
    expect(onboardingContentTightGridCompact.stack).toBe(onboardingIdentityGridCompact.stack);
    // content buys its taller body by shrinking the mark.
    expect(onboardingContentGridFull.body - onboardingCredentialGridFull.body).toBe(
      onboardingCredentialGridFull.mark - onboardingContentGridFull.mark
    );
  });

  it('identity and credential agree on every band — welcome is the front door with fields', () => {
    const id = onboardingIdentityGridFull;
    const cred = onboardingCredentialGridFull;
    for (const key of [
      'chrome',
      'mark',
      'markSize',
      'title',
      'description',
      'body',
      'assist',
      'secondary',
      'action',
    ] as const) {
      expect(id[key]).toBe(cred[key]);
    }
  });

  it.each([
    ['identity', onboardingIdentityGridFull, onboardingIdentityGridCompact],
    ['credential', onboardingCredentialGridFull, onboardingCredentialGridCompact],
    ['content', onboardingContentGridFull, onboardingContentGridCompact],
  ])('%s: the compact rung reserves less, and only in the description', (_n, full, compact) => {
    expect(compact.stack).toBeLessThan(full.stack);
    expect(compact.description).toBeLessThan(full.description);
    for (const key of [
      'chrome',
      'mark',
      'markSize',
      'title',
      'body',
      'assist',
      'secondary',
      'action',
    ] as const) {
      expect(compact[key]).toBe(full[key]);
    }
  });

  it.each([
    ['lock', onboardingLockGridFull, onboardingLockGridCompact],
    ['contentTight', onboardingContentTightGridFull, onboardingContentTightGridCompact],
  ])(
    '%s: the compact rung pays out of body — its description is already collapsed',
    (_n, full, compact) => {
      // A collapsed description is a fixed run of air, not copy, so the rung has
      // no line to drop there; the height the siblings save on description these
      // variants save on the body that had absorbed it. The stacks stay in step.
      expect(compact.stack).toBeLessThan(full.stack);
      expect(compact.body).toBeLessThan(full.body);
      for (const key of [
        'chrome',
        'mark',
        'markSize',
        'title',
        'description',
        'assist',
        'secondary',
        'action',
      ] as const) {
        expect(compact[key]).toBe(full[key]);
      }
    }
  );

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
    for (const variant of ['identity', 'credential', 'lock', 'content', 'contentTight'] as const) {
      expect(resolveOnboardingGrid(variant, 781).variant).toBe(variant);
      expect(resolveOnboardingGrid(variant, 781)).toBe(resolveOnboardingGrid(variant, 876));
    }
  });

  it('never removes an element between rungs — it only tightens a band', () => {
    // Losing a whole line of copy because a device is two points shorter is not
    // degradation, it is a defect. The compact rung reserves one description
    // line instead of two and changes nothing else; every other band and the
    // mark size are identical, so no element can vanish with the rung.
    // (`minStack` and `stack` are derived totals, not bands.)
    for (const [full, compact] of [
      [onboardingIdentityGridFull, onboardingIdentityGridCompact],
      [onboardingCredentialGridFull, onboardingCredentialGridCompact],
      [onboardingContentGridFull, onboardingContentGridCompact],
    ] as const) {
      const differing = (Object.keys(full) as (keyof OnboardingGrid)[]).filter(
        (key) => full[key] !== compact[key]
      );
      expect(differing.sort()).toEqual(['description', 'minStack', 'stack']);
      expect(compact.description).toBeGreaterThan(0);
    }
    // The lock and the consent carry no description copy at either rung, so
    // their rung tightens `body` instead — still a band, never an element.
    // (The lock's `minStack` moves too, because it is shared with identity's,
    // whose description does change; `contentTight`'s floor is `body` at zero,
    // so `stack − body` — and with it `minStack` — is identical at both rungs.)
    for (const [full, compact, differingKeys] of [
      [onboardingLockGridFull, onboardingLockGridCompact, ['body', 'minStack', 'stack']],
      [onboardingContentTightGridFull, onboardingContentTightGridCompact, ['body', 'stack']],
    ] as const) {
      const differing = (Object.keys(full) as (keyof OnboardingGrid)[]).filter(
        (key) => full[key] !== compact[key]
      );
      expect(differing.sort()).toEqual([...differingKeys]);
    }
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
    expect(resolveOnboardingGrid('contentTight', undefined)).toBe(onboardingContentTightGridFull);
    expect(resolveOnboardingGrid('contentTight', onboardingCompactHeight)).toBe(
      onboardingContentTightGridCompact
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
    expect(onboardingContentTightGridFull.variant).toBe('contentTight');
  });
});
