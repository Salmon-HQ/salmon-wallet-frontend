import type { ViewStyle } from 'react-native';
import type { Testable } from '@salmon/shared';

export interface PowerupsFabProps extends Testable {
  onPress: () => void;
  /** True while the launcher sheet is open — the plus turns 45 degrees. */
  open?: boolean;
  /** Safe-area-aware bottom offset, supplied by the parent screen. */
  bottomOffset: number;
  style?: ViewStyle;
}
