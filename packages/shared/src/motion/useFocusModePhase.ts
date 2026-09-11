/**
 * useFocusModePhase — the clock of Home's focus mode, shared by both twins.
 *
 * On a Powerup's sub-tab the balance block leaves and the sub-tab row rises
 * to where it stood. Three beats, in order, never overlapping (owner, on
 * device, 2026-09-11): the underline reaches the tab and stops
 * (`motionMs.drift`); the block sinks while the row holds its place
 * (`SINK_OUT_MS`); only then does the row travel up. Coming back the order
 * reverses: the row travels down first (`FLOAT_IN_MS`), then the block
 * floats in where the row left room.
 *
 *   shown ──drift──▶ sinking ──sink──▶ gone
 *   gone  ──drift──▶ returning ──float──▶ shown
 *
 * `shown`     the block is there; the row sits under it.
 * `sinking`   the block plays its exit in place; the row has not moved.
 * `gone`      no block; the row stands risen.
 * `returning` the block's room is back and empty; the row travels down.
 *
 * The hook only keeps time. The platform decides how each phase is drawn
 * and, through `commit`, how a phase change is applied — the DOM wraps the
 * two moves of the row in a view transition, mobile lets Reanimated's
 * layout transition carry it.
 */
import { useEffect, useState } from 'react';
import { motionMs } from '../theme/durations';
import { FLOAT_IN_MS, SINK_OUT_MS } from './sinkFloat';

export type FocusModePhase = 'shown' | 'sinking' | 'gone' | 'returning';

export interface UseFocusModePhaseOptions {
  /**
   * Applies a phase change. Defaults to applying it directly; a platform
   * may wrap the apply (e.g. in `document.startViewTransition`).
   */
  commit?: (next: FocusModePhase, apply: () => void) => void;
}

export function useFocusModePhase(
  wantsFocus: boolean,
  isReduceMotionEnabled: boolean,
  { commit }: UseFocusModePhaseOptions = {}
): FocusModePhase {
  const [phase, setPhase] = useState<FocusModePhase>(wantsFocus ? 'gone' : 'shown');

  useEffect(() => {
    const go = (next: FocusModePhase) => {
      const apply = () => setPhase(next);
      if (commit) commit(next, apply);
      else apply();
    };
    const after = (ms: number, next: FocusModePhase) => {
      const timer = setTimeout(() => go(next), ms);
      return () => clearTimeout(timer);
    };

    if (wantsFocus) {
      if (phase === 'gone') return undefined;
      if (isReduceMotionEnabled) return after(0, 'gone');
      if (phase === 'shown') return after(motionMs.drift, 'sinking');
      if (phase === 'sinking') return after(SINK_OUT_MS, 'gone');
      // A change of mind mid-return: sink from wherever the block is.
      return after(0, 'sinking');
    }

    if (phase === 'shown') return undefined;
    if (isReduceMotionEnabled) return after(0, 'shown');
    if (phase === 'gone') return after(motionMs.drift, 'returning');
    if (phase === 'returning') return after(FLOAT_IN_MS, 'shown');
    // A change of mind mid-sink: bring the room back.
    return after(0, 'returning');
  }, [wantsFocus, phase, isReduceMotionEnabled, commit]);

  return phase;
}
