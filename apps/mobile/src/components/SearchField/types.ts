import type { StyleProp, ViewStyle } from 'react-native';
import type { SearchFieldPropsBase } from '@salmon/shared';

export interface SearchFieldProps extends SearchFieldPropsBase {
  style?: StyleProp<ViewStyle>;
}
