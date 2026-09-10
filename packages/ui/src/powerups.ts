/**
 * The kit's Powerups entry — the ONE module the extension imports Powerup
 * screens from (`@salmon/ui/powerups`). Vite aliases it to `powerups.off.ts`
 * when `VITE_POWERUPS` is off, so a build with Powerups off carries no
 * Powerup page (spec 027 §3). The components barrel does not export these.
 */
import type { ComponentType } from 'react';
import { SwapPage as SwapPageImpl } from './components/SwapPage';
import { PowerupsPage as PowerupsPageImpl } from './components/PowerupsPage';
import type { SwapPageProps } from './components/SwapPage';
import type { PowerupsPageProps } from './components/PowerupsPage';

export { POWERUPS_ENABLED, POWERUPS, isPowerupOnNetwork } from '@salmon/shared/powerups';
export type { PowerupEntry } from '@salmon/shared/powerups';
export type { PowerupsPageProps, SwapPageProps };

/** The Swap Powerup's page; `null` in a build with Powerups off. */
export const SwapPage: ComponentType<SwapPageProps> | null = SwapPageImpl;
/** The catalogue; `null` in a build with Powerups off. */
export const PowerupsPage: ComponentType<PowerupsPageProps> | null = PowerupsPageImpl;
