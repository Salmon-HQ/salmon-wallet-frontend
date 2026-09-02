import type { ViewStyle } from 'react-native';
import type { ButtonPropsBase, TextButtonPropsBase } from '@salmon/shared';

export interface PrimaryButtonProps extends ButtonPropsBase {
  style?: ViewStyle;
}

export interface SecondaryButtonProps extends ButtonPropsBase {
  style?: ViewStyle;
}

export interface TextButtonProps extends TextButtonPropsBase {
  style?: ViewStyle;
}
