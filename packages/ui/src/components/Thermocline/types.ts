import type { CSSProperties } from 'react';
import type { ThermoclinePropsBase } from '@salmon/shared';

export type { ThermoclineTier } from '@salmon/shared';

/** The DOM half of `ThermoclinePropsBase`: the cross-platform contract plus a style. */
export interface ThermoclineProps extends ThermoclinePropsBase {
  style?: CSSProperties;
  className?: string;
}
