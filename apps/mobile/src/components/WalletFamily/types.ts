import type { StyleProp, ViewStyle } from 'react-native';
import type { WalletFamilyPropsBase } from '@salmon/shared';

/** The RN half of `WalletFamilyPropsBase`: the contract plus RN style. */
export interface WalletFamilyProps extends WalletFamilyPropsBase {
  style?: StyleProp<ViewStyle>;
}
