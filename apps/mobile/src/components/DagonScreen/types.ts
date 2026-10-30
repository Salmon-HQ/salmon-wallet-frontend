import type { StyleProp, ViewStyle } from 'react-native';
import type { DagonSheetView } from '@salmon/shared/powerups';

/**
 * Mobile only, no DOM twin (spec 043 FR-003, O12): the props live here, not
 * in a shared `PropsBase`, because there is no second platform to bind.
 */
export interface DagonScreenProps {
  publicKey: string;
  networkId: string | null;
  /** How tall the action sheet may rise: up to Home's sub-tab row. */
  sheetHeight?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface DagonActionSheetProps {
  sheet: DagonSheetView;
  height?: number;
  testID?: string;
}
