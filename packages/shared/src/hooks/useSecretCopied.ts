/**
 * The seconds left before a secret copied through `createSecretClipboard` is
 * cleared: counting down from `markCopied` to the clipboard's own clear time,
 * then null. A copy button shows the countdown and holds still until it ends.
 *
 * @module hooks/useSecretCopied
 */
import { useCallback, useEffect, useState } from 'react';

import { SECRET_CLIPBOARD_CLEAR_MS } from '../utils/secret-clipboard';

const left = (copiedAt: number) =>
  Math.ceil((SECRET_CLIPBOARD_CLEAR_MS - (Date.now() - copiedAt)) / 1000);

export function useSecretCopied(): { secondsLeft: number | null; markCopied: () => void } {
  const [copiedAt, setCopiedAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (copiedAt === null) return;
    const tick = () => {
      const seconds = left(copiedAt);
      if (seconds > 0) {
        setSecondsLeft(seconds);
        return;
      }
      setSecondsLeft(null);
      setCopiedAt(null);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [copiedAt]);

  const markCopied = useCallback(() => setCopiedAt(Date.now()), []);
  return { secondsLeft, markCopied };
}
