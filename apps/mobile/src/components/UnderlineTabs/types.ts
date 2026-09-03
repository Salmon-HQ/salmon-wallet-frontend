import type { ViewStyle } from 'react-native';
import type { UnderlineTabsPropsBase } from '@salmon/shared';

export type { UnderlineTab, UnderlineTabsSize } from '@salmon/shared';

export interface UnderlineTabsProps extends UnderlineTabsPropsBase {
  style?: ViewStyle;
}
