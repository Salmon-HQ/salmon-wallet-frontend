/**
 * The press specular — the one place a cold light colour touches a control.
 * DOM port of `apps/mobile/src/components/PressSpecular`.
 *
 * DESIGN.md §Shadow Vocabulary: "a 90ms 12%-opacity radial at the touch point,
 * 120px radius, `screen` blend, in a cold `#9FE0EF`. The only place a cold
 * light color touches a control, and it is transient." The ink is
 * `semantic.water.light` — the token the caustic band and the wait's crest
 * share.
 *
 * Geometry matches mobile: a 240px circle whose falloff is the gradient
 * itself, centred on the pointer via two CSS variables the control sets in
 * `setSpecularOrigin`. Keyboard activation has no pointer, so the variables
 * default to the control's centre. The layer is `pointer-events: none` and
 * absolutely positioned — additive light, never layout, never a hit target.
 *
 * The control that mounts this must be `position: relative` and clip its own
 * bounds (`overflow: hidden`) — the highlight is 240px across and would
 * otherwise spill past a 48px pill.
 *
 * Reduced motion is the parallel mapping, not silence: the specular is a
 * state change at the touch point, not travel, so it still appears — the
 * global `prefers-reduced-motion` collapse turns the `flick` fade into a
 * step, exactly what mobile does.
 */
import React from 'react';
import { motionDuration, motionEasing, semantic } from '@salmon/shared';
import { styled } from '../../utils/styled';

/** DESIGN.md's 120px radius. */
export const SPECULAR_RADIUS = 120;
/** DESIGN.md's 12%. */
export const SPECULAR_OPACITY = 0.12;

const SIZE = SPECULAR_RADIUS * 2;

const Layer = styled('span')({
  position: 'absolute',
  left: `calc(var(--specular-x, 50%) - ${SPECULAR_RADIUS}px)`,
  top: `calc(var(--specular-y, 50%) - ${SPECULAR_RADIUS}px)`,
  width: SIZE,
  height: SIZE,
  // The shape is a falloff, not a blur: full ink at the touch point, nothing
  // at the 120px edge — the same two stops the mobile RadialGradient draws.
  background: `radial-gradient(closest-side, ${semantic.water.light}, transparent)`,
  // Transient light adds; it does not tint the fill underneath it.
  mixBlendMode: 'screen',
  pointerEvents: 'none',
  opacity: 0,
  transition: `opacity ${motionDuration.flick} ${motionEasing.current.css}`,
  '*:active > &': {
    opacity: SPECULAR_OPACITY,
  },
});

/**
 * Record the touch point on the control, so the highlight appears under the
 * pointer rather than in the middle of the pill. Spread onto the control as
 * `onPointerDown={setSpecularOrigin}`.
 */
export function setSpecularOrigin(event: React.PointerEvent<HTMLElement>): void {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--specular-x', `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty('--specular-y', `${event.clientY - rect.top}px`);
}

export function PressSpecular() {
  return <Layer data-testid="press-specular" aria-hidden />;
}
