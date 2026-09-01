/**
 * The powerups catalogue.
 *
 * One real entry ships today — Swap, which is already installed and is the
 * only powerup with a route. Everything else in the `.pen` frames is a mock,
 * so it lives behind the developer flag: a catalogue that advertises four
 * things the wallet cannot install is a promise, not a product.
 *
 * `name` and `description` are translation KEY PATHS, not copy: the localised
 * string is resolved at render, where the locale is known.
 */
import type { ComponentType } from 'react';

import {
  ArrowsLeftRightIcon,
  ImageIcon,
  ShieldCheckIcon,
  StackIcon,
  TrendUpIcon,
} from '../icons';
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

/** What the wallet can actually open today. */
export const REAL_POWERUPS: Powerup[] = [
  {
    id: 'swap',
    name: 'powerups.catalog.swap.name',
    description: 'powerups.catalog.swap.description',
    tier: 'official',
    installed: true,
    icon: ArrowsLeftRightIcon,
    route: '/swap',
  },
];

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

export function getPowerups({ includeMocks }: { includeMocks: boolean }): Powerup[] {
  return includeMocks ? [...REAL_POWERUPS, ...MOCK_POWERUPS] : REAL_POWERUPS;
}
