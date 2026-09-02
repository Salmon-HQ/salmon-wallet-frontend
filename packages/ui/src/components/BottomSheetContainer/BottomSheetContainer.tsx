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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  borderRadius,
  borderWidth,
  componentSizes,
  motionEasing,
  motionMs,
  shadowsCSS,
  spacing,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion';
import { injectKeyframes } from '../../utils/injectKeyframes';
import { Thermocline } from '../Thermocline';
import type { BottomSheetContainerProps } from './types';

/** The drag handle, redrawn identically to mobile: 44×5, decorative on the DOM. */
const HANDLE_WIDTH = 44;
const HANDLE_HEIGHT = 5;

/** How long the sheet takes to leave — the mobile twin's `SHEET_EXIT_MS`. */
export const SHEET_EXIT_MS = motionMs.ebb;

/** Slack before the watchdog decides the exit's transitionend is not coming. */
const EXIT_WATCHDOG_GRACE_MS = 120;

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
  style,
  className,
  testID,
}: BottomSheetContainerProps) {
  const t = useSemantic();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isRendered, setIsRendered] = useState(visible);
  const [isOpen, setIsOpen] = useState(false);
  const isReduceMotionEnabled = useReducedMotion();
  const closedReportedRef = useRef(false);

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
    if (closedReportedRef.current) return;
    closedReportedRef.current = true;
    onClosed?.();
  }, [onClosed]);

  // Open / close the native dialog and flip the transform in on the next
  // frame, so the browser paints the closed position before transitioning to
  // open — the same "start off-screen, then animate in" mobile does with
  // `translateY(SCREEN_HEIGHT)` as the shared value's initial value.
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      }
      const raf = requestAnimationFrame(() => setIsOpen(true));
      return () => cancelAnimationFrame(raf);
    }

    if (isRendered) {
      setIsOpen(false);
      const exitMs = isReduceMotionEnabled ? 0 : SHEET_EXIT_MS;
      const watchdog = setTimeout(completeClose, exitMs + EXIT_WATCHDOG_GRACE_MS);
      return () => clearTimeout(watchdog);
    }

    return undefined;
  }, [visible, isRendered, isReduceMotionEnabled, completeClose]);

  const handleBackdropClick = useCallback(() => {
    if (!dismissible) return;
    onClose();
  }, [dismissible, onClose]);

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
      if (event.propertyName === 'transform' && !isOpen) completeClose();
    },
    [isOpen, completeClose]
  );

  if (!isRendered) return null;

  const transitionMs = isReduceMotionEnabled ? 0 : isOpen ? motionMs.rise : SHEET_EXIT_MS;
  const easing = isOpen ? motionEasing.current.css : motionEasing.sink.css;

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
    opacity: isOpen ? 1 : 0,
    transition: `opacity ${transitionMs}ms ${easing}`,
  };

  const sheetContainer: React.CSSProperties = {
    position: 'relative',
    boxSizing: 'border-box',
    borderTopLeftRadius: borderRadius.header,
    borderTopRightRadius: borderRadius.header,
    borderTopWidth: borderWidth.sheet,
    borderTopStyle: 'solid',
    borderTopColor: t.border.default,
    maxHeight: '92%',
    boxShadow: shadowsCSS.lg,
    overflow: 'hidden',
    transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
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
      <div style={backdrop} onClick={handleBackdropClick} />
      <div style={sheetContainer} onTransitionEnd={handleSheetTransitionEnd}>
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

        <div style={{ position: 'relative', overflow: 'auto' }}>{children}</div>
      </div>
    </dialog>
  );
}
