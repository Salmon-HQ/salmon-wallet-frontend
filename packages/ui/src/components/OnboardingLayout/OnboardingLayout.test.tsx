/**
 * @vitest-environment jsdom
 *
 * The grid's promise, asserted at authoring time — per variant.
 *
 * jsdom does no layout, so a rendered Y is not available here. It does not
 * need to be. The column is a fixed-height stack: `chrome`, `mark`, `title`
 * and `description` above one flexible `body`, then `assist`, `secondary` and
 * `action` below it. In that stack the Y of every slot above `body` is the sum
 * of the reserved heights before it, and the Y of every slot below `body` is
 * the column height minus the reserved heights after it. So if two screens
 * agree on all eight reserved heights, every slot on them is at an identical Y
 * — which is what these check. The rendered Y itself is asserted by the
 * Playwright suites, at two viewports and in two languages.
 *
 * The invariant is **within a family**. Between families the mark and the body
 * differ on purpose, and the difference cancels, so the control bands hold.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The real token tables, not a stand-in — the point of these assertions is
// that the layout reads that one table rather than re-deriving anything. The
// root `@salmon/shared` barrel cannot be imported here (it reaches React
// Native, which Vite cannot parse), so the theme subtree is imported directly
// and stands in for the barrel.
vi.mock('@salmon/shared', async () => {
  const theme = await import('../../../../shared/src/theme');
  // The sink's own numbers live outside the theme subtree, and the column
  // reads them to give way to a wait.
  const sinkFloat = await import('../../../../shared/src/motion/sinkFloat');
  return { ...theme, ...sinkFloat };
});

import {
  onboardingContentGridFull,
  onboardingIdentityGridFull,
} from '../../../../shared/src/theme';
import type { OnboardingVariant } from '../../../../shared/src/theme';
import { OnboardingLayout } from './OnboardingLayout';
import { ReservedSlot } from './ReservedSlot';

const SLOTS = [
  'chrome',
  'mark',
  'title',
  'description',
  'body',
  'assist',
  'secondary',
  'action',
] as const;

/**
 * What each slot actually reserves. `title` and `description` are allowed to
 * grow, so they declare a `minHeight`; the rest are fixed.
 */
const reservedHeights = () =>
  Object.fromEntries(
    SLOTS.filter((slot) => screen.queryByTestId(`onboarding-slot-${slot}`)).map((slot) => {
      const style = screen.getByTestId(`onboarding-slot-${slot}`).style;
      return [slot, style.height || style.minHeight];
    })
  );

const tableFor = (variant: OnboardingVariant) =>
  variant === 'content' ? onboardingContentGridFull : onboardingIdentityGridFull;

afterEach(cleanup);

