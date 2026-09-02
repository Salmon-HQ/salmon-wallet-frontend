import type { CSSProperties } from 'react';
import type { ShimmerRectPropsBase } from '@salmon/shared';

/** The DOM half of `ShimmerRectPropsBase`: the cross-platform contract plus a style. */
export interface ShimmerRectProps extends ShimmerRectPropsBase {
  style?: CSSProperties;
  className?: string;
}
