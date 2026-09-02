import type { StyleProp, ViewStyle } from 'react-native';
import type { ListRowPropsBase } from '@salmon/shared';

export type { ListRowPadding, ListRowEmphasis } from '@salmon/shared';

/** The RN half of `ListRowPropsBase`: the cross-platform contract plus RN style. */
export interface ListRowProps extends ListRowPropsBase {
  style?: StyleProp<ViewStyle>;
}
