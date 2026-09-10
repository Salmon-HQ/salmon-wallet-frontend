/**
 * The kit's Powerups entry with Powerups compiled OUT (spec 027 §3). Vite
 * resolves `@salmon/ui/powerups` here when `VITE_POWERUPS` is not 'on'.
 */
import type { ComponentType } from 'react';
import type { PowerupEntry } from '@salmon/shared/powerups';
import type { SwapPageProps } from './components/SwapPage';
import type { PowerupsPageProps } from './components/PowerupsPage';

export const POWERUPS_ENABLED = false;
export const POWERUPS: readonly PowerupEntry[] = [];
export function isPowerupOnNetwork(_entry: PowerupEntry, _networkId: string | null): boolean {
  return false;
}
export type { PowerupEntry, PowerupsPageProps, SwapPageProps };

export const SwapPage: ComponentType<SwapPageProps> | null = null;
export const PowerupsPage: ComponentType<PowerupsPageProps> | null = null;
