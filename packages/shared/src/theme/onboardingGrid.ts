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
 * | `identity` | the mark            | welcome, biometric opt-in, success                                     |
 * | `credential` | the mark, over a secret | password (create flow)                                           |
 * | `lock`     | the mark, over a secret | unlock in every state                                            |
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
 * `identity` — the mark is the hero and there is nothing to fill in: welcome,
 * success, the biometric opt-in. `body` stays reserved and mostly empty.
 *
 * `credential` — the mark is still the hero, but the screen asks for a secret:
 * setting a password in the create flow. `body` holds the fields.
 *
 * `lock` — the unlock screen in every state. Same cluster as `credential`,
 * with one divergence the owner signed off on (2026-08-18): its `description`
 * band is always empty, so it collapses and hands the height to `body` — see
 * `lockDescription`. The lock is the **identity reference**: the welcome mark
 * matches the lock's mark in size and Y by construction.
 *
 * `content` — what is in `body` is the hero and the mark is subordinate: the
 * seed screens, the analytics consent copy, the derived-account list.
 *
 * `identity` once carried a 92pt `lead` that dropped its mark below the
 * lock's. The owner reversed that (2026-08-18): the lock is the reference,
 * so `identity` now reserves the same `body` as `credential` — the emptiness
 * sits under the mark, where welcome's missing fields would be — and every
 * mark-led screen agrees on the mark's size and Y.
 */
export type OnboardingVariant = 'identity' | 'credential' | 'lock' | 'content';

/** One rendered line of the title, and of the description. */
const titleLine = Math.round(fontSize.headline * lineHeight.tight);
const descriptionLine = Math.round(fontSize.bodyLg * lineHeight.normal);

