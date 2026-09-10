/**
 * The kit's Powerups entry — the ONE module the extension imports Powerup code
 * from (`@salmon/ui/powerups`). Vite aliases it to `powerups.off.ts` when
 * `VITE_POWERUPS` is off, so a build with Powerups off carries no catalogue
 * and no Powerup surface (spec 027 §3). The components barrel does not export
 * these.
 */
import type { ComponentType } from 'react';
import { PowerupsCatalog as PowerupsCatalogImpl } from './components/PowerupsCatalog';
import { SwapPage as SwapPageImpl } from './components/SwapPage';
import type { PowerupsCatalogProps } from './components/PowerupsCatalog';
import type { SwapPageProps } from './components/SwapPage';

export {
  POWERUPS_ENABLED,
  POWERUPS,
  getPowerupCatalog,
  isPowerupOnNetwork,
} from '@salmon/shared/powerups';
export type { PowerupEntry } from '@salmon/shared/powerups';
export type { PowerupsCatalogProps, SwapPageProps };

/** The catalogue sheet; `null` in a build with Powerups off. */
export const PowerupsCatalog: ComponentType<PowerupsCatalogProps> | null = PowerupsCatalogImpl;

/** The Swap Powerup's Home sub-tab; `null` in a build with Powerups off. */
export const SwapPage: ComponentType<SwapPageProps> | null = SwapPageImpl;
