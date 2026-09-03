/**
 * HoldToCopyButton — a secondary action that must be held, not tapped.
 *
 * The React Native counterpart of the hold logic in
 * `packages/ui/src/components/DAppApproval/HoldToApproveButton.tsx` (DOM-only,
 * so it cannot be imported here). Same contract: holding for half a second
 * commits, releasing early cancels, and progress is drawn as a line along the
 * bottom edge. Used for copying the seed phrase — the clipboard is readable by
 * anything, so the copy costs the same deliberate act as signing does.
 *
 * The hold is friction against a reflex, not a security control. With a screen
 * reader active a double-tap activates the control directly — TalkBack and
 * VoiceOver synthesize a press, and gating that behind a hold would make the
 * action inaccessible, mirroring the DOM version's immediate keyboard path.
 */
import type { Semantic, Testable } from '@salmon/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { useThemedStyles } from '../../theme/useThemedStyles';
import { SecondaryButton } from './SecondaryButton';

/** How long the control must be held before it commits — same as the DOM. */
const HOLD_MS = 500;

export interface HoldToCopyButtonProps extends Testable {
  onCopy: () => void | Promise<void>;
  children: string;
  disabled?: boolean;
}

export function HoldToCopyButton({ onCopy, children, disabled, testID }: HoldToCopyButtonProps) {
  const styles = useThemedStyles(stylesFor);
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const [screenReaderOn, setScreenReaderOn] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReaderOn(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReaderOn);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

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
    if (disabled || startedAt.current !== null) return;
    const began = Date.now();
    startedAt.current = began;

    function step() {
      const elapsed = Date.now() - began;
      if (elapsed >= HOLD_MS) {
        stop();
        void onCopy();
        return;
      }
      setProgress(elapsed / HOLD_MS);
      frame.current = requestAnimationFrame(step);
    }

    frame.current = requestAnimationFrame(step);
  }, [disabled, onCopy, stop]);

  return (
    <View
      style={styles.wrapper}
      onTouchStart={screenReaderOn ? undefined : start}
      onTouchEnd={stop}
      onTouchCancel={stop}
    >
      <SecondaryButton
        // Touch presses are the hold; only a screen reader's synthesized
        // activation goes straight through.
        onPress={screenReaderOn ? () => void onCopy() : noop}
        disabled={disabled}
        testID={testID}
      >
        {children}
      </SecondaryButton>
      {progress > 0 && (
        <View
          testID="hold-progress"
          pointerEvents="none"
          style={[styles.progress, { width: `${Math.min(progress, 1) * 100}%` }]}
        />
      )}
    </View>
  );
}

function noop() {
  // A touch tap that never became a hold does nothing at all.
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    wrapper: {
      position: 'relative',
      width: '100%',
    },
    progress: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      height: 2,
      backgroundColor: t.text.primary,
    },
  });
