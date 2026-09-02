import type { CSSProperties } from 'react';
import type { ScalesBackgroundPropsBase } from '@salmon/shared';

export type { ScalesVariant } from '@salmon/shared';

/** Props for the ScalesBackground component (DOM) */
export interface ScalesBackgroundProps extends ScalesBackgroundPropsBase<CSSProperties> {
  className?: string;
}
