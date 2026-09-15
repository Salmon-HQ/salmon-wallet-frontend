/**
 * The kit's Powerups entry — the ONE module the extension imports Powerup code
 * from (`@salmon/ui/powerups`). Vite aliases it to `powerups.off.ts` when
 * `VITE_POWERUPS` is off, so a build with Powerups off carries no catalogue
 * and no Powerup surface (spec 027 §3). The components barrel does not export
 * these.
 */
import type { ComponentType } from 'react';
import { PowerupsPage as PowerupsPageImpl } from './components/PowerupsPage';
import { MemoPage as MemoPageImpl } from './components/MemoPage';
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

/** The catalogue page of Home's stack; `null` in a build with Powerups off. */
export const PowerupsPage: ComponentType<PowerupsPageProps> | null = PowerupsPageImpl;

/** The Memo Powerup's Home sub-tab; `null` in a build with Powerups off. */
export const MemoPage: ComponentType<MemoPageProps> | null = MemoPageImpl;
