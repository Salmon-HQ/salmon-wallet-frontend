import type { Testable } from './testable';

/**
 * The tier mark on a catalogue entry: `core` is what Salmon ships, `community`
 * is what people may add later. Spelled out here rather than imported from the
 * registry so the contract carries no dependency on the Powerups module the
 * build flag aliases away.
 */
export type PowerupBadgeTier = 'core' | 'community';

export interface PowerupBadgePropsBase extends Testable {
  tier: PowerupBadgeTier;
}
