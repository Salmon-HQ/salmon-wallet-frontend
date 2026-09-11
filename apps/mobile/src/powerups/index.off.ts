/**
 * The mobile Powerups entry with Powerups compiled OUT (spec 027 §3). Metro
 * resolves `src/powerups` here when `EXPO_PUBLIC_POWERUPS` is not 'on'.
 */
import type { ComponentType } from 'react';
import type { PowerupsCatalogProps } from '../components/PowerupsCatalog';

export {
  POWERUPS_ENABLED,
  POWERUPS,
  getPowerupCatalog,
  isPowerupOnNetwork,
} from '@salmon/shared/powerups';
export type { PowerupsCatalogProps };

/** What Home hands an installed Powerup's surface. */
export interface PowerupTabProps {
  onNavigateHome?: () => void;
}

export const PowerupsCatalog: ComponentType<PowerupsCatalogProps> | null = null;

export function getPowerupTab(_id: string): ComponentType<PowerupTabProps> | null {
  return null;
}
