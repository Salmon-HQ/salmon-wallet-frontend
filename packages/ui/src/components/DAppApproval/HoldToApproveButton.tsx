import React, { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { semantic } from '@salmon/shared';
import { PrimaryButton, SecondaryButton } from '../Button';

/** How long the control must be held before it commits. */
const HOLD_MS = 500;

const Wrapper = styled(Box)({
  position: 'relative',
  width: '100%',
  // The progress line is painted over the button's own fill, so the button must
  // not clip it away.
  isolation: 'isolate',
});

/**
 * The hold's progress, drawn along the bottom edge of the fill.
 *
 * `neutral-1000` rather than the salmon the design note names: the line sits on
 * a `salmon-500` fill, where salmon-on-salmon is invisible and `neutral-1000`
 * is the ink this system already guarantees at 6.50:1.
 */
const Progress = styled('span')({
  position: 'absolute',
  left: 0,
  bottom: 0,
  height: 2,
  pointerEvents: 'none',
  zIndex: 2,
});

export interface HoldToApproveButtonProps {
  onApprove: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  testID?: string;
  /**
   * Which control the hold wraps. `secondary` for a held action that is not
   * the screen's committing one — the seed-phrase copy, for instance. The
   * progress ink follows: `text.onAccent` on the salmon fill, `text.primary`
   * on the secondary fill where onAccent would vanish.
   */
  variant?: 'primary' | 'secondary';
}

/**
 * The committing action on an approval the preview flagged as risky.
 *
 * The hold exists to defeat the reflex tap: an approval screen appears under
 * the user's thumb, in a flow they did not start, and a single tap is the whole
 * distance between reading and signing. Holding costs half a second and cannot
 * be done by accident.
 *
 * It is friction against a reflex, not a security control, which is why the
 * keyboard path does not require it: WCAG asks that nothing be gated behind
 * holding a key down, so Enter and Space commit immediately. A pointer click
 * that never became a hold does nothing at all.
 */
export function HoldToApproveButton({
  onApprove,
  disabled,
  loading,
  children,
  testID,
  variant = 'primary',
}: HoldToApproveButtonProps): React.ReactElement {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    startedAt.current = null;
    setProgress(0);
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    if (disabled || loading || startedAt.current !== null) return;
    const began = performance.now();
    startedAt.current = began;

    // Declared inside the hold it belongs to: the loop closes over this hold's
    // own start time, so it needs nothing from the render that scheduled it.
    function step() {
      const elapsed = performance.now() - began;
      if (elapsed >= HOLD_MS) {
        stop();
        void onApprove();
        return;
      }
      setProgress(elapsed / HOLD_MS);
      frame.current = requestAnimationFrame(step);
    }

    frame.current = requestAnimationFrame(step);
  }, [disabled, loading, onApprove, stop]);

  // A pointer click is swallowed here, in the capture phase, so it never
  // reaches the button: with a pointer the hold is the only way through. A
  // keyboard activation carries `detail === 0` and is let past untouched.
  const swallowPointerClick = useCallback((event: React.MouseEvent) => {
    if (event.detail > 0) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const ButtonControl = variant === 'secondary' ? SecondaryButton : PrimaryButton;

  return (
    <Wrapper
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClickCapture={swallowPointerClick}
    >
      <ButtonControl
        onClick={() => void onApprove()}
        disabled={disabled}
        loading={loading}
        testID={testID}
      >
        {children}
      </ButtonControl>
      {progress > 0 ? (
        <Progress
          style={{
            width: `${Math.min(progress, 1) * 100}%`,
            backgroundColor: variant === 'secondary' ? semantic.text.primary : semantic.text.onAccent,
          }}
          data-testid="hold-progress"
        />
      ) : null}
    </Wrapper>
  );
}
