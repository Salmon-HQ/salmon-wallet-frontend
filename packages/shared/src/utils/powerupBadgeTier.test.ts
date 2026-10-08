import { describe, expect, it } from 'vitest';
import { createSemantic } from '../theme';
import { powerupBadgeTier } from './powerupBadgeTier';

describe('powerupBadgeTier', () => {
  const semantic = createSemantic('dark');

  it('marks Core in the accent and Community in the quiet surface', () => {
    expect(powerupBadgeTier(semantic, 'core')).toEqual({
      background: semantic.accent.tint,
      ink: semantic.accent.ink,
      key: 'powerups.badge.core',
      fallback: 'Core',
    });
    expect(powerupBadgeTier(semantic, 'community')).toEqual({
      background: semantic.surface.raised,
      ink: semantic.text.secondary,
      key: 'powerups.badge.community',
      fallback: 'Community',
    });
  });
});
