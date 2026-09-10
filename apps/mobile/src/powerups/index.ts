/**
 * The mobile Powerups entry — the ONE module the routes import Powerup
 * screens from. Metro aliases it to `index.off.ts` when
 * `EXPO_PUBLIC_POWERUPS` is off, so a submission build carries no Powerup
 * screen, route body or catalogue (spec 027 §3).
 */
import type { ComponentType } from 'react';
import SwapRouteImpl from '../screens/SwapRoute';
import PowerupsRouteImpl from '../screens/PowerupsRoute';

export { POWERUPS_ENABLED } from '@salmon/shared/powerups';
export { getPowerups, type Powerup } from './catalog';

/** The Swap Powerup's screen; `null` in a build with Powerups off. */
export const SwapRoute: ComponentType | null = SwapRouteImpl;
/** The catalogue; `null` in a build with Powerups off. */
export const PowerupsRoute: ComponentType | null = PowerupsRouteImpl;
