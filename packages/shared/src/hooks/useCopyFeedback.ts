/**
 * useCopyFeedback — the "Copied" confirmation state, without the clipboard.
 *
 * The clipboard is platform territory (`expo-clipboard` on native,
 * `navigator.clipboard` in the DOM), so this hook deliberately does not copy
 * anything. The call site performs its own copy and then calls `trigger()`;
 * the hook owns only the transient state: `copied` turns true, holds for
 * `motionMs.feedbackHold`, and reverts. The hold is reading time, not travel,
 * so reduced motion must not shorten it (see `resolveMotionMs`).
 *
 * Same shape as the community `use-clipboard` / `useCopyToClipboard` hooks
 * (Mantine, usehooks-ts): a `copied` flag auto-reset by a timeout, plus
 * `reset()` — minus their clipboard call, which cannot live in a
 * runtime-agnostic package.
 *
 * For lists with several copy buttons (one per key/row), pass a key to
 * `trigger(key)` and compare against `copiedKey`; `copied` stays the
 * "anything is showing" flag.
 *
 * @module hooks/useCopyFeedback
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motionMs } from '../theme/durations';

export type CopyFeedbackKey = string | number;

export interface UseCopyFeedbackResult {
  /** True while the confirmation is showing. */
  copied: boolean;
  /** The key passed to `trigger`, for per-row feedback; `null` when idle. */
  copiedKey: CopyFeedbackKey | true | null;
  /** Show the confirmation (after the call site has done the actual copy). */
  trigger: (key?: CopyFeedbackKey) => void;
  /** Hide the confirmation immediately (e.g. when a sheet closes). */
  reset: () => void;
}

export function useCopyFeedback(): UseCopyFeedbackResult {
  const [copiedKey, setCopiedKey] = useState<CopyFeedbackKey | true | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingReset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearPendingReset();
    setCopiedKey(null);
  }, [clearPendingReset]);

  const trigger = useCallback(
    (key: CopyFeedbackKey | true = true) => {
      clearPendingReset();
      setCopiedKey(key);
      timeoutRef.current = setTimeout(() => {
        setCopiedKey(null);
        timeoutRef.current = null;
      }, motionMs.feedbackHold);
    },
    [clearPendingReset]
  );

  // Clear the pending reset on unmount.
  useEffect(() => clearPendingReset, [clearPendingReset]);

  return { copied: copiedKey !== null, copiedKey, trigger, reset };
}
