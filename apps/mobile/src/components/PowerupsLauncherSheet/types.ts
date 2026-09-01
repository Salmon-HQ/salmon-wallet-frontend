import type { ViewStyle } from 'react-native';
import type { Testable } from '@salmon/shared';

export interface PowerupsLauncherSheetProps extends Testable {
  visible: boolean;
  onClose: () => void;
  style?: ViewStyle;
}
