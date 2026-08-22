/**
 * PendingValue - a value that is being recalculated, in place.
 *
 * Web/extension expression of the shared `PendingValuePropsBase` contract.
 *
 * The row or card around the value is not touched: it keeps its blur, its
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
import { keyframes, styled } from '@mui/material/styles';
import { motionDuration, motionEasing, motionMs, opacity, reducedMotion } from '@salmon/shared';
import type { PendingValueProps } from './types';

const breathe = keyframes`
  from { opacity: ${opacity.full}; }
  to { opacity: ${opacity.disabled}; }
`;

const Slot = styled('span', {
  shouldForwardProp: (prop: string) => prop !== 'pending',
})<{ pending: boolean }>(({ pending }) => ({
  display: 'inline-block',
  transition: `opacity ${motionDuration.swell} ${motionEasing.settle.css}`,
  ...(pending
    ? {
        animation: `${breathe} ${motionMs.pulseCycle / 2}ms ${motionEasing.current.css} infinite alternate`,
        [`@media ${reducedMotion.query}`]: {
          animation: 'none',
          opacity: opacity.disabled,
        },
      }
    : { opacity: opacity.full }),
}));

export function PendingValue({
  pending = false,
  children,
  style,
}: PendingValueProps): React.ReactElement {
  return (
    <Slot pending={pending} style={style}>
      {children}
    </Slot>
  );
}
