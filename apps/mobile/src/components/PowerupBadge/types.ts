import type { StyleProp, ViewStyle } from 'react-native';
import type { PowerupBadgePropsBase, PowerupBadgeTier } from '@salmon/shared';

/**
 * The two badges the powerups catalogue draws: `core` is what Salmon ships,
 * `community` is what people may add later. If the tiering is redefined by
 * custody and data exposure, the shared contract is the one place that changes.
 */
export type PowerupTier = PowerupBadgeTier;

export interface PowerupBadgeProps extends PowerupBadgePropsBase {
  style?: StyleProp<ViewStyle>;
}
