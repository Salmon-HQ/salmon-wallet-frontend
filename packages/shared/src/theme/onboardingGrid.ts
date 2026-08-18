/**
 * The onboarding slot grid.
 *
 * One set of reserved heights, read by every platform, so the salmon mark, the
 * title, the description and the primary action land at the same Y on every
 * screen of the create, recover and unlock flows.
 *
 * The rule that makes it work: **a reserved height is the union of what any
 * screen in the flow needs**, not what the screen in front of you needs. A slot
 * a screen does not use is left empty, never collapsed — otherwise arriving at
 * the one screen that carries an extra element (the "What is a derivable?"
 * helper on Success) shoves every control above it, which is exactly the defect
 * this grid exists to remove.
 *
 * Slot order, top to bottom:
 *
 * | slot          | holds                                                        |
 * | ------------- | ------------------------------------------------------------ |
 * | `chrome`      | back affordance and step dots                                |
 * | `mark`        | the salmon mark                                              |
 * | `title`       | the screen title, two lines reserved for Spanish             |
 * | `description` | the one-line description, two lines reserved for Spanish      |
 * | `body`        | **flexible** — inputs, seed grid, account list. Scrolls.      |
 * | `assist`      | the derivable helper, the terms line, error and throttle copy |
 * | `secondary`   | one secondary action                                          |
 * | `action`      | the primary action, bottom-pinned                             |
 *
 * `action` is the bottom-most control in the stack (product owner, 2026-08-18).
 * That pins its Y for free: nothing has to be reserved *below* it, so revealing
 * anything in `assist` or `secondary` cannot move it.
 *
 * `body` is the give in the system. Title and description may grow past their
 * reserved heights (long translations, OS font scaling); `body` shrinks to pay
 * for it, and scrolls internally once it reaches zero. The action never moves.
 */

import { componentSizes, spacing } from './spacing';
import { fontSize, lineHeight } from './typography';

/** Slot names, in draw order. */
export const onboardingSlots = [
  'chrome',
  'mark',
  'title',
  'description',
  'body',
  'assist',
  'secondary',
  'action',
] as const;

export type OnboardingSlot = (typeof onboardingSlots)[number];

/** Slots with a reserved height. `body` is the one flexible slot. */
export type ReservedSlot = Exclude<OnboardingSlot, 'body'>;

/** One rendered line of the title, and of the description. */
const titleLine = Math.round(fontSize.headline * lineHeight.tight);
const descriptionLine = Math.round(fontSize.bodyLg * lineHeight.normal);

/**
 * The reserved heights, and the two mark sizes.
 *
 * `markBox` is the reserved drawing box; `markSize` is what every screen
 * *except* unlock draws inside it. Unlock keeps the larger mark — it is the
 * app's front door and the mark is the point there — so the band is sized by
 * unlock and the smaller marks centre inside it. That is what stops the mark
 * moving between the unlock screen and everything that follows it.
 */
export interface OnboardingGrid {
  readonly chrome: number;
  readonly mark: number;
  readonly title: number;
  readonly description: number;
  readonly assist: number;
  readonly secondary: number;
  readonly action: number;
  /** Reserved mark box — the size unlock draws at. */
  readonly markBox: number;
  /** Mark size on every screen other than unlock. */
  readonly markSize: number;
  /** Sum of every reserved height. What is left over is `body`. */
  readonly fixedTotal: number;
}

const build = (g: Omit<OnboardingGrid, 'fixedTotal'>): OnboardingGrid => ({
  ...g,
  fixedTotal: g.chrome + g.mark + g.title + g.description + g.assist + g.secondary + g.action,
});

/** Shared by both rungs — only the mark and the description change. */
const constant = {
  chrome: componentSizes.headerHeight,
  title: 2 * titleLine + spacing.md,
  assist: componentSizes.buttonHeightSmall + spacing.lg,
  secondary: componentSizes.buttonHeight + spacing.lg,
  action: spacing.lg + componentSizes.buttonHeight + spacing['2xl'],
} as const;

/** Rung 0 — the full grid. Tall phones, the extension side panel, the web app. */
export const onboardingGridFull: OnboardingGrid = build({
  ...constant,
  markBox: componentSizes.logoSizeMedium,
  markSize: componentSizes.logoSizeSmall,
  mark: componentSizes.logoSizeMedium + spacing['2xl'],
  description: 2 * descriptionLine + spacing['2xl'],
});

/**
 * Rung 1 — the compact grid, below `onboardingCompactHeight`.
 *
 * The description drops to one reserved line and the mark box drops to the
 * canonical 80. This is the *normal* phone case, not an exception: a 844pt
 * frame less its insets is 751, and the compact grid is what leaves `body`
 * enough room for the three-input confirmation step.
 */
export const onboardingGridCompact: OnboardingGrid = build({
  ...constant,
  markBox: componentSizes.logoSizeSmall,
  markSize: componentSizes.logoSizeSmall,
  mark: componentSizes.logoSizeSmall + spacing['2xl'],
  description: descriptionLine + spacing['2xl'],
});

/** Available height at or below which the compact grid is used. */
export const onboardingCompactHeight = 800;

/**
 * Picks the grid for an available height.
 *
 * There is no third "drop the mark" rung. The spec proposed one for the Chrome
 * action popup's 600px ceiling, and the product owner then settled that the
 * extension is a side panel and the popup is a degraded first-click state, not
 * a target surface. What saves a short surface is `body` scrolling internally
 * while the slots above and below it stay pinned — which the layout does at
 * every height, so the action is always reachable and always at the same Y.
 *
 * @param availableHeight - Layout height the grid has to fill, insets already
 *   removed. Pass `undefined` before first measurement; the full grid is the
 *   safe first paint because the compact grid only ever reserves less.
 */
export const resolveOnboardingGrid = (availableHeight?: number): OnboardingGrid =>
  availableHeight !== undefined && availableHeight <= onboardingCompactHeight
    ? onboardingGridCompact
    : onboardingGridFull;
