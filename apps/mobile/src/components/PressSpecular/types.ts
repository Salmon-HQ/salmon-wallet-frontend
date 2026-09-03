/**
 * The press specular's native inputs on top of the shared contract: the
 * touch point and the press signal are Reanimated shared values here, a
 * boolean and two CSS custom properties on the DOM. The geometry
 * (`SPECULAR_RADIUS`, `SPECULAR_OPACITY`) is the contract's. `PressSpecular.tsx`
 * declares this same shape inline today — the next touch on that file points
 * it here.
 */
import type { PressSpecularPropsBase } from '@salmon/shared';
import type { SharedValue } from 'react-native-reanimated';

export interface PressSpecularProps extends PressSpecularPropsBase {
  /** Touch point within the control, in points. */
  x: SharedValue<number>;
  y: SharedValue<number>;
  /** 0 at rest, `SPECULAR_OPACITY` while pressed. */
  opacity: SharedValue<number>;
}
