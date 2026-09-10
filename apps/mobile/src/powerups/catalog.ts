/**
 * The powerups catalogue, as mobile draws it.
 *
 * The real entries come from the shared registry (spec 027 §1) — copy keys,
 * tier, networks, route — with the platform's icon and path put on. Everything
 * else in the `.pen` frames is a mock, so it lives behind the developer flag:
 * a catalogue that advertises four things the wallet cannot install is a
 * promise, not a product.
 *
 * `name` and `description` are translation KEY PATHS, not copy: the localised
 * string is resolved at render, where the locale is known.
 */
import type { ComponentType } from 'react';

import { POWERUPS, isPowerupOnNetwork, type PowerupId } from '@salmon/shared/powerups';
import { ArrowsLeftRightIcon, ImageIcon, ShieldCheckIcon, StackIcon, TrendUpIcon } from '../icons';
import type { IconGlyphProps } from '../components/IconBubble';

/**
 * `featured` is a placement, not a fourth tier — a featured powerup is still
 * official or community, and `PowerupBadge` draws both marks.
 */
export interface Powerup {
  id: string;
  /** Translation key for the display name. */
  name: string;
  /** Translation key for the one-line description. */
  description: string;
  tier: 'official' | 'community';
  featured?: boolean;
  installed: boolean;
  icon: ComponentType<IconGlyphProps>;
  /** Only an installed powerup that owns a screen has one. */
  route?: string;
}

/** The registry's icon on this platform. */
const ICONS: Record<PowerupId, ComponentType<IconGlyphProps>> = {
  swap: ArrowsLeftRightIcon,
};

/** The `.pen` frames' catalogue. Developer mode only — none of these exist. */
export const MOCK_POWERUPS: Powerup[] = [
  {
    id: 'wallet-guard',
    name: 'powerups.catalog.wallet_guard.name',
    description: 'powerups.catalog.wallet_guard.description',
    tier: 'official',
    featured: true,
    installed: false,
    icon: ShieldCheckIcon,
  },
  {
    id: 'staking',
    name: 'powerups.catalog.staking.name',
    description: 'powerups.catalog.staking.description',
    tier: 'official',
    installed: false,
    icon: StackIcon,
  },
  {
    id: 'auto-compound',
    name: 'powerups.catalog.auto_compound.name',
    description: 'powerups.catalog.auto_compound.description',
    tier: 'community',
    installed: false,
    icon: TrendUpIcon,
  },
  {
    id: 'nft-floor-watch',
    name: 'powerups.catalog.nft_floor_watch.name',
    description: 'powerups.catalog.nft_floor_watch.description',
    tier: 'community',
    featured: true,
    installed: false,
    icon: ImageIcon,
  },
];

/**
 * The catalogue for the active network: a registry entry is offered only
 * where it acts (spec 027 §4), and the mocks only to a developer.
 */
export function getPowerups({
  includeMocks,
  networkId,
}: {
  includeMocks: boolean;
  networkId: string | null;
}): Powerup[] {
  const real = POWERUPS.filter((entry) => isPowerupOnNetwork(entry, networkId)).map(
    (entry): Powerup => ({
      id: entry.id,
      name: entry.nameKey,
      description: entry.descriptionKey,
      tier: entry.tier,
      featured: entry.featured,
      installed: true,
      icon: ICONS[entry.id],
      route: `/${entry.route}`,
    })
  );
  return includeMocks ? [...real, ...MOCK_POWERUPS] : real;
}
