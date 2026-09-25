import { useEffect, useState } from 'react';

/**
 * How long an approval window must have been in front of the user before its
 * Approve button takes a click.
 *
 * The window opens focused at a place any page can compute (beside the right
 * edge of the browser window), so a page can ask for a double click on that
 * spot, fire the request on the first click and let the second land on
 * Approve. Longer than the operating systems' default double-click interval
 * (~500 ms), short enough that a person reading the request never meets it.
 */
export const APPROVE_ARM_MS = 750;

/**
 * Whether the approval window's Approve button may take a click yet.
 *
 * False until the window has been visible for `delayMs`; false again the
 * moment it loses focus or is hidden, and armed afresh `delayMs` after it
 * comes back — the same trick works on a window brought forward as on one
 * just opened. Reject never waits: refusing is always safe.
 */
export function useApprovalArming(delayMs: number = APPROVE_ARM_MS): boolean {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setArmed(true), delayMs);
    };
    const disarm = () => {
      clearTimeout(timer);
      setArmed(false);
    };
    const onVisibility = () => (document.visibilityState === 'visible' ? arm() : disarm());

    if (document.visibilityState === 'visible') arm();
    window.addEventListener('focus', arm);
    window.addEventListener('blur', disarm);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', arm);
      window.removeEventListener('blur', disarm);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [delayMs]);

  return armed;
}
