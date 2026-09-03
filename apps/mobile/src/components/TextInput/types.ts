import type { StyleProp, ViewStyle } from 'react-native';
import type { TextInputPropsBase } from '@salmon/shared';

/**
 * The React Native half of `TextInputPropsBase`: the contract plus a style.
 * The card is the field's shape owner, so it is what takes the focus edge.
 */
export interface TextFieldProps extends TextInputPropsBase {
  style?: StyleProp<ViewStyle>;
}
