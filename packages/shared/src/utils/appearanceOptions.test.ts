import { describe, expect, it } from 'vitest';
import { appearanceRows } from './appearanceOptions';

describe('appearanceRows', () => {
  const glyphs = { circleHalf: 'half', sun: 'sun', moon: 'moon' };
  const t = (key: string, fallback: string) => `${key}|${fallback}`;

  it('lists System, Light and Dark in that order, each with its glyph', () => {
    const rows = appearanceRows(glyphs, t);

    expect(rows.map((row) => [row.preference, row.icon])).toEqual([
      ['system', 'half'],
      ['light', 'sun'],
      ['dark', 'moon'],
    ]);
    expect(rows[1].label).toBe('settings.appearance_options.light|Light');
  });

  it('explains only the System option', () => {
    const [system, light, dark] = appearanceRows(glyphs, t);

    expect(system.hint).toBe('settings.appearance_system_hint|Follows your device');
    expect(light.hint).toBeUndefined();
    expect(dark.hint).toBeUndefined();
  });
});
