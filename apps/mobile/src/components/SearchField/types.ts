import type { StyleProp, ViewStyle } from 'react-native';
import type { Testable } from '@salmon/shared';

export interface SearchFieldProps extends Testable {
  value: string;
  onChangeText: (text: string) => void;
  /** Doubles as the spoken name unless `accessibilityLabel` says otherwise. */
  placeholder: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}
