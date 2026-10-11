import { describe, expect, it } from 'vitest';
import { allowlistForDevice, parsePowerupSwitches, toPowerupAllowlist } from './powerupSwitches';

describe('parsePowerupSwitches — fail closed', () => {
  it('reads a well-formed list, keeping a reason only on a disabled entry', () => {
    expect(
      parsePowerupSwitches([
        { id: 'stake', enabled: true, reason: 'region' },
        { id: 'memo', enabled: false, reason: 'maintenance' },
      ])
    ).toEqual([
      { id: 'stake', enabled: true },
      { id: 'memo', enabled: false, reason: 'maintenance' },
    ]);
  });

  it.each([undefined, null, 'stake', 42, {}, { id: 'stake', enabled: true }])(
    'yields no Powerups for a field that is not a list: %p',
    (value) => {
      expect(parsePowerupSwitches(value)).toEqual([]);
    }
  );

  it('drops an entry without a string id or a boolean enabled, and an unknown reason', () => {
    expect(
      parsePowerupSwitches([
        { id: 'stake', enabled: 'yes' },
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
        { id: 'stake', enabled: true },
        { id: 'memo', enabled: false, reason: 'deprecated' },
        { id: 'ghost', enabled: false },
      ])
    ).toEqual({ enabled: ['stake'], disabled: { memo: 'deprecated' }, providers: {} });
  });

  it('carries the routing provider of an enabled entry, and never of a disabled one', () => {
    const switches = parsePowerupSwitches([
      { id: 'swap', enabled: true, provider: 'jupiter' },
      { id: 'other', enabled: false, reason: 'region', provider: '0x' },
      { id: 'blank', enabled: true, provider: '' },
    ]);
    expect(switches).toEqual([
      { id: 'swap', enabled: true, provider: 'jupiter' },
      { id: 'other', enabled: false, reason: 'region' },
      { id: 'blank', enabled: true },
    ]);
    expect(toPowerupAllowlist(switches)).toEqual({
      enabled: ['swap', 'blank'],
      disabled: { other: 'region' },
      providers: { swap: 'jupiter' },
    });
  });
});

describe('allowlistForDevice', () => {
  const allowlist = toPowerupAllowlist([
    { id: 'skr', enabled: true, provider: 'x' },
    { id: 'swap', enabled: true },
    { id: 'memo', enabled: false, reason: 'maintenance' },
  ]);
  const powerups = [
    { id: 'skr', requires: ['seed-vault'] as const },
    { id: 'swap' },
    { id: 'memo', requires: ['seed-vault'] as const },
  ];

  it('drops a Powerup the device cannot run, switched on or off', () => {
    const gated = allowlistForDevice(allowlist, powerups, []);

    expect(gated.enabled).toEqual(['swap']);
    expect(gated.disabled).toEqual({});
    expect(gated.providers).toEqual({});
  });

  it('keeps it on a device that has what it needs', () => {
    expect(allowlistForDevice(allowlist, powerups, ['seed-vault'])).toEqual(allowlist);
  });
});
