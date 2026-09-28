/**
 * The sequential-sheets handshake, once, for both `BottomSheetContainer`s.
 *
 * Two sheets take turns, never stack (see `SheetParentContext`): a child asks
 * its parent to yield, rises once the parent has sunk, and gives the turn
 * back when it leaves — from its exit, or from its unmount if it goes
 * without one (the detail sheet drops its content the moment it closes, and
 * the explorer picker inside it went with it, leaving the parent yielded
 * with its backdrop up and its dialog modal over the whole app; owner,
 * 2026-09-17). What moving looks like is the platform's (`SheetTurnMotion`);
 * who holds the turn, and when it changes hands, is decided here.
 *
 * The handle a parent hands its children is one object for the sheet's
 * whole life: a child keys its open effect on it, and a handle rebuilt on
 * every parent render used to restart that effect — a new rise, a new
 * yield — in a loop.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SHEET_EXIT_MS } from '../theme/durations';
import type { SheetParentHandle, SheetTurn, SheetTurnMotion } from '../types/ui/sheet-turn';
import { useSheetParent } from './SheetHeightContext';

export type { SheetTurn, SheetTurnMotion };

export function useSheetTurn(
  visible: boolean,
  onClose: () => void,
  isReduceMotionEnabled: boolean,
  motion: SheetTurnMotion
): SheetTurn {
  const parent = useSheetParent();
  const [yielded, setYielded] = useState(false);
  const yieldedRef = useRef(false);
  // True from asking the parent to yield until giving its turn back.
  const holdsParentRef = useRef(false);
  const childEnterDelayMs = parent && !isReduceMotionEnabled ? SHEET_EXIT_MS : 0;

  // Read at call time by the stable handle and callbacks; refreshed before
  // any passive effect of the render runs.
  const latest = useRef({ visible, onClose, motion, parent });
  useLayoutEffect(() => {
    latest.current = { visible, onClose, motion, parent };
  });

  const parentHandle = useMemo<SheetParentHandle>(
    () => ({
      yieldToChild: () => {
        yieldedRef.current = true;
        setYielded(true);
        latest.current.motion.sink();
      },
      releaseFromChild: () => {
        yieldedRef.current = false;
        setYielded(false);
        if (latest.current.visible) latest.current.motion.rise();
        else latest.current.motion.leave();
      },
      dismissWithChild: () => latest.current.onClose(),
    }),
    []
  );

  const holdParentTurn = useCallback(() => {
    const current = latest.current.parent;
    current?.yieldToChild();
    holdsParentRef.current = current !== null;
  }, []);

  const releaseParentTurn = useCallback(() => {
    if (!holdsParentRef.current) return;
    holdsParentRef.current = false;
    latest.current.parent?.releaseFromChild();
  }, []);

  // Unmounted mid-turn: give it back on the way out.
  useEffect(() => releaseParentTurn, [releaseParentTurn]);

  const isYielded = useCallback(() => yieldedRef.current, []);

  return {
    parent,
    yielded,
    isYielded,
    childEnterDelayMs,
    parentHandle,
    holdParentTurn,
    releaseParentTurn,
  };
}
