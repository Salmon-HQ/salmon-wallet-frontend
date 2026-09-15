/**
 * The kit's Powerups entry with Powerups compiled OUT (spec 027 §3). Vite
 * resolves `@salmon/ui/powerups` here when `VITE_POWERUPS` is not 'on'.
 */
import type { ComponentType } from 'react';
import type { PowerupsPageProps } from './components/PowerupsPage';
import type { MemoPageProps } from './components/MemoPage';

export {
  POWERUPS_ENABLED,
  POWERUPS,
  POWERUP_TAB_KEYS,
  getPowerupCatalog,
  isPowerupOnNetwork,
} from '@salmon/shared/powerups';
export type { PowerupEntry } from '@salmon/shared/powerups';

export const PowerupsPage: ComponentType<PowerupsPageProps> | null = null;
export const MemoPage: ComponentType<MemoPageProps> | null = null;
