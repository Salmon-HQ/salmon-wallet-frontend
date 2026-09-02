/**
 * The DOM's answer to `ActivityIndicator` — a bordered ring spun on
 * `motionMs.spinCycle`, shared by all three button variants so the keyframe
 * rule is injected once.
 */
import { motionMs } from '@salmon/shared';
import { injectKeyframes } from '../../utils/injectKeyframes';

const SPIN_KEYFRAMES = 'sw-button-spin';
injectKeyframes(
  SPIN_KEYFRAMES,
  `@keyframes ${SPIN_KEYFRAMES} { to { transform: rotate(360deg); } }`
);

export interface ButtonSpinnerProps {
  color: string;
  /** @default 20 */
  size?: number;
}

export function ButtonSpinner({ color, size = 20 }: ButtonSpinnerProps) {
  return (
    <span
      role="status"
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        borderTopColor: 'transparent',
        animation: `${SPIN_KEYFRAMES} ${motionMs.spinCycle}ms linear infinite`,
      }}
    />
  );
}
