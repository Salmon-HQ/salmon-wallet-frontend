/**
 * useWaitPassage — the loading-screen passage, in one hook.
 *
 * Every surface that hands its screen to the canonical wait speaks the same
 * three-part gesture: the outgoing content **sinks** (`exiting`), the wait
 * arrives **one beat later** (its entering delay is intrinsic to
 * `LoadingScreen` now), and whatever follows the wait floats in on
 * `entering` — the sink-and-float verb with the standard beat, so a step that
 * replaces the wait's caller never overlaps what sank to make room for it.
 *
 * `held`/`onExited` are `useWaitExit`'s contract, re-exported so a call site
 * needs exactly one hook: keep the wait rendered (with `visible={false}`,
 * which starts its exit) until it reports its closing wave has left.
 *
 * Reduce motion: `exiting`/`entering` are `undefined` — an instant cut, the
 * same answer the primitives give.
 */
import { useWaitExit, type WaitExit } from '@salmon/shared';
import { useReducedMotion, type EntryExitAnimationFunction } from 'react-native-reanimated';

import { FLOAT_DELAY_MS, floatEntering, sinkExiting } from './sinkAndFloat';

export interface WaitPassage extends WaitExit {
  /** For the content that gives way to the wait: the sink. */
  exiting: EntryExitAnimationFunction | undefined;
  /** For the content that follows a sink: the float, one beat behind it. */
  entering: EntryExitAnimationFunction | undefined;
}

/** @param showWait Whether the wait wants to be visible — see `useWaitExit`. */
export function useWaitPassage(showWait: boolean): WaitPassage {
  const isReduceMotionEnabled = useReducedMotion();
  const { held, onExited } = useWaitExit(showWait);
  return {
    held,
    onExited,
    exiting: sinkExiting(isReduceMotionEnabled),
    entering: floatEntering(isReduceMotionEnabled, { delayMs: FLOAT_DELAY_MS }),
  };
}
