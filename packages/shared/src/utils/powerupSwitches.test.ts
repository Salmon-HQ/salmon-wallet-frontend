import { describe, expect, it } from 'vitest';
import { parsePowerupSwitches, toPowerupAllowlist } from './powerupSwitches';

describe('parsePowerupSwitches — fail closed', () => {
  it('reads a well-formed list, keeping a reason only on a disabled entry', () => {
    expect(
      parsePowerupSwitches([
        { id: 'swap', enabled: true, reason: 'region' },
        { id: 'memo', enabled: false, reason: 'maintenance' },
      ])
    ).toEqual([
      { id: 'swap', enabled: true },
      { id: 'memo', enabled: false, reason: 'maintenance' },
    ]);
  });

  it.each([undefined, null, 'swap', 42, {}, { id: 'swap', enabled: true }])(
    'yields no Powerups for a field that is not a list: %p',
    (value) => {
      expect(parsePowerupSwitches(value)).toEqual([]);
    }
  );

  it('drops an entry without a string id or a boolean enabled, and an unknown reason', () => {
    expect(
      parsePowerupSwitches([
        { id: 'swap', enabled: 'yes' },
        { enabled: true },
        { id: '', enabled: true },
        null,
        { id: 'memo', enabled: false, reason: 'because' },
      ])
    ).toEqual([{ id: 'memo', enabled: false }]);
  });
});

describe('toPowerupAllowlist', () => {
  it('splits the switches into offered ids and reasons', () => {
    expect(
      toPowerupAllowlist([
        { id: 'swap', enabled: true },
        { id: 'memo', enabled: false, reason: 'deprecated' },
        { id: 'ghost', enabled: false },
      ])
    ).toEqual({ enabled: ['swap'], disabled: { memo: 'deprecated' } });
  });
});
