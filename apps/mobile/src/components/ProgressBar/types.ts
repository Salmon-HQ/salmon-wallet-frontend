import type { StyleProp, ViewStyle } from 'react-native';
import type { ProgressBarPropsBase } from '@salmon/shared';

/** The RN half of `ProgressBarPropsBase`. */
export interface ProgressBarProps extends ProgressBarPropsBase {
  style?: StyleProp<ViewStyle>;
}
