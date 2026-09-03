/**
 * PendingValue - a value that is being recalculated, in place.
 *
 * DOM expression of the shared `PendingValuePropsBase` contract; the mobile
 * twin is `apps/mobile/src/components/PendingValue`.
 *
 * The row or card around the value is not touched: it keeps its ground, its
 * border and its label, because none of that is loading. Only the number
 * breathes, and only for as long as the request that can change it is in
 * flight. Nothing is keyed on the value itself, so a refresh that comes back
 * with the same number produces no arrival flash — the value simply stops
 * breathing.
 *
 * Reduce motion: the loop is not started (a `*Cycle` is a cycle length, not a
 * transition — resolving it to 0 would spin it infinitely fast). The value
 * sits at the dimmed end of the breath instead, so the state is still
 * readable without the travel.
 */
import React from 'react';
import { motionDuration, motionEasing, motionMs, opacity } from '@salmon/shared';

import { useReducedMotion } from '../../motion/useReducedMotion';
import { injectKeyframes } from '../../utils/injectKeyframes';
import type { PendingValueProps } from './types';

const BREATHE = 'sw-pending-value-breathe';
injectKeyframes(
  BREATHE,
  `@keyframes ${BREATHE} { from { opacity: ${opacity.full}; } to { opacity: ${opacity.disabled}; } }`
);

export function PendingValue({
  pending = false,
  children,
  style,
}: PendingValueProps): React.ReactElement {
  const reduced = useReducedMotion();

  const motion: React.CSSProperties = !pending
    ? { opacity: opacity.full }
    : reduced
      ? { opacity: opacity.disabled }
      : {
          animation: `${BREATHE} ${motionMs.pulseCycle / 2}ms ${motionEasing.current.css} infinite alternate`,
        };

  return (
    <span
      data-testid="pending-value"
      data-pending={pending || undefined}
      style={{
        display: 'inline-block',
        transition: `opacity ${motionDuration.swell} ${motionEasing.settle.css}`,
        ...motion,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
