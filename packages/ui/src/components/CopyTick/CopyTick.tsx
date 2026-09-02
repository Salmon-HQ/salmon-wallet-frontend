/**
 * CopyTick — crossfades a copy affordance and its "copied" tick, both ways.
 *
 * DOM counterpart of mobile's `useCopyFeedback` scale animation: the tick
 * fades in over `swell` on `current` when `copied` turns true, and fades
 * back out to the copy icon when the `feedbackHold` expires — so the swap
 * reads as a state change instead of a hard cut. Nothing bounces.
 *
 * Both icons stay mounted, stacked on one grid cell; only opacity moves
 * (compositor-friendly, and it is what makes the return trip animatable
 * without a double-mount state machine). The hidden layer is aria-hidden.
 *
 * Reduce motion: the transition collapses (`reducedMotion.css`) and the
 * swap becomes the instant step it used to be — feedback preserved.
 *
 * Internal to `packages/ui` — not exported from the public barrel.
 */
import type { CSSProperties, ReactNode } from 'react';
import styled from '@emotion/styled';
import { motionDuration, motionEasing, reducedMotion } from '@salmon/shared';

export interface CopyTickProps {
  /** True while the "Copied" confirmation is showing. */
  copied: boolean;
  /** The idle copy affordance (usually a CopyIcon). */
  copy: ReactNode;
  /** The confirmation (usually a CheckIcon). */
  tick: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const Stack = styled('span')({
  display: 'inline-grid',
  lineHeight: 0,
});

const Layer = styled('span', { shouldForwardProp: (prop) => prop !== '$visible' })<{
  $visible: boolean;
}>(({ $visible }) => ({
  gridArea: '1 / 1',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: $visible ? 1 : 0,
  transition: `opacity ${motionDuration.swell} ${motionEasing.current.css}`,
  [`@media ${reducedMotion.query}`]: {
    transition: `opacity ${reducedMotion.css}`,
  },
}));

export function CopyTick({ copied, copy, tick, className, style }: CopyTickProps) {
  return (
    <Stack className={className} style={style} data-testid="copy-tick">
      <Layer $visible={!copied} aria-hidden={copied}>
        {copy}
      </Layer>
      <Layer $visible={copied} aria-hidden={!copied}>
        {tick}
      </Layer>
    </Stack>
  );
}
