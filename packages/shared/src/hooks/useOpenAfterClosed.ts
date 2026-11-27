import { useCallback, useRef } from 'react';

/**
 * A sheet whose confirm leads to another sheet: confirming marks the way on,
 * and the next sheet opens once this one reports having left. Backing out
 * leaves the mark unset, so nothing follows.
 */
export function useOpenAfterClosed(openNext: () => void) {
  const advancing = useRef(false);
  const onConfirm = useCallback(() => {
    advancing.current = true;
  }, []);
  const onClosed = useCallback(() => {
    if (!advancing.current) return;
    advancing.current = false;
    openNext();
  }, [openNext]);
  return { onConfirm, onClosed };
}
