/**
 * The press specular — the one place a cold light colour touches a control.
 * DOM twin of `apps/mobile/src/components/PressSpecular`.
 *
 * DESIGN.md §Shadow Vocabulary: "a 90ms 12%-opacity radial at the touch point,
 * 120px radius, `screen` blend, in a cold `#9FE0EF`." The ink is
 * `semantic.water.light` — the token the wait's crest shares.
 *
 * Geometry matches mobile: a 240px circle whose falloff is the gradient
 * itself, centred on the pointer via two CSS custom properties the control
 * sets with `setSpecularOrigin`. Keyboard activation has no pointer, so the
 * variables default to the control's centre.
 *
 * `pressed` (from the control's own `usePressed()`) drives the opacity in
 * place of RN's shared value — inline style, no `styled`, no pseudo-selector.
 * The control that mounts this must be `position: relative` and clip its own
 * bounds (`overflow: hidden`) — the highlight is 240px across and would
 * otherwise spill past a 48px pill.
 */
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { motionEasing, motionMs, SPECULAR_OPACITY, SPECULAR_RADIUS } from '@salmon/shared';
import type { PressSpecularPropsBase } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';

export { SPECULAR_OPACITY, SPECULAR_RADIUS };

const SIZE = SPECULAR_RADIUS * 2;

/**
 * Records the touch point on the control, so the highlight appears under the
 * pointer rather than in the middle of the pill. Compose with the control's
 * own `usePressed().handlers.onPointerDown` in the `onPointerDown` prop.
 */
export function setSpecularOrigin(event: ReactPointerEvent<HTMLElement>): void {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--specular-x', `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty('--specular-y', `${event.clientY - rect.top}px`);
}

export interface PressSpecularProps extends PressSpecularPropsBase {
  /** `usePressed().pressed` from the control that mounts this. */
  pressed: boolean;
  /** Mobile keeps the specular under reduce motion but drops its fade to a
   * step — the same parallel mapping this prop drives here. */
  reducedMotion: boolean;
}

export function PressSpecular({ pressed, reducedMotion }: PressSpecularProps) {
  const { water } = useSemantic();
  const style: CSSProperties = {
    position: 'absolute',
    left: `calc(var(--specular-x, 50%) - ${SPECULAR_RADIUS}px)`,
    top: `calc(var(--specular-y, 50%) - ${SPECULAR_RADIUS}px)`,
    width: SIZE,
    height: SIZE,
    // The shape is a falloff, not a blur: full ink at the touch point,
    // nothing at the 120px edge — the same two stops mobile's RadialGradient
    // draws.
    background: `radial-gradient(closest-side, ${water.light}, transparent)`,
    // Transient light adds; it does not tint the fill underneath it.
    mixBlendMode: 'screen',
    pointerEvents: 'none',
    opacity: pressed ? SPECULAR_OPACITY : 0,
    transition: `opacity ${reducedMotion ? 0 : motionMs.flick}ms ${motionEasing.current.css}`,
  };

  return <span data-testid="press-specular" aria-hidden style={style} />;
}
