/**
 * The Powerup badge's look per tier, once for both twins
 * (`apps/mobile/src/components/PowerupBadge`, `packages/ui/src/components/PowerupBadge`):
 * Core wears the accent, Community the quiet surface.
 */
import type { Semantic } from '../theme/semantic';
import type { PowerupBadgeTier } from '../types/ui/powerup-badge';

export interface PowerupBadgeLook {
  background: string;
  ink: string;
  /** Translation key of the label, and its fallback. */
  key: string;
  fallback: string;
}

export function powerupBadgeTier(t: Semantic, tier: PowerupBadgeTier): PowerupBadgeLook {
  return tier === 'core'
    ? { background: t.accent.tint, ink: t.accent.ink, key: 'powerups.badge.core', fallback: 'Core' }
    : {
        background: t.surface.raised,
        ink: t.text.secondary,
        key: 'powerups.badge.community',
        fallback: 'Community',
      };
}
