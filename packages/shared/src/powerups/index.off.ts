/**
 * The Powerups entry with Powerups compiled OUT (spec 027 §3).
 *
 * The bundlers alias `powerups/index.ts` to this file when the build flag is
 * off (`EXPO_PUBLIC_POWERUPS` / `VITE_POWERUPS` ≠ 'on'), so nothing under
 * `powerups/**` — code, routes or locales — reaches the bundle. Only the
 * values the rest of the app reads exist here; every Powerup module import
 * is dead behind `POWERUPS_ENABLED`.
 */
import type { PowerupEntry, PowerupId } from './registry';

export const POWERUPS_ENABLED = false;

export const POWERUPS: readonly PowerupEntry[] = [];

export function getPowerup(_id: PowerupId): PowerupEntry | undefined {
  return undefined;
}

export function isPowerupOnNetwork(_entry: PowerupEntry, _networkId: string | null): boolean {
  return false;
}

export const powerupTranslations = { en: {}, es: {} } as const;
