/**
 * Motion tokens for Salmon Wallet — the "Current" vocabulary.
 *
 * Water has mass: nothing snaps and nothing bounces like rubber, things
 * displace and settle. Every token below is named for the *job* it does, not
 * for its number, because a number cannot be chosen correctly — `slower` gave
 * no way to know whether a sheet or a toast belonged in it, which is how the
 * repo ended up with copy confirmation at 1500ms in two files and 2000ms in a
 * third.
 *
 * Works for React Native (Expo), web, and the WXT extension. Where a value has
 * two platform expressions it ships both on one object, the way `tabularNums`
 * does in `typography.ts` — one decision, two expressions, so the platforms
 * cannot drift apart.
 */

/**
 * Duration vocabulary, in milliseconds. Pass to `setTimeout`, Reanimated
 * `withTiming`, and any JS animation API.
 *
 * **Exit is faster than enter** (`ebb` 180 against `drift` 280). An entrance
 * introduces content the user has not read yet, so it has to be slow enough to
 * be followed. An exit removes content the user has already finished with —
 * every millisecond of it is latency between a decision and its result, so it
 * only has to be long enough not to read as a glitch.
 */
export const motionMs = {
  /**
   * 90ms — micro-feedback. Press down, release, specular highlight. Short
   * enough to feel like a physical consequence of the finger rather than an
   * animation the finger triggered.
   */
  flick: 90,
  /**
   * 180ms — state change in place. Hover, focus, color, border, selection,
   * toast in. Nothing moves through space, so there is no travel to read.
   */
  swell: 180,
  /**
   * 180ms — element exit. Dismiss, collapse-away, toast out. Deliberately the
   * same 180ms as `swell` and shorter than `drift`; see the note above.
   */
  ebb: 180,
  /**
   * 280ms — element enter and in-place layout change. Expand/collapse, list
   * enter (8px rise + fade, 24ms stagger, six items maximum), list reorder,
   * tab change.
   */
  drift: 280,
  /**
   * 200ms — the entering half of a fade-through content swap (Material
   * Design's "fade through": top-level content is replaced under a frame that
   * stays put — the incoming view fades in and settles from `scale(0.97)`
   * while the outgoing one drops away in a `flick`). Shorter than `drift`
   * because nothing travels: the frame, the header and the selector all hold
   * still, so all the eye has to read is an arrival. Home's per-chain
   * content (token list ↔ Bitcoin view) is the canonical user.
   */
  contentSwap: 200,
  /**
   * 420ms — sheet presentation. translateY 100%→0 with the backdrop blur and
   * scrim moving over the same window, so the sheet and the water above it are
   * one gesture instead of two.
   */
  rise: 420,
  /**
   * 420ms — route transition. Same window as `rise` on purpose: a pushed route
   * and a presented sheet are the same event to the user (new surface arrives,
   * old one recedes to `scale(0.97)`), and giving them different lengths only
   * makes the app feel inconsistent about its own depth.
   */
  route: 420,
  /**
   * 720ms — The Surfacing. The signature moment, and the only thing in the app
   * allowed to take this long: the confirmation of a completed send or swap.
   * Never reuse it for ordinary success states.
   */
  tide: 720,

  /**
   * 1500ms — how long a transient confirmation stays on screen before it
   * clears itself. This is a *hold*, not a transition: it is the reading time
   * for "Copied", not a duration to animate over, so reduced motion must not
   * shorten it (see `resolveMotionMs`). One value, because copy confirmation
   * previously ran at 1500ms in `AddressCopyRow` and `DAppSignInApprovalView`
   * and 2000ms in `useCopyFeedback`, `TokenInfo`, `StepConfirmation`,
   * `PrivateKeyPanel` and `BackupPanel` for no reason anyone could name.
   * 1500ms is above the ~1.2s it takes to notice and read a two-word chip, and
   * below the point where a stale chip starts to look stuck.
   */
  feedbackHold: 1500,
  /** 500ms — input debounce before firing a search or a quote request. */
  debounce: 500,
  /** 24ms — per-item delay in a staggered list enter. Six items maximum. */
  stagger: 24,

  /**
   * 400ms — how long a wait must last before a waiting *screen* is allowed to
   * mount at all. Below this the operation still feels instantaneous (the
   * Doherty threshold), and a loader that appears and leaves inside it reads as
   * a flicker rather than as information. This is a *gate*, not a transition:
   * reduced motion must not collapse it.
   */
  waitDelay: 400,
  /**
   * 600ms — once a waiting screen has mounted, the shortest time it may stay.
   * `waitDelay` alone does not stop the flicker: a 410ms operation would show
   * the loader for 10ms. 400 + 600 lands on the 1s ceiling for "the user's
   * flow of thought stays uninterrupted". A *failure* is exempt — an error is
   * shown the moment it is known.
   */
  waitMinVisible: 600,

  /**
   * Continuous loops. These are cycle lengths, not transitions: they describe
   * how long one revolution takes, so they are never resolved to 0. Under
   * reduced motion the loop is not sped up, it is not started at all.
   */
  /** 1000ms — one revolution of a spinner. */
  spinCycle: 1000,
  /** 1400ms — one pass of the loading shimmer band across `state.hover`. */
  shimmerCycle: 1400,
  /** 1200ms — one breath of a pulsing placeholder. */
  pulseCycle: 1200,
} as const;

