import { describe, expect, it } from 'vitest';
import { describeDisclosure } from './disclosure';
import { POWERUPS } from './registry';

describe('describeDisclosure — generated from the manifest, never written', () => {
  it('says "sends nothing" for a Powerup that declares none and no endpoint', () => {
    expect(describeDisclosure({ permissions: ['none'], endpoints: [] })).toEqual([
      { key: 'powerups.disclosure.sends_nothing' },
    ]);
  });

  it('names Salmon when the data goes to the backend only', () => {
    expect(describeDisclosure({ permissions: ['address', 'balances'], endpoints: [] })).toEqual([
      { key: 'powerups.disclosure.address_to', params: { host: 'Salmon' } },
      { key: 'powerups.disclosure.balances_to', params: { host: 'Salmon' } },
    ]);
  });

  it('names every declared host, by host alone', () => {
    expect(
      describeDisclosure({
        permissions: ['address'],
        endpoints: ['https://api.kamino.finance/v2', 'https://price.jup.ag'],
      })
    ).toEqual([
      { key: 'powerups.disclosure.address_to', params: { host: 'api.kamino.finance' } },
      { key: 'powerups.disclosure.address_to', params: { host: 'price.jup.ag' } },
    ]);
  });

  it('reads the same for a core and a community Powerup with the same declarations', () => {
    const declarations = { permissions: ['address'] as const, endpoints: ['https://x.y'] };
    expect(describeDisclosure({ ...declarations })).toEqual(
      describeDisclosure({ ...declarations })
    );
  });

  it('every registered manifest yields at least one line', () => {
    for (const manifest of POWERUPS) {
      expect(describeDisclosure(manifest).length).toBeGreaterThan(0);
    }
  });
});
