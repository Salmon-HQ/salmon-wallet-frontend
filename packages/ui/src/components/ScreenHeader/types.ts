import type { CSSProperties } from 'react';
import type { ScreenHeaderPropsBase } from '@salmon/shared';

/** The DOM half of `ScreenHeaderPropsBase`: the cross-platform contract plus a style. */
export interface ScreenHeaderProps extends ScreenHeaderPropsBase {
  /** Layout the parent owns — margins, width. */
  style?: CSSProperties;
  className?: string;
}
