import type { CSSProperties } from 'react';
import type { DepthBackgroundPropsBase } from '@salmon/shared';

/** Props for the DepthBackground component (DOM) */
export interface DepthBackgroundProps extends DepthBackgroundPropsBase<CSSProperties> {
  className?: string;
}
