import type { StyleProp, ViewStyle } from 'react-native';
import type { Testable } from '@salmon/shared';

/**
 * The two badges the powerups catalogue draws: `core` is what Salmon ships,
 * `community` is what people may add later. If the tiering is redefined by
 * custody and data exposure, this union is the one place that changes.
 */
export type PowerupTier = 'core' | 'community';

export interface PowerupBadgeProps extends Testable {
  tier: PowerupTier;
  style?: StyleProp<ViewStyle>;
}
