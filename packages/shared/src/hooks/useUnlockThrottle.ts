/**
 * useUnlockThrottle — makes the unlock penalty visible while it runs.
 *
 * The penalty itself is enforced in `unlockAccounts`; this hook exists only so
 * the lock screen can say what is happening. A prompt that silently stops
 * accepting input reads as a broken app, and a user who thinks the app is
 * broken reinstalls it.
 */

import { useCallback, useEffect, useState } from 'react';

import { getUnlockPenalty, type UnlockPenalty } from '../utils/unlock-throttle';

const TICK_MS = 500;

const IDLE: UnlockPenalty = { failedAttempts: 0, remainingMs: 0 };

export interface UseUnlockThrottleResult extends UnlockPenalty {
  /** Whole seconds left, for display. */
  remainingSeconds: number;
  /** Re-read the penalty now — call it after a failed unlock. */
  refresh: () => void;
}

export function useUnlockThrottle(active: boolean = true): UseUnlockThrottleResult {
  const [penalty, setPenalty] = useState<UnlockPenalty>(IDLE);

  const refresh = useCallback(() => {
    void getUnlockPenalty().then(setPenalty);
  }, []);

  useEffect(() => {
    if (!active) {
      setPenalty(IDLE);
      return;
    }

    let cancelled = false;
    const read = async () => {
      const next = await getUnlockPenalty();
      if (!cancelled) setPenalty(next);
    };

    void read();
    const timer = setInterval(read, TICK_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active]);

  return {
    ...penalty,
    remainingSeconds: Math.ceil(penalty.remainingMs / 1000),
    refresh,
  };
}
