import type { StyleProp, ViewStyle } from 'react-native';
import type { FactsCardPropsBase } from '@salmon/shared';

/** The RN half of `FactsCardPropsBase`: the cross-platform contract plus RN style. */
export interface FactsCardProps extends FactsCardPropsBase {
  style?: StyleProp<ViewStyle>;
}
