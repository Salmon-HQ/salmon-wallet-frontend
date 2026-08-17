import type { CSSProperties } from 'react';

export interface DepthBackgroundProps {
  /**
   * Draw the marine snow field. Turn it off on any ground that will carry
   * data in its upper region — the ramp alone is a background colour and is
   * always safe, the snow is a motif and is not.
   * @default true
   */
  snow?: boolean;
  style?: CSSProperties;
  className?: string;
}
