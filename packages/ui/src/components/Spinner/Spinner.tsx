/**
 * Spinner — the DOM's small inline wait: a bordered ring spun on
 * `motionMs.spinCycle`. The mobile twin is `apps/mobile/src/components/Spinner`.
 */
import { SPINNER_DEFAULT_SIZE, motionMs } from '@salmon/shared';
import { injectKeyframes } from '../../utils/injectKeyframes';
import type { SpinnerProps } from './types';

const SPIN_KEYFRAMES = 'sw-spinner-spin';
injectKeyframes(
  SPIN_KEYFRAMES,
  `@keyframes ${SPIN_KEYFRAMES} { to { transform: rotate(360deg); } }`
);

export function Spinner({ color, size = SPINNER_DEFAULT_SIZE, testID }: SpinnerProps) {
  return (
    <span
      role="status"
      data-testid={testID}
      style={{
        position: 'relative',
        display: 'inline-block',
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
