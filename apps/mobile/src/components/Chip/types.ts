import type { StyleProp, ViewStyle } from 'react-native';
import type { ChipGroupPropsBase, ChipPropsBase } from '@salmon/shared';

export type { ChipOption, ChipSize, ChipVariant } from '@salmon/shared';

export interface ChipProps extends ChipPropsBase {
  style?: StyleProp<ViewStyle>;
}

export interface ChipGroupProps extends ChipGroupPropsBase {
  style?: StyleProp<ViewStyle>;
}