/**
 * The same vocabulary as CSS duration strings, for `transition`/`animation`
 * shorthands on web and in the extension. Derived from `motionMs` so the two
 * cannot disagree.
 */
export const motionDuration = {
  /** 90ms — micro-feedback (press, specular) */
  flick: `${motionMs.flick}ms`,
  /** 180ms — state change in place (hover, color, selection, toast in) */
  swell: `${motionMs.swell}ms`,
  /** 180ms — element exit (dismiss, toast out) */
  ebb: `${motionMs.ebb}ms`,
  /** 280ms — element enter, expand/collapse, tab change */
  drift: `${motionMs.drift}ms`,
  /** 200ms — the entering half of a fade-through content swap */
  contentSwap: `${motionMs.contentSwap}ms`,
  /** 420ms — sheet presentation */
  rise: `${motionMs.rise}ms`,
  /** 420ms — route transition */
  route: `${motionMs.route}ms`,
  /** 720ms — The Surfacing, and nothing else */
  tide: `${motionMs.tide}ms`,
} as const;

/**
 * Easing curves. Each ships as a CSS `cubic-bezier(...)` string for the DOM and
 * as the same four coefficients for React Native, where they go straight into
 * Reanimated's `Easing.bezier(...easing.current.native)`.
 *
 * There is no `linear` and no `ease-in-out` here. A symmetric curve reads as a
 * mechanism rather than as mass, and this system's whole claim is that things
 * displace and settle.
 */
export const motionEasing = {
  /**
   * Heavy exponential out — the default, and the right answer for anything
   * entering or changing state. Most of the distance is covered immediately,
   * so the element reads as *already arriving* rather than as starting to move.
   */
  current: {
    /** Web and extension — drop into a `transition` / `animation` shorthand. */
    css: 'cubic-bezier(0.32, 0.72, 0, 1)',
    /** React Native — `Easing.bezier(...motionEasing.current.native)`. */
    native: [0.32, 0.72, 0, 1],
  },
  /**
   * A longer tail than `current`, for a value coming to rest — the amount on a
   * confirmation, a balance landing after a refresh. Monotonic: it never passes
   * its target, so a number never appears to have been wrong for a frame.
   */
  settle: {
    /** Web and extension. */
    css: 'cubic-bezier(0.22, 1, 0.36, 1)',
    /** React Native. */
    native: [0.22, 1, 0.36, 1],
  },
  /**
   * Accelerating out — exits only. Pairs with `ebb`: the element leaves faster
   * than it arrived and is gone before the eye follows it out of frame.
   */
  sink: {
    /** Web and extension. */
    css: 'cubic-bezier(0.4, 0, 1, 1)',
    /** React Native. */
    native: [0.4, 0, 1, 1],
  },
  /**
   * ~4% overshoot, success confirmations only.
   *
   * This is the one curve in the system that passes its target, and it is kept
   * because a completed transaction is the single moment where the interface is
   * allowed to be pleased with itself. It replaces the old `bounce` at 1.56
   * (~56% overshoot), which is a rubber-ball curve: on a wallet it makes an
   * irreversible on-chain action look like a game reward. At 1.14 the overshoot
   * is felt and not seen.
   */
  swellIn: {
    /** Web and extension. */
    css: 'cubic-bezier(0.34, 1.14, 0.64, 1)',
    /** React Native. */
    native: [0.34, 1.14, 0.64, 1],
  },
} as const;

