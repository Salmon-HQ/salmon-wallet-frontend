/**
 * The mobile Powerups entry — the ONE module Home imports Powerup code from.
 * Metro aliases it to `index.off.ts` when `EXPO_PUBLIC_POWERUPS` is off, so a
 * submission build carries no catalogue and no Powerup surface (spec 027 §3).
 */
import type { ComponentType } from 'react';
import type { PowerupsCatalogProps } from '../components/PowerupsCatalog';
import { PowerupsCatalog as PowerupsCatalogImpl } from '../components/PowerupsCatalog';
import SwapTabImpl from '../screens/SwapTab';

export {
  POWERUPS_ENABLED,
  POWERUPS,
  getPowerupCatalog,
  isPowerupOnNetwork,
} from '@salmon/shared/powerups';
export type { PowerupsCatalogProps };

/** The catalogue sheet; `null` in a build with Powerups off. */
export const PowerupsCatalog: ComponentType<PowerupsCatalogProps> | null = PowerupsCatalogImpl;

/** An installed Powerup's Home surface, by id. Home never names one itself. */
export function getPowerupTab(id: string): ComponentType | null {
  return id === 'swap' ? SwapTabImpl : null;
}
