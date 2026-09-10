import type { ViewStyle } from 'react-native';
import type { PowerupsFabPropsBase } from '@salmon/shared';

export interface PowerupsFabProps extends PowerupsFabPropsBase {
  /** Safe-area-aware bottom offset, supplied by the parent screen. */
  bottomOffset: number;
  style?: ViewStyle;
}