describe('OnboardingLayout', () => {
  it.each(['identity', 'content'] as const)(
    '%s: reserves every slot at that variant’s table height',
    (variant) => {
      render(<OnboardingLayout variant={variant} />);
      const grid = tableFor(variant);

      expect(reservedHeights()).toEqual({
        chrome: `${grid.chrome}px`,
        mark: `${grid.mark}px`,
        title: `${grid.title}px`,
        description: `${grid.description}px`,
        body: `${grid.body}px`,
        assist: `${grid.assist}px`,
        secondary: `${grid.secondary}px`,
        action: `${grid.action}px`,
      });
    }
  );

  it('defaults to identity, so unlock and welcome need not ask for it', () => {
    render(<OnboardingLayout />);
    expect(reservedHeights().mark).toBe(`${onboardingIdentityGridFull.mark}px`);
  });

  it.each(['identity', 'content'] as const)(
    '%s: leaves an unused slot empty rather than collapsing it',
    (variant) => {
      // The whole point. A screen with nothing in `assist` and nothing in
      // `secondary` reserves exactly as much as one that fills both, so moving
      // between them cannot move the primary action.
      const bare = render(<OnboardingLayout variant={variant} action={<button>Go</button>} />);
      const bareHeights = reservedHeights();
      bare.unmount();

      render(
        <OnboardingLayout
          variant={variant}
          chrome={<button>back</button>}
          title={<span>Title</span>}
          description={<span>Description</span>}
          body={<span>Body</span>}
          assist={<button>What is a derivable?</button>}
          secondary={<button>Check derivables</button>}
          action={<button>Go</button>}
        />
      );

      expect(reservedHeights()).toEqual(bareHeights);
    }
  );

  it('does not move a slot when an optional control is revealed', () => {
    // The Success screen's helper and the recover screen's Next: both arrive
    // after first paint, and neither may shift anything.
    const before = render(
      <OnboardingLayout
        action={
          <ReservedSlot visible={false}>
            <button>Next</button>
          </ReservedSlot>
        }
      />
    );
    const beforeHeights = reservedHeights();
    before.unmount();

    render(
      <OnboardingLayout
        assist={<span>What is a derivable?</span>}
        action={
          <ReservedSlot visible>
            <button>Next</button>
          </ReservedSlot>
        }
      />
    );

    expect(reservedHeights()).toEqual(beforeHeights);
  });

  it('holds the two families’ control bands at one height', () => {
    // Only the mark and the body differ between families, and the difference
    // cancels — so the chrome, assist, secondary and action bands land at the
    // same Y on every screen in scope.
    const identity = render(<OnboardingLayout variant="identity" />);
    const identityHeights = reservedHeights();
    identity.unmount();

    render(<OnboardingLayout variant="content" />);
    const contentHeights = reservedHeights();

    for (const slot of ['chrome', 'title', 'description', 'assist', 'secondary', 'action']) {
      expect(contentHeights[slot]).toBe(identityHeights[slot]);
    }
    expect(contentHeights.mark).not.toBe(identityHeights.mark);
  });

  it.each(['identity', 'lock'] as const)(
    '%s: centres the mark band on the middle of the surface',
    (variant) => {
      // The owner's rule for the two doors (2026-08-18): the fish sits at the
      // middle of the SCREEN. The column is the full surface on the DOM, so
      // half its measured height is the screen's centre; the computed lead
      // drops the mark band's centre onto it, the stack fills the surface,
      // and the actions anchor at the bottom.
      const TALL = 1200; // roomy enough that the centring lead never clamps
      const spy = vi
        .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockReturnValue({ height: TALL } as DOMRect);
      try {
        render(<OnboardingLayout variant={variant} />);

        const grid = onboardingIdentityGridFull; // same cluster numbers on lock
        const lead = parseFloat(screen.getByTestId('onboarding-lead').style.height);
        expect(grid.chrome + lead + grid.mark / 2).toBe(TALL / 2);

        const stack = screen.getByTestId('onboarding-stack');
        expect(stack.style.height).toBe(`${TALL}px`);
        expect(stack.style.marginTop).toBe('0px');
      } finally {
        spy.mockRestore();
      }
    }
  );

  it('draws the mark from the vector at the grid’s size, never from a raster', () => {
    render(<OnboardingLayout variant="identity" />);
    const mark = screen.getByTestId('brand-mark');
    expect(mark.tagName.toLowerCase()).toBe('svg');
    expect(mark.getAttribute('width')).toBe(String(onboardingIdentityGridFull.markSize));
  });

  it('sinks the column and leaves the ground where it is', () => {
    // DESIGN.md §Motion, "The wait owns its passage, end to end": the water is
    // the ground and the ground never travels. So `background` is a sibling of
    // the travelling column, never a child of it — nesting it would sink the
    // water along with the form.
    render(<OnboardingLayout variant="lock" sunk background={<div data-testid="ground" />} />);

    const ground = screen.getByTestId('ground');
    const column = screen.getByTestId('onboarding-column');
    expect(column.contains(ground)).toBe(false);
    expect(getComputedStyle(column).animationName).not.toBe('none');
    expect(getComputedStyle(ground).animationName).toBeFalsy();
  });

  it('hides a reserved control from assistive tech rather than merely fading it', () => {
    // Reserving space for an absent element must not put it in the
    // accessibility tree, and it must be genuinely unfocusable.
    render(
      <ReservedSlot visible={false}>
        <button>Next</button>
      </ReservedSlot>
    );
    const wrapper = screen.getByText('Next').parentElement;
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper?.style.visibility).toBe('hidden');
  });
});