export interface OnboardingGrid {
  /** Which family this table belongs to. */
  readonly variant: OnboardingVariant;
  readonly chrome: number;
  /**
   * Reserved empty run between `chrome` and `mark`. Not a slot — nothing is
   * ever placed in it, and it has no `testID` content.
   *
   * Today it carries exactly one thing: `identityClusterLead`, the
   * owner-tunable start of the shared welcome/lock cluster. It is paid out of
   * `body`, so every stack stays the same height and the chrome, assist,
   * secondary and action bands do not move between families at all.
   */
  readonly lead: number;
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
    g.chrome +
    g.lead +
    g.mark +
    g.title +
    g.description +
    g.body +
    g.assist +
    g.secondary +
    g.action,
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
 * The mark-led families draw it substantially larger than the largest logo
 * token. It was reading as a badge in a lot of empty space, and on these
 * screens the mark *is* the screen — the front door, the moment of recognition.
 */
const heroMarkSize = componentSizes.logoSizeLarge + spacing['4xl'];
const heroMark = heroMarkSize + spacing['2xl'];

/** `content` keeps the mark, small, so the words own the middle of the screen. */
const contentMarkSize = componentSizes.logoSizeSmall;
const contentMark = contentMarkSize + spacing.lg;

/**
 * Two fields and the strength meter beneath them — the password screen, which
 * is the tallest body in the `credential` family and therefore its union.
 */
const credentialBody =
  2 * componentSizes.inputHeight + componentSizes.buttonHeightSmall + 2 * spacing.lg;

/**
 * Exactly what `content` saved by shrinking the mark. Keeping every stack
 * equal is what holds the chrome, assist, secondary and action bands at one Y
 * across all sixteen screens while the mark and the body deliberately differ
 * by family.
 */
const contentBody = credentialBody + (heroMark - contentMark);

/**
 * owner-tunable — where the identity cluster (fish → title → input) begins.
 *
 * Extra empty run between `chrome` and the mark on the lock and the welcome
 * screen, which share the cluster: tune one number here and both screens'
 * fish drop together, staying identical by construction. It is paid out of
 * `body`, so the stack height and the assist/secondary/action bands never
 * move while playing with it. Zero means the cluster starts where the create
 * flow's does — the mark band right under the chrome.
 */
export const identityClusterLead = 0;

/**
 * The lock's `description` band, collapsed.
 *
 * The band is always empty on the lock, and at full height it left 84pt
 * between "Welcome back" and the input while the fish sat one title line
 * (30pt) above the title. The title band already ends `spacing.md` below its
 * text, so reserving `titleLine − spacing.md` here makes title→input exactly
 * one title line too — the same air that separates fish→title. The freed
 * height goes to `body` (see `rung`), so the stack and every band below hold
 * their Y; the lock deliberately diverges from `credential` only between the
 * title and the input (owner decision, 2026-08-18).
 */
const lockDescription = titleLine - spacing.md;

/**
 * One cluster for the two screens the owner tunes as a pair — the welcome
 * mark and the lock mark share size, band and lead by this shared constant,
 * not by two numbers that happen to agree.
 */
const heroCluster = {
  mark: heroMark,
  markSize: heroMarkSize,
  body: credentialBody - identityClusterLead,
  lead: identityClusterLead,
} as const;

const variantConstants = {
  identity: heroCluster,
  credential: { mark: heroMark, markSize: heroMarkSize, body: credentialBody, lead: 0 },
  lock: heroCluster,
  content: { mark: contentMark, markSize: contentMarkSize, body: contentBody, lead: 0 },
} as const;

const rung = (variant: OnboardingVariant, description: number): OnboardingGrid => {
  const constants = variantConstants[variant];
  if (variant === 'lock') {
    // The collapsed description hands its height to `body`, per rung, so the
    // lock's stack stays equal to its siblings' and no control band moves.
    return build({
      variant,
      ...shared,
      ...constants,
      description: lockDescription,
      body: constants.body + (description - lockDescription),
    });
  }
  return build({ variant, ...shared, ...constants, description });
};

/** Rung 0 — two reserved description lines. Tall phones, the extension side panel, the web app. */
const fullDescription = 2 * descriptionLine + spacing['2xl'];
export const onboardingIdentityGridFull = rung('identity', fullDescription);
export const onboardingCredentialGridFull = rung('credential', fullDescription);
export const onboardingLockGridFull = rung('lock', fullDescription);
export const onboardingContentGridFull = rung('content', fullDescription);

/**
 * Rung 1 — the compact grid, below `onboardingCompactHeight`.
 *
 * One reserved description line instead of two, and nothing else. The mark does
 * not shrink: it is the one thing that may not, since a mark that changes size
 * with the viewport changes size between two screens of the same flow on the
 * same device the moment anything else in the stack moves.
 */
const compactDescription = descriptionLine + spacing['2xl'];
export const onboardingIdentityGridCompact = rung('identity', compactDescription);
export const onboardingCredentialGridCompact = rung('credential', compactDescription);
export const onboardingLockGridCompact = rung('lock', compactDescription);
export const onboardingContentGridCompact = rung('content', compactDescription);

/**
 * Available height at or below which the compact grid is used.
 *
 * **This boundary is deliberately nowhere near a real phone.** It sat at 800
 * once, and two current flagships straddled it: a Pixel 9 Pro measures 876dp of
 * layout height and an iPhone 17 about 781pt once the Dynamic Island and the
 * home indicator are removed. One took the full rung and the other the compact
 * one, on the same screen, from the same bundle — and a boundary that two
 * shipping devices sit either side of will be found by a user, not by us.
 *
 * 640 is below every phone in use with a meaningful margin, so the rung is
 * chosen by genuinely small surfaces rather than by which handset you happen to
 * be holding. Everything above it takes the full grid and lets `body` shrink,
 * and then scroll, which is a gradual give rather than a step.
 *
 * The rung is also the *only* thing that differs between the two tables — one
 * reserved description line instead of two — and the test asserts that. A rung
 * may tighten a band; it may never remove an element, or a user loses a line of
 * copy for two points of height.
 */
export const onboardingCompactHeight = 640;

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
  switch (variant) {
    case 'content':
      return compact ? onboardingContentGridCompact : onboardingContentGridFull;
    case 'credential':
      return compact ? onboardingCredentialGridCompact : onboardingCredentialGridFull;
    case 'lock':
      return compact ? onboardingLockGridCompact : onboardingLockGridFull;
    default:
      return compact ? onboardingIdentityGridCompact : onboardingIdentityGridFull;
  }
};
