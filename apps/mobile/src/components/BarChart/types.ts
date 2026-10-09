import type { StyleProp, ViewStyle } from 'react-native';
import type { BarChartPropsBase } from '@salmon/shared';

/** The RN half of `BarChartPropsBase`. */
export interface BarChartProps extends BarChartPropsBase {
  style?: StyleProp<ViewStyle>;
}