/**
 * Reduced motion — part of the contract, not a switch bolted on afterwards.
 *
 * The rule: **motion is dropped, state changes and feedback are preserved.** A
 * user with reduce-motion on must still see that something happened — the
 * sheet is still there, the chip still says "Copied", the amount still lands on
 * its final value, the haptic still fires. What disappears is the travel: a
 * translation becomes an opacity step, a stagger becomes simultaneous, a
 * backdrop goes straight to its final scrim, and continuous loops are not
 * started.
 *
 * Consumers read the platform signal themselves — this package stays
 * runtime-agnostic — and then resolve durations through `resolveMotionMs`:
 *
 * - **Web / extension:** `matchMedia(reducedMotion.query).matches`, or use
 *   `reducedMotion.css` inside `@media (prefers-reduced-motion: reduce)`.
 * - **React Native:** `AccessibilityInfo.isReduceMotionEnabled()` plus
 *   `AccessibilityInfo.addEventListener('reduceMotionChanged', …)`, then pass
 *   the boolean to `resolveMotionMs`.
 */
export const reducedMotion = {
  /** The media query, for `matchMedia` and for `@media` blocks. */
  query: '(prefers-reduced-motion: reduce)',
  /**
   * CSS substitute duration. `0.01ms` rather than `0s` because browsers do not
   * fire `transitionend` / `animationend` for a zero-length transition, and
   * code that waits on those events would hang.
   */
  css: '0.01ms',
  /**
   * React Native substitute duration. 0 is safe here: Animated and Reanimated
   * both invoke the completion callback for a zero-length timing.
   */
  ms: 0,
} as const;

/**
 * Resolve a **transition** duration for the current reduce-motion setting.
 *
 * Only pass travel — the durations in `motionDuration` / the `flick`…`tide`
 * ramp. Do not pass `feedbackHold` or `debounce`: those are reading and input
 * timings, and collapsing them would delete the feedback that reduced motion is
 * supposed to preserve. Do not pass a `*Cycle` value either: a zero-length loop
 * spins infinitely fast. Skip starting the loop instead.
 *
 * @param ms Transition duration from the vocabulary above.
 * @param isReduceMotionEnabled Platform signal — `matchMedia(reducedMotion.query).matches`
 *   on web, `AccessibilityInfo.isReduceMotionEnabled()` on React Native.
 */
export function resolveMotionMs(ms: number, isReduceMotionEnabled: boolean): number {
  return isReduceMotionEnabled ? reducedMotion.ms : ms;
}

/**
 * CSS-string counterpart of `resolveMotionMs`, for a `transition` shorthand
 * built in JS (MUI `sx`, styled objects). Same caveats: travel only.
 */
export function resolveMotionDuration(cssDuration: string, isReduceMotionEnabled: boolean): string {
  return isReduceMotionEnabled ? reducedMotion.css : cssDuration;
}

/**
 * Legacy CSS duration tokens, re-pointed at the vocabulary above.
 *
 * Every key still works and every value is still a valid CSS duration; they are
 * kept because three apps consume this file. Number-named keys say nothing
 * about what a duration is for, which is the problem the vocabulary fixes — use
 * the replacement named in each tag.
 *
 * @deprecated Use `motionDuration`.
 */
