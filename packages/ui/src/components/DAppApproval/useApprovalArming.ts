import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

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

/** The handlers `ApproveArea` puts on the element around Approve. */
interface ApproveAreaHandlers {
  onPointerEnter: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => void;
  onKeyUpCapture: (event: KeyboardEvent<HTMLElement>) => void;
}

/** What `useApprovalArming` hands a view. */
export interface ApprovalArming {
  /** Whether Approve may take a click yet. */
  armed: boolean;
  /** For `ApproveArea`. */
  handlers: ApproveAreaHandlers;
  /** The id of the hint saying how to turn a waiting Approve on. */
  hintId: string;
}

const isActivationKey = (key: string) => key === 'Enter' || key === ' ' || key === 'Spacebar';

/**
 * Whether the approval window's Approve button may take a click yet.
 *
 * False until the window has been visible for `delayMs`; then either focus
 * moves to one of its controls with no pointer button down (Tab, a screen
 * reader; a click or the title's own focus does not count), or the pointer moves
 * inside the window and afterwards comes onto Approve. False again the moment
 * the window loses focus or is hidden, and armed afresh the same way when it
 * comes back — the same trick works on a window brought forward as on one just
 * opened. The delay alone is a wait a page can time ("click, pause, click
 * again"), and a pointer left resting where Approve appeared is where the
 * page's lure put it; a pointer the user brings onto Approve after that is not
 * something the page can predict. Reject never waits: refusing is always safe.
 * Keys pressed on Approve wait too (see `handlers`).
 */
export function useApprovalArming(delayMs: number = APPROVE_ARM_MS): ApprovalArming {
  const [armed, setArmed] = useState(false);
  // waiting → (delay) → ready → (pointer moved) → moved → (enters Approve) → armed
  const stage = useRef<'waiting' | 'ready' | 'moved'>('waiting');
  const hintId = useId();
  // A page can ask for keys pressed in a rhythm as it can for clicks: a key
  // press reaches Approve only once Approve has held the focus for `delayMs`,
  // and only a press that began after it got the focus (no auto-repeat).
  const focusedAt = useRef<number | null>(null);
  const pressBlocked = useRef(false);
  const handlers = useMemo<ApproveAreaHandlers>(
    () => ({
      onPointerEnter: () => {
        if (stage.current === 'moved') setArmed(true);
      },
      onFocus: () => {
        focusedAt.current = Date.now();
      },
      onBlur: () => {
        focusedAt.current = null;
      },
      onKeyDownCapture: (event) => {
        if (!isActivationKey(event.key)) return;
        const held = focusedAt.current === null ? 0 : Date.now() - focusedAt.current;
        pressBlocked.current = event.repeat || held < delayMs;
        if (pressBlocked.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      onKeyUpCapture: (event) => {
        if (!isActivationKey(event.key) || !pressBlocked.current) return;
        pressBlocked.current = false;
        event.preventDefault();
        event.stopPropagation();
      },
    }),
    [delayMs]
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // A window that opens under a still pointer gets a pointer event at that
    // spot; only a second position is a person moving it.
    let lastPoint: string | null = null;
    let pointerDown = false;
    const disarm = () => {
      clearTimeout(timer);
      stage.current = 'waiting';
      lastPoint = null;
      // The release of a press that left the window never arrives.
      pointerDown = false;
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
    // Only a control Tab can reach: the title takes focus from code when the
    // window opens (`tabIndex` -1), and that is nobody's choice. And never
    // while a pointer button is down: a click focuses the control it lands
    // on, and a page can lure a click onto a spot it can compute.
    const onPointerDown = () => {
      pointerDown = true;
    };
    const onPointerUp = () => {
      pointerDown = false;
    };
    const onFocusIn = (event: FocusEvent) => {
      if (stage.current === 'waiting' || pointerDown) return;
      if (event.target instanceof HTMLElement && event.target.tabIndex >= 0) setArmed(true);
    };
    const onVisibility = () => (document.visibilityState === 'visible' ? arm() : disarm());

    if (document.visibilityState === 'visible') arm();
    window.addEventListener('focus', arm);
    window.addEventListener('blur', disarm);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', arm);
      window.removeEventListener('blur', disarm);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [delayMs]);

  return { armed, handlers, hintId };
}
