import type { StyleProp, ViewStyle } from 'react-native';
import type { DerivedAccountsSheetPropsBase } from '@salmon/shared';

/** The mobile half of `DerivedAccountsSheetPropsBase`: the contract plus a style. */
export interface DerivedAccountsSheetProps extends DerivedAccountsSheetPropsBase {
  style?: StyleProp<ViewStyle>;
}
