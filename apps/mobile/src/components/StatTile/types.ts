import type { StyleProp, ViewStyle } from 'react-native';
import type { StatGridPropsBase, StatTilePropsBase } from '@salmon/shared';

/** The RN half of `StatTilePropsBase`. */
export interface StatTileProps extends StatTilePropsBase {
  style?: StyleProp<ViewStyle>;
}

/** The RN half of `StatGridPropsBase`. */
export interface StatGridProps extends StatGridPropsBase {
  style?: StyleProp<ViewStyle>;
}
