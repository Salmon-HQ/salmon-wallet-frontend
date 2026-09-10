/**
 * The kit's Powerups entry with Powerups compiled OUT (spec 027 §3). Vite
 * resolves `@salmon/ui/powerups` here when `VITE_POWERUPS` is not 'on'.
 */
import type { ComponentType } from 'react';
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

export const PowerupsCatalog: ComponentType<PowerupsCatalogProps> | null = null;
export const SwapPage: ComponentType<SwapPageProps> | null = null;
