/**
 * Whether a secret copied through `createSecretClipboard` is still on the
 * clipboard: true from `markCopied` until the clipboard's own clear time,
 * so a label can say "copied, clears in 60 s" and then go back.
 *
 * @module hooks/useSecretCopied
 */
import { useCallback, useEffect, useState } from 'react';

import { SECRET_CLIPBOARD_CLEAR_MS } from '../utils/secret-clipboard';

export function useSecretCopied(): { copied: boolean; markCopied: () => void } {
  const [copiedAt, setCopiedAt] = useState<number | null>(null);

  useEffect(() => {
    if (copiedAt === null) return;
    const timer = setTimeout(() => setCopiedAt(null), SECRET_CLIPBOARD_CLEAR_MS);
    return () => clearTimeout(timer);
  }, [copiedAt]);

  const markCopied = useCallback(() => setCopiedAt(Date.now()), []);
  return { copied: copiedAt !== null, markCopied };
}
