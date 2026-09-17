/**
 * The sequential-sheets handshake: the contract between a bottom sheet and
 * the sheets it opens (`SheetParentContext`), and what `useSheetTurn` hands
 * each platform's `BottomSheetContainer`. Two sheets take turns, never
 * stack: the parent slides down first, then the child rises; closing the
 * child runs the inverse; a tap on the backdrop under the child closes both.
 */

export interface SheetParentHandle {
  /** The child is about to rise: slide down, keep the backdrop. */
  yieldToChild: () => void;
  /** The child has left: come back — or, if dismissed meanwhile, finish leaving. */
  releaseFromChild: () => void;
  /** The backdrop was tapped under the child: leave for good, nothing returns. */
  dismissWithChild: () => void;
}

export interface SheetTurnMotion {
  /** As a parent: slide down and keep the backdrop — the child is about to rise. */
  sink: () => void;
  /** As a parent: come back up — the child has left and this sheet is still wanted. */
  rise: () => void;
  /** As a parent dismissed under its child: already down, so fade the backdrop and finish leaving. */
  leave: () => void;
}

export interface SheetTurn {
  /** The enclosing rendered sheet's handle, or `null` at the top. */
  parent: SheetParentHandle | null;
  /** This sheet has yielded to a child: mounted, off-screen, backdrop up. */
  yielded: boolean;
  /** The same, readable from inside effects and animation callbacks. */
  isYielded: () => boolean;
  /** How long a child waits before rising: the parent's exit, or nothing at the top. */
  childEnterDelayMs: number;
  /** What this sheet provides to the sheets it opens. */
  parentHandle: SheetParentHandle;
  /** Ask the parent to yield; call from the open path. */
  holdParentTurn: () => void;
  /** Give the turn back, once; call from the close path. */
  releaseParentTurn: () => void;
}
