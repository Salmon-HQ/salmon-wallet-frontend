/**
 * BottomSheetContainer — shared infrastructure for every bottom sheet, on
 * the DOM.
 *
 * The mobile twin is
 * `apps/mobile/src/components/BottomSheetContainer/BottomSheetContainer.tsx`;
 * same anatomy (backdrop, drag-handle bar, header slot, thermocline ground)
 * and the same `BottomSheetContainerPropsBase` contract. What differs is how
 * the sheet enters, leaves and dismisses, per spec 028's DOM-alternative
 * table:
 *
 * - Built on the native `<dialog>` element (`showModal()` / `close()`) — the
 *   top layer, the focus trap and Escape all come from the platform instead
 *   of being redrawn.
 * - Dismissal is Escape (the dialog's native `cancel` event, intercepted so
 *   the exit can animate first) and a backdrop click. No drag, no swipe — the
 *   grip bar is still drawn at 44×5 for the same reason mobile draws it
 *   (a handle, not a rule), but it carries no gesture here.
 * - Enter/exit is a CSS transition on `transform`/`opacity` driven by
 *   `motionMs.rise` / `SHEET_EXIT_MS` (`motionMs.ebb`) and
 *   `motionEasing.current` / `motionEasing.sink` — the same numbers mobile's
 *   Reanimated timing uses, collapsed to an instant cut under
 *   `useReducedMotion()`. `sinkAndFloat`'s verb is tuned for content
 *   depth (scale + a small travel); a full-height sheet slide is the CSS
 *   alternative the brief calls out instead.
 * - `showFadeGradient` / `scrollOffsetValue` / `fadeGradientTop` /
 *   `dragAreaStyle` are RN-only (an `Animated.Value` and a pan gesture) and
 *   have no DOM consumer yet — not mirrored here; see the component report.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  borderRadius,
  borderWidth,
  componentSizes,
  motionEasing,
  motionMs,
  shadowsCSS,
  spacing,
  SheetHeightContext,
  SheetParentContext,
  useSheetParent,
  type SheetParentHandle,
  SHEET_EXIT_MS,
  SHEET_EXIT_WATCHDOG_GRACE_MS,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion';
import { injectKeyframes } from '../../utils/injectKeyframes';
import { Thermocline } from '../Thermocline';
import type { BottomSheetContainerProps } from './types';

/** The drag handle, redrawn identically to mobile: 44×5, decorative on the DOM. */
const HANDLE_WIDTH = 44;
const HANDLE_HEIGHT = 5;

export { SHEET_EXIT_MS };

/**
 * The browser's default `::backdrop` paints its own dim behind `<dialog>`.
 * The sheet draws its own backdrop div (mirroring mobile's
 * `TouchableWithoutFeedback` overlay) so the fade is driven by the same
 * `motionMs`/`motionEasing` tokens as the sheet itself — so the native one is
 * turned off, once, globally.
 */
injectKeyframes(
  'sw-sheet-backdrop-reset',
  'dialog.sw-sheet::backdrop { background: transparent; }'
);

