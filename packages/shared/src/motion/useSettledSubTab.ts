/**
 * The sub-tab whose content Home may show — the one whose tab has come to
 * rest (owner, 2026-09-16: "el contenido carga una vez que la tab está en su
 * lugar").
 *
 * A tap moves the row before the content: within a mode, the underline
 * slides to the tab (`drift`) while the outgoing content sinks; across a
 * mode — Portfolio or NFTs to a Powerup, or back — the focus-mode clock runs
 * its beats and then the row itself travels (`SINK_OUT_MS` up, `FLOAT_IN_MS`
 * down). Only once that last move has ended does the target become the
 * settled tab, and only the settled tab's content is drawn. Until then Home
 * draws nothing in the region, so the outgoing content leaves at the tap and
 * the incoming one floats into a row that has stopped.
 *
 * The clock is `useFocusModePhase`'s: this hook reads its resting phase for
 * the target and adds the travel that starts when the phase lands. Reduce
 * motion: the target settles at once.
 */
import { useEffect, useState } from 'react';
import { motionMs } from '../theme/durations';
import { FLOAT_DELAY_MS, FLOAT_IN_MS, SINK_OUT_MS } from './sinkFloat';
import type { FocusModePhase } from './useFocusModePhase';

export interface UseSettledSubTabOptions<K extends string> {
  /** The tab the user chose (`effectiveSubTab`). */
  target: K;
  /** Whether a tab puts Home in focus mode — a Powerup's does. Keep it stable. */
  isFocusTab: (key: K) => boolean;
  /** The focus-mode clock, driven by the target. */
  focusPhase: FocusModePhase;
  isReduceMotionEnabled: boolean;
}

/** Within a mode: the underline's slide, or the sink-then-beat, whichever is longer. */
export const SUB_TAB_SETTLE_MS = Math.max(motionMs.drift, FLOAT_DELAY_MS);

export function useSettledSubTab<K extends string>({
  target,
  isFocusTab,
  focusPhase,
  isReduceMotionEnabled,
}: UseSettledSubTabOptions<K>): K {
  const [settled, setSettled] = useState(target);

  useEffect(() => {
    if (settled === target) return undefined;
    if (isReduceMotionEnabled) {
      setSettled(target);
      return undefined;
    }
    const wantsFocus = isFocusTab(target);
    // The clock is still running: this effect runs again when it lands.
    if (focusPhase !== (wantsFocus ? 'gone' : 'shown')) return undefined;
    const modeChanged = isFocusTab(settled) !== wantsFocus;
    const travelMs = modeChanged ? (wantsFocus ? SINK_OUT_MS : FLOAT_IN_MS) : SUB_TAB_SETTLE_MS;
    const timer = setTimeout(() => setSettled(target), travelMs);
    return () => clearTimeout(timer);
  }, [target, settled, focusPhase, isReduceMotionEnabled, isFocusTab]);

  return settled;
}
