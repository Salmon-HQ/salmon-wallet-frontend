import { describe, expect, it } from 'vitest';
import { POWERUPS, getPowerup, isPowerupOnNetwork } from './registry';
import * as off from './index.off';
import * as on from './index';

describe('powerups registry', () => {
  it('lists swap as a core Powerup on Solana mainnet only', () => {
    const swap = getPowerup('swap');
    expect(swap).toBeDefined();
    expect(swap?.tier).toBe('core');
    expect(isPowerupOnNetwork(swap!, 'solana-mainnet')).toBe(true);
    expect(isPowerupOnNetwork(swap!, 'solana-devnet')).toBe(false);
    expect(isPowerupOnNetwork(swap!, null)).toBe(false);
  });

  // Spec 029 §1: the registry is a list of manifests, each from its own folder.
  it('carries every manifest field a reviewer and the disclosure need', () => {
    for (const entry of POWERUPS) {
      expect(entry.permissions.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.endpoints)).toBe(true);
      expect(entry.locales).toBe(entry.id);
      if (entry.permissions.includes('none')) expect(entry.permissions).toEqual(['none']);
    }
  });

  it('resolves copy through translation keys, never literal strings', () => {
    for (const entry of POWERUPS) {
      expect(entry.nameKey).toMatch(/^[a-z_-]+(\.[a-zA-Z_]+)+$/);
      expect(entry.descriptionKey).toMatch(/^[a-z_-]+(\.[a-zA-Z_]+)+$/);
    }
  });

  // The bundlers alias `index.ts` to `index.off.ts`: everything the rest of
  // the app reads from the entry must exist in both, with Powerups absent in
  // the off one.
  it('keeps the off entry shape-compatible with the on entry', () => {
    expect(on.POWERUPS_ENABLED).toBe(true);
    expect(off.POWERUPS_ENABLED).toBe(false);
    expect(off.POWERUPS).toEqual([]);
    expect(off.getPowerup('swap')).toBeUndefined();
    expect(off.powerupTranslations).toEqual({ en: {}, es: {} });
    expect(Object.keys(on.powerupTranslations.en).sort()).toEqual(
      POWERUPS.map((entry) => entry.locales).sort()
    );
    for (const name of ['POWERUPS', 'getPowerup', 'isPowerupOnNetwork', 'powerupTranslations']) {
      expect(name in off).toBe(true);
      expect(name in on).toBe(true);
    }
  });
});
