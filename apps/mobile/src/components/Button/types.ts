import type { ViewStyle } from 'react-native';
import type {
  ButtonPropsBase,
  SecondaryButtonPropsBase,
  TextButtonPropsBase,
} from '@salmon/shared';

export type { SecondaryButtonTone } from '@salmon/shared';

export interface PrimaryButtonProps extends ButtonPropsBase {
  style?: ViewStyle;
}

export interface SecondaryButtonProps extends SecondaryButtonPropsBase {
  style?: ViewStyle;
}

export interface TextButtonProps extends TextButtonPropsBase {
  style?: ViewStyle;
}
