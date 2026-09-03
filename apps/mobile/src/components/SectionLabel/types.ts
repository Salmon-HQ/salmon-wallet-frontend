import type { StyleProp, TextStyle } from 'react-native';
import type { SectionLabelPropsBase } from '@salmon/shared';

export type { SectionLabelVariant } from '@salmon/shared';

/** The RN half of `SectionLabelPropsBase`: the cross-platform contract plus RN style. */
export interface SectionLabelProps extends SectionLabelPropsBase {
  style?: StyleProp<TextStyle>;
}
