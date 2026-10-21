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
 * False until the window has been visible for `delayMs` AND, after that, the
 * pointer has moved inside it or focus has moved to one of its controls (Tab,
 * a screen reader). False again
 * the moment it loses focus or is hidden, and armed afresh the same way when
 * it comes back — the same trick works on a window brought forward as on one
 * just opened. The delay alone is a wait a page can time ("click, pause,
 * click again"); a pointer the user moves over the window after it appeared
 * is not something the page can predict. Reject never waits: refusing is
 * always safe.
 */
export function useApprovalArming(delayMs: number = APPROVE_ARM_MS): boolean {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let waited = false;
    // A window that opens under a still pointer gets a pointer event at that
    // spot; only a second position is a person moving it.
    let lastPoint: string | null = null;
    const disarm = () => {
      clearTimeout(timer);
      waited = false;
      lastPoint = null;
      setArmed(false);
    };
    const arm = () => {
      disarm();
      timer = setTimeout(() => (waited = true), delayMs);
    };
    const onPointerMove = (event: MouseEvent) => {
      if (!waited) return;
      const point = `${event.screenX},${event.screenY}`;
      if (lastPoint !== null && point !== lastPoint) setArmed(true);
      lastPoint = point;
    };
    const onFocusIn = () => {
      if (waited) setArmed(true);
    };
    const onVisibility = () => (document.visibilityState === 'visible' ? arm() : disarm());

    if (document.visibilityState === 'visible') arm();
    window.addEventListener('focus', arm);
    window.addEventListener('blur', disarm);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('focusin', onFocusIn);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', arm);
      window.removeEventListener('blur', disarm);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [delayMs]);

  return armed;
}
