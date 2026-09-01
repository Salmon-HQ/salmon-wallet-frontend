import type { StyleProp, ViewStyle } from 'react-native';
import type { Testable } from '@salmon/shared';

/**
 * The three badges the powerups catalogue draws.
 *
 * Named after the design frames, not after a custody model — if the tiering
 * is later redefined by custody and data exposure, this union is the one
 * place that changes.
 */
export type PowerupTier = 'official' | 'community' | 'featured';

export interface PowerupBadgeProps extends Testable {
  tier: PowerupTier;
  style?: StyleProp<ViewStyle>;
}
