/**
 * The screen slide on the DOM — one keyframe pair and one clock for every
 * stack that pushes and pops a screen (`SlideStack`, `SettingsPanelStack`).
 * The numbers are `@salmon/shared`'s (`motion/screenSlide`), so the side
 * panel's push cannot drift from mobile's.
 */
import { SCREEN_POP_MS, SCREEN_PUSH_MS, motionEasing } from '@salmon/shared';

import { injectKeyframes } from '../utils/injectKeyframes';

const SLIDE_IN = 'sw-screen-slide-in';
const SLIDE_OUT = 'sw-screen-slide-out';

injectKeyframes(
  SLIDE_IN,
  `@keyframes ${SLIDE_IN} { from { transform: translateX(100%); } to { transform: translateX(0); } }`
);
injectKeyframes(
  SLIDE_OUT,
  `@keyframes ${SLIDE_OUT} { from { transform: translateX(0); } to { transform: translateX(100%); } }`
);

export type ScreenSlidePhase = 'push' | 'pop';

/**
 * The `animation` shorthand for a screen entering (`push`) or leaving (`pop`),
 * or `undefined` under reduce motion — a cut, the same mapping every verb in
 * the kit makes.
 */
export function screenSlideAnimation(
  phase: ScreenSlidePhase,
  reducedMotion: boolean
): string | undefined {
  if (reducedMotion) return undefined;
  return phase === 'push'
    ? `${SLIDE_IN} ${SCREEN_PUSH_MS}ms ${motionEasing.current.css} both`
    : `${SLIDE_OUT} ${SCREEN_POP_MS}ms ${motionEasing.sink.css} both`;
}
