import type { CSSProperties } from 'react';
import type { TokenAboutPropsBase } from '@salmon/shared';

/** The DOM half of `TokenAboutPropsBase`: the contract plus a style. */
export interface TokenAboutProps extends TokenAboutPropsBase {
  style?: CSSProperties;
  className?: string;
}
