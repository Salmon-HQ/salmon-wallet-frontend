import type { StyleProp, ViewStyle } from 'react-native';
import type { KeyValueRowPropsBase } from '@salmon/shared';

export type { KeyValueTone } from '@salmon/shared';

/** The RN half of `KeyValueRowPropsBase`: the cross-platform contract plus RN style. */
export interface KeyValueRowProps extends KeyValueRowPropsBase {
  style?: StyleProp<ViewStyle>;
}
