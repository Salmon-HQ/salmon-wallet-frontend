import type { StyleProp, ViewStyle } from 'react-native';
import type { PillPropsBase } from '@salmon/shared';

export type { PillTone } from '@salmon/shared';

/** The RN half of `PillPropsBase`. */
export interface PillProps extends PillPropsBase {
  style?: StyleProp<ViewStyle>;
}
