import type { PressSpecularPropsBase } from '@salmon/shared';

export interface PressSpecularProps extends PressSpecularPropsBase {
  /** Pressed right now: the highlight is on. */
  pressed: boolean;
  reducedMotion: boolean;
}
