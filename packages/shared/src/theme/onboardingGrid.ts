/**
 * The onboarding slot grid.
 *
 * Reserved heights, read by every platform, so the salmon mark, the title, the
 * description and the primary action land at the same Y across a flow instead
 * of each screen re-deriving its own spacing.
 *
 * ## Two variants, not one grid
 *
 * The first pass put all sixteen screens on a single table. That reading was
 * too literal (product owner, 2026-08-18): a screen that greets or
 * authenticates is not shaped like a screen that displays twelve words, and
 * forcing one grid over both left a small mark floating above an enormous
 * void. The invariant is **within a family**, not across every screen:
 *
 * | variant    | the hero            | screens                                                                |
 * | ---------- | ------------------- | ---------------------------------------------------------------------- |
 * | `identity` | the mark            | welcome, unlock and all its states, password, biometric opt-in, success |
 * | `content`  | what fills `body`   | seed warning, seed display, seed confirmation, seed entry, analytics consent, derived accounts |
 *
 * `identity` draws the mark large and high with at most one input under it.
 * `content` makes the mark subordinate and hands the middle of the screen to
 * the words, the list, or the copy. The seed family named by the product owner
 * is `content`'s founding member; the other content-led screens join it rather
 * than getting tables of their own, because a third table would differ from
 * this one only in numbers nobody could justify.
 *
 * ## What the two variants still share
 *
 * **`content` spends on `body` exactly what it saved on the mark.** So both
 * variants have the *same* `stack`, which means the chrome band, the primary
 * action, the secondary and the assist bands are at an identical Y on all
 * sixteen screens — the mark and the body are the only slots that move between
 * families, and they move because they were meant to.
 *
 * ## The rules that make it hold
 *
 * - A reserved height is the **union of what any screen in the variant needs**,
 *   never what the screen in front of you needs. A slot a screen does not use
 *   is left empty, never collapsed — otherwise arriving at the one screen that
 *   carries an extra element (the "What is a derivable?" helper on Success)
 *   shoves every control above it.
 * - `body` is reserved from the union like every other slot, so the stack has
 *   one fixed height — and that is what lets the stack be **centred** in the
 *   viewport instead of anchored to the top. Anchoring left the slack in one
 *   lump under the action; centring splits it above and below, and because the
 *   stack's height does not vary, every slot keeps a Y identical across the
 *   variant's screens.
 * - `body` is still the give. Title and description may grow past their
 *   reserved heights (long translations, OS font scaling) and `body` shrinks to
 *   pay for it; when the viewport cannot hold the stack at all, `body` takes
 *   the loss and scrolls internally. The action never moves.
 *
 * Slot order, top to bottom:
 *
 * | slot          | holds                                                        |
 * | ------------- | ------------------------------------------------------------ |
 * | `chrome`      | back affordance and step dots                                |
 * | `mark`        | the salmon mark                                              |
 * | `title`       | the screen title, two lines reserved for Spanish             |
 * | `description` | the one-line description, two lines reserved for Spanish      |
 * | `body`        | inputs, seed grid, account list. The only region that scrolls |
 * | `assist`      | the derivable helper, the terms line, error and throttle copy |
 * | `secondary`   | one secondary action                                          |
 * | `action`      | the primary action, bottom-most                               |
 *
 * `action` is the bottom-most control in the stack (product owner, 2026-08-18).
 * That pins its Y for free: nothing has to be reserved *below* it, so revealing
 * anything in `assist` or `secondary` cannot move it.
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

/**
 * Which family a screen belongs to.
 *
 * `identity` — the mark is the hero: welcome, unlock in every state, setting a
 * password, the biometric opt-in, and success. At most one thing to fill in.
 *
 * `content` — what is in `body` is the hero and the mark is subordinate: the
 * seed screens, the analytics consent copy, the derived-account list.
 */
export type OnboardingVariant = 'identity' | 'content';

/** One rendered line of the title, and of the description. */
const titleLine = Math.round(fontSize.headline * lineHeight.tight);
const descriptionLine = Math.round(fontSize.bodyLg * lineHeight.normal);

