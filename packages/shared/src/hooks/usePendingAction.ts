import { useCallback, useState } from 'react';

export interface UsePendingActionResult<A extends unknown[]> {
  /** The arguments of the call in flight, or `null` when nothing is running. */
  pending: A | null;
  /** Runs the action and holds `pending` until it settles, failed or not. */
  run: (...args: A) => Promise<void>;
}

/**
 * Tracks one async action while it is in flight — a pull-to-refresh, a row's
 * revoke — so the component can show which call is busy. The rejection still
 * reaches the caller; only the flag is cleared here.
 */
export function usePendingAction<A extends unknown[]>(
  action: (...args: A) => Promise<unknown> | void
): UsePendingActionResult<A> {
  const [pending, setPending] = useState<A | null>(null);

  const run = useCallback(
    async (...args: A) => {
      setPending(args);
      try {
        await action(...args);
      } finally {
        setPending(null);
      }
    },
    [action]
  );

  return { pending, run };
}
