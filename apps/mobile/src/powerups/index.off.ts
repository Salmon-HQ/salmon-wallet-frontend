/**
 * The mobile Powerups entry with Powerups compiled OUT (spec 027 §3). Metro
 * resolves `src/powerups` here when `EXPO_PUBLIC_POWERUPS` is not 'on'.
 */
import type { ComponentType } from 'react';
import type { PowerupsCatalogProps } from '../components/PowerupsCatalog';

export {
  POWERUPS_ENABLED,
  POWERUPS,
  POWERUP_TAB_KEYS,
  getPowerupCatalog,
  isPowerupOnNetwork,
} from '@salmon/shared/powerups';
export type { PowerupsCatalogProps };

/** What Home hands an installed Powerup's surface. */
export interface PowerupTabProps {
  publicKey: string;
  networkId: string | null;
  onNavigateHome?: () => void;
}

export const PowerupsCatalog: ComponentType<PowerupsCatalogProps> | null = null;

export function getPowerupTab(_id: string): ComponentType<PowerupTabProps> | null {
  return null;
}

export interface PowerupScreenProps {
  publicKey: string;
  networkId: string | null;
  onBack: () => void;
}

export function getPowerupScreen(
  _id: string,
  _screen: string
): ComponentType<PowerupScreenProps> | null {
  return null;
}
