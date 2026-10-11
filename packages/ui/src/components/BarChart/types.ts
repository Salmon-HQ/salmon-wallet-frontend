import type { CSSProperties } from 'react';
import type { BarChartPropsBase } from '@salmon/shared';

/** The DOM half of `BarChartPropsBase`. */
export interface BarChartProps extends BarChartPropsBase {
  style?: CSSProperties;
}
