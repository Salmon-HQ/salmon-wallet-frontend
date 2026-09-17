/**
 * Toggle — the kit's on/off control, moved out of `SettingsPanelStack` as
 * is (spec: promote the ad hoc switches into one shared twin). Same look,
 * same inks: `role="switch"` on a real button, checked reads `accent.ink`
 * on the track, unchecked `border.default` (the card token vanished against
 * the row's own card ground, leaving the off state invisible).
 */
import React from 'react';
import { motionEasing, motionMs } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion';
import type { ToggleProps } from './types';

/** The switch's geometry — a track two thumbs long. */
const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 24;
const THUMB_SIZE = 20;
const THUMB_INSET = (TRACK_HEIGHT - THUMB_SIZE) / 2;

export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  accessibilityHint,
  disabled,
  testID,
  style,
  className,
}: ToggleProps): React.ReactElement {
  const { accent, border, text } = useSemantic();
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={accessibilityLabel}
      aria-description={accessibilityHint}
      disabled={disabled}
      data-testid={testID}
      className={className}
      onClick={() => onValueChange(!value)}
      style={{
        position: 'relative',
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        flexShrink: 0,
        margin: 0,
        padding: 0,
        border: 'none',
        borderRadius: TRACK_HEIGHT / 2,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        backgroundColor: value ? accent.ink : border.default,
        transition: reduced
          ? undefined
          : `background-color ${motionMs.flick}ms ${motionEasing.current.css}`,
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: THUMB_INSET,
          left: THUMB_INSET,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: '50%',
          backgroundColor: text.primary,
          transform: value
            ? `translateX(${TRACK_WIDTH - THUMB_SIZE - THUMB_INSET * 2}px)`
            : 'translateX(0)',
          transition: reduced
            ? undefined
            : `transform ${motionMs.flick}ms ${motionEasing.current.css}`,
        }}
      />
    </button>
  );
}
