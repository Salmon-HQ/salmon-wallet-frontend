/**
 * The mobile Powerups entry — the ONE module Home imports Powerup code from.
 * Metro aliases it to `index.off.ts` when `EXPO_PUBLIC_POWERUPS` is off, so a
 * submission build carries no catalogue and no Powerup surface (spec 027 §3).
 */
import type { ComponentType } from 'react';
import type { PowerupsCatalogProps } from '../components/PowerupsCatalog';
import { PowerupsCatalog as PowerupsCatalogImpl } from '../components/PowerupsCatalog';
import MemoTabImpl from '../screens/MemoTab';
import PaymentsTabImpl from '../screens/PaymentsTab';

export {
  POWERUPS_ENABLED,
  POWERUPS,
  POWERUP_TAB_KEYS,
  getPowerupCatalog,
  isPowerupOnNetwork,
} from '@salmon/shared/powerups';
export type { PowerupsCatalogProps };

/**
 * What Home hands an installed Powerup's surface. Home mounts one only with
 * an account on the active network — the "no account" state is Home's, not
 * each Powerup's — so the address arrives already resolved.
 */
export interface PowerupTabProps {
  /** The active account's receive address on `networkId`. */
  publicKey: string;
  /** The network the screen stands on. */
  networkId: string | null;
  /** The Powerup's way back: Home returns to Portfolio when its task is done. */
  onNavigateHome?: () => void;
  /**
   * How tall a sheet may rise from this surface: up to the sub-tab row, the
   * same ceiling Home gives its catalogue. Undefined until Home has measured.
   */
  sheetHeight?: number;
}

/** The catalogue sheet; `null` in a build with Powerups off. */
export const PowerupsCatalog: ComponentType<PowerupsCatalogProps> | null = PowerupsCatalogImpl;

/** An installed Powerup's Home surface, by id. Home never names one itself. */
export function getPowerupTab(id: string): ComponentType<PowerupTabProps> | null {
  if (id === 'memo') return MemoTabImpl;
  if (id === 'payments') return PaymentsTabImpl;
  return null;
}
