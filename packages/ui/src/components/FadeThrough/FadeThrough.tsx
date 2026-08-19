/**
 * FadeThrough — a top-level content swap under a frame that stays put.
 *
 * Web/extension expression of Material Design's "fade through" pattern: when
 * `transitionKey` changes (Home's per-chain content — token list ↔ Bitcoin
 * view), the incoming content fades in and settles from `scale(0.97)` over
 * `contentSwap`, so the swap reads as an arrival instead of a hard cut. The
 * frame around it — balance card, chain selector, list fades — is not
 * touched, because none of it changed.
 *
 * Reduce motion: no animation is applied and the swap is the instant cut it
 * was before. The signal is read in JS (not only a media query) so the calm
 * variant is a testable decision, same as mobile's helpers.
 *
 * ponytail: enter-only — React unmounts the outgoing content synchronously,
 * and the 90ms outgoing fade would need a double-mount state machine holding
 * stale children. Mobile ships the full pattern via Reanimated `exiting`;
 * add the DOM exit half only if the bare removal reads harsh in practice.
 */
import React from 'react';
import { keyframes, styled } from '@mui/material/styles';
import { motionDuration, motionEasing } from '@salmon/shared';

import { useReducedMotion } from '../../utils/useReducedMotion';
import type { FadeThroughProps } from './types';

/** Where the incoming content settles from. Felt, not seen. */
const ENTER_SCALE = 0.97;

const fadeThroughIn = keyframes`
  from { opacity: 0; transform: scale(${ENTER_SCALE}); }
  to { opacity: 1; transform: none; }
`;

const Frame = styled('div', {
  shouldForwardProp: (prop: string) => prop !== 'animate',
})<{ animate: boolean }>(({ animate }) => ({
  // Transparent to the surrounding column layout: the scrolling child keeps
  // owning its own overflow, exactly as it did before the wrapper existed.
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  ...(animate
    ? {
        animation: `${fadeThroughIn} ${motionDuration.contentSwap} ${motionEasing.current.css} both`,
      }
    : undefined),
}));

export function FadeThrough({ transitionKey, children }: FadeThroughProps): React.ReactElement {
  const isReduceMotionEnabled = useReducedMotion();
  return (
    <Frame key={transitionKey} animate={!isReduceMotionEnabled}>
      {children}
    </Frame>
  );
}
