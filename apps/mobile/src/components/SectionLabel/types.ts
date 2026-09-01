import type { StyleProp, TextStyle } from 'react-native';
import type { Testable } from '@salmon/shared';

/**
 * `caps` is the tracked uppercase marker ("INSTALLED"), `group` the date or
 * bucket heading inside a list ("Today"), `title` the section heading a block
 * of content hangs under ("Recent activity").
 */
export type SectionLabelVariant = 'caps' | 'group' | 'title';

export interface SectionLabelProps extends Testable {
  children: string;
  variant: SectionLabelVariant;
  style?: StyleProp<TextStyle>;
}
