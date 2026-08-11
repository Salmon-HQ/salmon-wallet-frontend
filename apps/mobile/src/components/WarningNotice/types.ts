import type { StyleProp, ViewStyle } from 'react-native';
import type { WarningNoticePropsBase } from '@salmon/shared';

// Re-export the tone union for consumers
export type { WarningNoticeTone } from '@salmon/shared';

/**
 * Props for the WarningNotice component (React Native).
 */
export interface WarningNoticeProps extends WarningNoticePropsBase {
  /** Optional container style override (e.g. margins from the parent). */
  style?: StyleProp<ViewStyle>;
}