export function BottomSheetContainer({
  visible,
  onClose,
  onClosed,
  children,
  title,
  headerContent,
  background,
  dismissible = true,
  contentGutter = true,
  maxHeight,
  height,
  style,
  className,
  testID,
}: BottomSheetContainerProps) {
  const t = useSemantic();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isRendered, setIsRendered] = useState(visible);

  // The ceiling a sheet opens with is the ceiling it keeps (owner,
  // 2026-09-16), the same rule as the mobile twin: the caller's `height` /
  // `maxHeight` are read once on the render that shows the sheet and
  // released once it has left, so nothing the page does underneath moves it.
  const [held, setHeld] = useState<{ height?: number; maxHeight?: number } | null>(null);
  if (visible && held === null) setHeld({ height, maxHeight });
  const sheetHeight = held ? held.height : height;
  const sheetMaxHeight = held ? held.maxHeight : maxHeight;
  const [isOpen, setIsOpen] = useState(false);
  // What this sheet is drawn at, for the sheets it opens: a nested sheet
  // reads it and rises to exactly this (`useParentSheetHeight`).
  const sheetRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  useEffect(() => {
    const node = sheetRef.current;
    if (!node) return undefined;
    setMeasuredHeight(node.offsetHeight);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => setMeasuredHeight(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
    // Re-armed when the sheet mounts; content changes reach it through the observer.
  }, [isRendered]);
  const isReduceMotionEnabled = useReducedMotion();
  const closedReportedRef = useRef(false);

  // Sequential, never stacked (see `SheetParentContext`, the mobile twin
  // has the same shape): with a parent sheet, this one rises only after the
  // parent has slid down, draws no backdrop of its own, and hands the parent
  // back when it leaves. As a parent, `yielded` keeps this sheet mounted,
  // off-screen, backdrop up, while its child is showing — even if it is
  // dismissed meanwhile.
  const parent = useSheetParent();
  const [yielded, setYielded] = useState(false);
  const yieldedRef = useRef(false);
  const childEnterDelayMs = parent && !isReduceMotionEnabled ? SHEET_EXIT_MS : 0;

  const resolvedBackground = background ?? (
    <Thermocline tier="thick" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }} />
  );

  // A fresh presentation may report `onClosed` again.
  useEffect(() => {
    if (visible) closedReportedRef.current = false;
  }, [visible]);

  const completeClose = useCallback(() => {
    const dialog = dialogRef.current;
    // jsdom (and any UA without full `<dialog>` support) has no `close()` —
    // same "the platform may not have this" guard `canAnimate` uses for WAAPI.
    if (dialog) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
    setIsRendered(false);
    setHeld(null);
    if (closedReportedRef.current) return;
    closedReportedRef.current = true;
    onClosed?.();
    parent?.releaseFromChild();
  }, [onClosed, parent]);

  // Open / close the native dialog and flip the transform in on the next
  // frame, so the browser paints the closed position before transitioning to
  // open — the same "start off-screen, then animate in" mobile does with
  // `translateY(SCREEN_HEIGHT)` as the shared value's initial value.
  //
  // `showModal()` takes the dialog out of `display: none`, and an element
  // that has never been rendered has no before-change style for a transition
  // to start from: if the open transform lands before the browser has
  // recalculated style once, the sheet appears in place with no rise (the
  // owner's Receive screenshot, 2026-09-02). Reading a layout property right
  // after `showModal()` forces that recalculation, so the closed position
  // exists before the frame that opens it.
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        void dialog.getBoundingClientRect();
      }
      parent?.yieldToChild();
      let raf = 0;
      const timer = setTimeout(() => {
        raf = requestAnimationFrame(() => {
          // The rise itself runs on the Web Animations API, not on the CSS
          // transition alone: a transition needs the browser to have seen
          // the closed position first, and inside the side panel React can
          // commit `isOpen` before that frame ever paints — the sheet was
          // simply there (owner, 2026-09-17). An animation has no such
          // dependency. The transition stays for yield / release / exit.
          const sheet = sheetRef.current;
          if (sheet && !isReduceMotionEnabled && typeof sheet.animate === 'function') {
            sheet.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], {
              duration: motionMs.rise,
              easing: motionEasing.current.css,
            });
          }
          setIsOpen(true);
        });
      }, childEnterDelayMs);
      return () => {
        clearTimeout(timer);
        cancelAnimationFrame(raf);
      };
    }

    if (isRendered) {
      // A yielded parent waits for its child to leave (`releaseFromChild`).
      if (yieldedRef.current) return undefined;
      setIsOpen(false);
      const exitMs = isReduceMotionEnabled ? 0 : SHEET_EXIT_MS;
      const watchdog = setTimeout(completeClose, exitMs + SHEET_EXIT_WATCHDOG_GRACE_MS);
      return () => clearTimeout(watchdog);
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isRendered, isReduceMotionEnabled, completeClose]);

  // The parent's side of the handshake, for the sheet this one opens.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const parentHandle = useMemo<SheetParentHandle>(
    () => ({
      yieldToChild: () => {
        yieldedRef.current = true;
        setYielded(true);
      },
      releaseFromChild: () => {
        yieldedRef.current = false;
        setYielded(false);
        // Dismissed while the child was up: the sheet is already down, so no
        // transform transition will end — the backdrop fades on its own clock.
        if (!visibleRef.current) {
          setIsOpen(false);
          setTimeout(completeClose, isReduceMotionEnabled ? 0 : SHEET_EXIT_MS);
        }
      },
      dismissWithChild: () => onClose(),
    }),
    [onClose, completeClose, isReduceMotionEnabled]
  );

  const handleBackdropClick = useCallback(() => {
    if (!dismissible) return;
    onClose();
    // Under a child the backdrop is the parent's: a click on it closes both.
    parent?.dismissWithChild();
  }, [dismissible, onClose, parent]);

  // The dialog's native `cancel` event fires on Escape and closes it
  // immediately by default — prevented so the exit can animate first, same
  // as `dismissible` gating mobile's hardware-back handler.
  const handleCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      if (dismissible) onClose();
    },
    [dismissible, onClose]
  );

  const handleSheetTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLDivElement>) => {
      if (event.propertyName === 'transform' && !isOpen && !yieldedRef.current) completeClose();
    },
    [isOpen, completeClose]
  );

  if (!isRendered) return null;

  const isUp = isOpen && !yielded;
  const transitionMs = isReduceMotionEnabled ? 0 : isUp ? motionMs.rise : SHEET_EXIT_MS;
  const easing = isUp ? motionEasing.current.css : motionEasing.sink.css;

  const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    margin: 0,
    padding: 0,
    border: 'none',
    background: 'transparent',
    width: '100vw',
    height: '100dvh',
    maxWidth: 'none',
    maxHeight: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  };

  const backdrop: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundColor: t.overlay.backdrop,
    // A child draws no backdrop: the parent's stays up through the handoff.
    opacity: isOpen && !parent ? 1 : 0,
    transition: `opacity ${transitionMs}ms ${easing}`,
  };

  const sheetContainer: React.CSSProperties = {
    position: 'relative',
    boxSizing: 'border-box',
    borderTopLeftRadius: borderRadius.header,
    borderTopRightRadius: borderRadius.header,
    // The edge follows the two top corners (see the mobile twin): stroke on
    // top and both sides, none at the bottom where the sheet meets the edge.
    border: `${borderWidth.sheet}px solid ${t.border.default}`,
    borderBottom: 'none',
    // A ceiling in pixels, when the caller measured one: Home's catalogue
    // stops just below the Send / Receive / Activity row instead of covering
    // it.
    maxHeight: sheetMaxHeight != null ? sheetMaxHeight : '92%',
    // A fixed height, when the caller measured one: Home's catalogue rises
    // exactly to the sub-tab row however little it has to show.
    ...(sheetHeight != null ? { height: sheetHeight } : null),
    boxShadow: shadowsCSS.lg,
    overflow: 'hidden',
    transform: isUp ? 'translateY(0)' : 'translateY(100%)',
    transition: `transform ${transitionMs}ms ${easing}`,
    ...style,
  };

  return (
    <dialog
      ref={dialogRef}
      className={['sw-sheet', className].filter(Boolean).join(' ')}
      style={overlay}
      onCancel={handleCancel}
      data-testid={testID}
    >
      <div
        style={backdrop}
        onClick={handleBackdropClick}
        data-testid={testID ? `${testID}-backdrop` : undefined}
      />
      <div
        ref={sheetRef}
        style={sheetContainer}
        onTransitionEnd={handleSheetTransitionEnd}
        aria-hidden={yielded || undefined}
        data-yielded={yielded || undefined}
      >
        <SheetHeightContext.Provider value={sheetHeight ?? measuredHeight}>
          <SheetParentContext.Provider value={parentHandle}>
            {resolvedBackground}

            <div style={{ position: 'relative' }}>
              {/* Drag handle bar — decorative on the DOM, no gesture attached. */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  paddingTop: spacing.md,
                  paddingBottom: spacing.sm,
                }}
              >
                <div
                  style={{
                    width: HANDLE_WIDTH,
                    height: HANDLE_HEIGHT,
                    borderRadius: borderRadius.full,
                    backgroundColor: t.sheet.handle,
                    opacity: componentSizes.sheetHandleOpacity,
                  }}
                />
              </div>

              {headerContent ?? title ?? null}
            </div>

            {/* The gutter every sheet shares, held once here rather than
            re-declared by each body: a sheet's content starts one screen
            gutter in from its edge, as mobile's sheet bodies each do with
            `spacing.screenGutter`. A body that must bleed to the edge opts
            out with `contentGutter={false}`. */}
            <div
              style={{
                position: 'relative',
                overflow: 'auto',
                paddingLeft: contentGutter ? spacing.screenGutter : 0,
                paddingRight: contentGutter ? spacing.screenGutter : 0,
              }}
            >
              {children}
            </div>
          </SheetParentContext.Provider>
        </SheetHeightContext.Provider>
      </div>
    </dialog>
  );
}