export const duration = {
  /** 90ms @deprecated use `motionDuration.flick` (was 100ms) */
  fastest: motionDuration.flick,
  /** 180ms @deprecated use `motionDuration.swell` (was 150ms) */
  fast: motionDuration.swell,
  /** 180ms @deprecated use `motionDuration.swell` (was 200ms) */
  normal: motionDuration.swell,
  /** 280ms @deprecated use `motionDuration.drift` (was 250ms) */
  medium: motionDuration.drift,
  /** 280ms @deprecated use `motionDuration.drift` (was 300ms) */
  slow: motionDuration.drift,
  /** 420ms @deprecated use `motionDuration.rise` (was 400ms) */
  slower: motionDuration.rise,
  /** 0ms @deprecated stagger is a per-item delay; use `motionMs.stagger` */
  stagger1: '0ms',
  /** 24ms @deprecated use `motionMs.stagger` (was 550ms) */
  stagger2: `${motionMs.stagger}ms`,
  /** 48ms @deprecated use `motionMs.stagger` × index (was 600ms) */
  stagger3: `${motionMs.stagger * 2}ms`,
} as const;

/**
 * Legacy numeric duration tokens, re-pointed at the vocabulary above.
 *
 * @deprecated Use `motionMs`.
 */
export const durationMs = {
  /** 180ms @deprecated use `motionMs.swell` (was 200) */
  normal: motionMs.swell,
  /** 280ms @deprecated use `motionMs.drift` (was 250) */
  medium: motionMs.drift,
  /** 280ms @deprecated use `motionMs.drift` (was 300) */
  slow: motionMs.drift,
  /** 420ms @deprecated use `motionMs.rise` (was 400) */
  slower: motionMs.rise,
  /** 500ms @deprecated use `motionMs.debounce` */
  debounce: motionMs.debounce,
  /** 1000ms @deprecated use `motionMs.spinCycle` */
  spin: motionMs.spinCycle,
  /** 1200ms @deprecated use `motionMs.pulseCycle` */
  pulse: motionMs.pulseCycle,
  /** 1500ms @deprecated use `motionMs.feedbackHold` */
  feedbackShort: motionMs.feedbackHold,
  /** 1400ms @deprecated use `motionMs.shimmerCycle` (was 1500) */
  shimmer: motionMs.shimmerCycle,
  /** 1500ms @deprecated one confirmation hold; use `motionMs.feedbackHold` (was 2000) */
  feedbackLong: motionMs.feedbackHold,
  /** 2000ms @deprecated use `motionMs.spinCycle`; a slow spinner is still a spinner */
  spinSlow: 2000,
} as const;

/**
 * Legacy flat easing strings, re-pointed at the "Current" curves. Values stay
 * CSS timing-function strings so existing `transition` shorthands keep parsing.
 *
 * @deprecated Use `motionEasing`, which also carries the React Native
 * coefficients.
 */
export const easing = {
  /** @deprecated use `motionEasing.current.css` (was the CSS `ease` keyword) */
  ease: motionEasing.current.css,
  /** @deprecated use `motionEasing.current.css` (was `ease-out`) */
  easeOut: motionEasing.current.css,
  /** @deprecated use `motionEasing.sink.css` (was `ease-in`) */
  easeIn: motionEasing.sink.css,
  /** @deprecated use `motionEasing.current.css` (was `ease-in-out`) */
  easeInOut: motionEasing.current.css,
  /** @deprecated use `motionEasing.current.css` (was the Material standard curve) */
  standard: motionEasing.current.css,
  /** @deprecated use `motionEasing.settle.css` */
  slide: motionEasing.settle.css,
  /** @deprecated use `motionEasing.swellIn.css` — overshoot cut 1.56 → 1.14 */
  bounce: motionEasing.swellIn.css,
} as const;

export type MotionMs = typeof motionMs;
export type MotionDuration = typeof motionDuration;
export type MotionEasing = typeof motionEasing;
export type ReducedMotion = typeof reducedMotion;

export type Duration = typeof duration;
export type DurationMs = typeof durationMs;
export type Easing = typeof easing;
