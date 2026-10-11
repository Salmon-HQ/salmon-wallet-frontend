import type { CSSProperties } from 'react';
import type { ProgressBarPropsBase } from '@salmon/shared';

/** The DOM half of `ProgressBarPropsBase`. */
export interface ProgressBarProps extends ProgressBarPropsBase {
  style?: CSSProperties;
}
