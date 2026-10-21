import { useCallback, useEffect, useRef, useState } from 'react';

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

/** What `useApprovalArming` hands a view. */
export interface ApprovalArming {
  /** Whether Approve may take a click yet. */
  armed: boolean;
  /** Put on the element around Approve, as `onPointerEnter`. */
  onApproveEnter: () => void;
}

/**
 * Whether the approval window's Approve button may take a click yet.
 *
 * False until the window has been visible for `delayMs`; then either focus
 * moves to one of its controls (Tab, a screen reader), or the pointer moves
 * inside the window and afterwards comes onto Approve. False again the moment
 * the window loses focus or is hidden, and armed afresh the same way when it
 * comes back — the same trick works on a window brought forward as on one just
 * opened. The delay alone is a wait a page can time ("click, pause, click
 * again"), and a pointer left resting where Approve appeared is where the
 * page's lure put it; a pointer the user brings onto Approve after that is not
 * something the page can predict. Reject never waits: refusing is always safe.
 */
export function useApprovalArming(delayMs: number = APPROVE_ARM_MS): ApprovalArming {
  const [armed, setArmed] = useState(false);
  // waiting → (delay) → ready → (pointer moved) → moved → (enters Approve) → armed
  const stage = useRef<'waiting' | 'ready' | 'moved'>('waiting');
  const onApproveEnter = useCallback(() => {
    if (stage.current === 'moved') setArmed(true);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // A window that opens under a still pointer gets a pointer event at that
    // spot; only a second position is a person moving it.
    let lastPoint: string | null = null;
    const disarm = () => {
      clearTimeout(timer);
      stage.current = 'waiting';
      lastPoint = null;
      setArmed(false);
    };
    const arm = () => {
      disarm();
      timer = setTimeout(() => {
        stage.current = 'ready';
      }, delayMs);
    };
    const onPointerMove = (event: MouseEvent) => {
      if (stage.current === 'waiting') return;
      const point = `${event.screenX},${event.screenY}`;
      if (lastPoint !== null && point !== lastPoint) stage.current = 'moved';
      lastPoint = point;
    };
    const onFocusIn = () => {
      if (stage.current !== 'waiting') setArmed(true);
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

  return { armed, onApproveEnter };
}
