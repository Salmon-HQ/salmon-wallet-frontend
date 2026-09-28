/**
 * The Powerups entry with Powerups compiled OUT (spec 027 §3).
 *
 * The bundlers alias `powerups/index.ts` to this file when the build flag is
 * off (`EXPO_PUBLIC_POWERUPS` / `VITE_POWERUPS` ≠ 'on'), so nothing under
 * `powerups/**` — code, routes or locales — reaches the bundle. Only the
 * values the rest of the app reads exist here; every Powerup module import
 * is dead behind `POWERUPS_ENABLED`.
 */
import type { PowerupsCatalogEntry } from '../types/ui/index';
import type { PowerupEntry } from './manifest';
// Type-only, so it is erased before the bundler sees it: the off build still
// never reaches the registry or a manifest.
import type { PowerupId } from './registry';
import type { PowerupCatalogParams } from './catalog';

export const POWERUPS_ENABLED = false;

export const POWERUPS: readonly PowerupEntry[] = [];

/** No Powerup ships, so Home's default arrangement is Portfolio and NFTs. */
export const POWERUP_TAB_KEYS: readonly string[] = [];

export function getPowerup(_id: PowerupId): PowerupEntry | undefined {
  return undefined;
}

export function isPowerupOnNetwork(_entry: PowerupEntry, _networkId: string | null): boolean {
  return false;
}

export function getPowerupCatalog(_params: PowerupCatalogParams): PowerupsCatalogEntry[] {
  return [];
}

export type { PowerupCatalogParams };

export const powerupTranslations = { en: {}, es: {} } as const;
