/**
 * The mobile Powerups entry with Powerups compiled OUT (spec 027 §3). Metro
 * resolves `src/powerups` here when `EXPO_PUBLIC_POWERUPS` is not 'on'.
 */
import type { ComponentType } from 'react';
import type { Powerup } from './catalog';

export const POWERUPS_ENABLED = false;

export function getPowerups(_options: { includeMocks: boolean; networkId: string | null }): Powerup[] {
  return [];
}

export const SwapRoute: ComponentType | null = null;
export const PowerupsRoute: ComponentType | null = null;

export type { Powerup };
