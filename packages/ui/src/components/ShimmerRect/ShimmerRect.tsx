/**
 * ShimmerRect — the shimmering placeholder rectangle every skeleton is built
 * from, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/ShimmerRect/ShimmerRect.tsx`;
 * it drives the band with Reanimated, this one with a CSS `@keyframes`
 * animation registered once through `injectKeyframes`. The colours stay in
 * the inline style (read from `useSemantic()` at render) so the gradient
 * follows the mode — the keyframes only move the band.
 *
 * A cycle length is not a transition: under `useReducedMotion()` the loop is
 * not started at all, mirroring mobile's rule. The band then sits parked off
 * the left edge, clipped by the container's `overflow: hidden`, so the
 * placeholder simply reads as `skeleton.base`.
 */
import React from 'react';
import { borderRadius, componentSizes, motionEasing, motionMs } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion';
import { injectKeyframes } from '../../utils/injectKeyframes';
import type { ShimmerRectProps } from './types';

const KEYFRAME_NAME = 'sw-shimmer-band';

injectKeyframes(
  KEYFRAME_NAME,
  `@keyframes ${KEYFRAME_NAME} {
    from { transform: translateX(-${componentSizes.shimmerOffset}px); }
    to { transform: translateX(${componentSizes.shimmerOffset}px); }
  }`
);

export function ShimmerRect({
  width,
  height,
  borderRadius: customBorderRadius,
  style,
  className,
}: ShimmerRectProps) {
  const { skeleton } = useSemantic();
  const isReducedMotion = useReducedMotion();
  const radius = customBorderRadius ?? borderRadius.sm;

  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: skeleton.base,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          width: componentSizes.shimmerWidth,
          height,
          background: `linear-gradient(90deg, ${skeleton.base}, ${skeleton.highlight}, ${skeleton.base})`,
          ...(isReducedMotion
            ? { transform: `translateX(-${componentSizes.shimmerOffset}px)` }
            : {
                animation: `${KEYFRAME_NAME} ${motionMs.shimmerCycle}ms ${motionEasing.current.css} infinite`,
              }),
        }}
      />
    </div>
  );
}
