import type { ViewStyle } from 'react-native';
import type { DerivedAccountCardPropsBase } from '@salmon/shared';

/** The RN half of `DerivedAccountCardPropsBase`: the contract plus a style. */
export interface DerivedAccountCardProps extends DerivedAccountCardPropsBase {
  style?: ViewStyle;
}