export interface OnboardingGrid {
  /** Which family this table belongs to. */
  readonly variant: OnboardingVariant;
  readonly chrome: number;
  /** Reserved band for the mark. Sized by `markSize`, not by the screen. */
  readonly mark: number;
  readonly title: number;
  readonly description: number;
  /**
   * Reserved at the tallest body the variant has to hold without scrolling:
   * two fields plus the strength meter on `identity`, the twelve-word grid on
   * `content`. Bodies taller than this scroll inside the slot.
   */
  readonly body: number;
  readonly assist: number;
  readonly secondary: number;
  readonly action: number;
  /** Drawn width of the mark. Its height follows `markAspectRatio`. */
  readonly markSize: number;
  /**
   * Sum of every reserved height, `body` included — the height of the whole
   * stack. What is left over is split above and below it, not dumped below the
   * action. Equal across both variants by construction.
   */
  readonly stack: number;
}

const build = (g: Omit<OnboardingGrid, 'stack'>): OnboardingGrid => ({
  ...g,
  stack:
    g.chrome + g.mark + g.title + g.description + g.body + g.assist + g.secondary + g.action,
});

/** True of every screen in the flow, in both variants and at both rungs. */
const shared = {
  chrome: componentSizes.headerHeight,
  title: 2 * titleLine + spacing.md,
  assist: componentSizes.buttonHeightSmall + spacing.lg,
  secondary: componentSizes.buttonHeight + spacing.lg,
  action: spacing.lg + componentSizes.buttonHeight + spacing['2xl'],
} as const;

/**
 * `identity` draws the mark substantially larger than the largest logo token.
 * It was reading as a badge in a lot of empty space, and on these screens the
 * mark *is* the screen — the front door, the moment of recognition.
 */
const identityMarkSize = componentSizes.logoSizeLarge + spacing['4xl'];
const identityMark = identityMarkSize + spacing['2xl'];

/** `content` keeps the mark, small, so the words own the middle of the screen. */
const contentMarkSize = componentSizes.logoSizeSmall;
const contentMark = contentMarkSize + spacing.lg;

/** Two fields and the strength meter beneath them — the password screen. */
const identityBody = 2 * componentSizes.inputHeight + componentSizes.buttonHeightSmall + 2 * spacing.lg;

/**
 * Exactly what `content` saved by shrinking the mark. Keeping the two stacks
 * equal is what holds the chrome, assist, secondary and action bands at one Y
 * across all sixteen screens while the mark and the body deliberately differ.
 */
const contentBody = identityBody + (identityMark - contentMark);

const variantConstants = {
  identity: { mark: identityMark, markSize: identityMarkSize, body: identityBody },
  content: { mark: contentMark, markSize: contentMarkSize, body: contentBody },
} as const;

const rung = (variant: OnboardingVariant, description: number): OnboardingGrid =>
  build({ variant, ...shared, ...variantConstants[variant], description });

/** Rung 0 — two reserved description lines. Tall phones, the extension side panel, the web app. */
export const onboardingIdentityGridFull = rung('identity', 2 * descriptionLine + spacing['2xl']);
export const onboardingContentGridFull = rung('content', 2 * descriptionLine + spacing['2xl']);

/**
 * Rung 1 — the compact grid, below `onboardingCompactHeight`.
 *
 * One reserved description line instead of two, and nothing else. The mark does
 * not shrink: it is the one thing that may not, since a mark that changes size
 * with the viewport changes size between two screens of the same flow on the
 * same device the moment anything else in the stack moves.
 */
export const onboardingIdentityGridCompact = rung('identity', descriptionLine + spacing['2xl']);
export const onboardingContentGridCompact = rung('content', descriptionLine + spacing['2xl']);

/** Available height at or below which the compact grid is used. */
export const onboardingCompactHeight = 800;

/**
 * Picks the table for a variant and an available height.
 *
 * There is no third "drop the mark" rung. What saves a short surface is the
 * stack filling the viewport and `body` scrolling inside it while every other
 * slot holds — which the layout does at every height, so the action is always
 * reachable and always at the same Y.
 *
 * @param variant - Which family the screen belongs to.
 * @param availableHeight - Layout height the grid has to fill, insets already
 *   removed. Pass `undefined` before first measurement; the full grid is the
 *   safe first paint because the compact grid only ever reserves less.
 */
export const resolveOnboardingGrid = (
  variant: OnboardingVariant,
  availableHeight?: number
): OnboardingGrid => {
  const compact = availableHeight !== undefined && availableHeight <= onboardingCompactHeight;
  if (variant === 'content') {
    return compact ? onboardingContentGridCompact : onboardingContentGridFull;
  }
  return compact ? onboardingIdentityGridCompact : onboardingIdentityGridFull;
};
