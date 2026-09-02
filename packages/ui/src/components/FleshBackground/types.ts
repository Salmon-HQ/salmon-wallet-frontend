import type { CSSProperties } from 'react';
import type { FleshBackgroundPropsBase } from '@salmon/shared';

/** Props for the FleshBackground component (DOM) */
export interface FleshBackgroundProps extends FleshBackgroundPropsBase<CSSProperties> {
  className?: string;
}
