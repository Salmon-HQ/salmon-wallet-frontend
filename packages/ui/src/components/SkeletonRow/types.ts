import type { CSSProperties } from 'react';
import type { SkeletonRowPropsBase } from '@salmon/shared';

/** The DOM half of `SkeletonRowPropsBase`: the cross-platform contract plus a style. */
export interface SkeletonRowProps extends SkeletonRowPropsBase {
  style?: CSSProperties;
  className?: string;
}
