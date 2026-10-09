import { describe, expect, it } from 'vitest';
import { skrView } from './skrView';
import type { SkrStakeResponse } from '../../api/services/staking';

const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${JSON.stringify(options)}` : key;
const formatValue = (usd: number | null | undefined) => `$${(usd ?? 0).toFixed(2)}`;
const formatDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const NOW = Date.parse('2026-10-08T21:00:00Z');

// The recorded mainnet wallet (backend spec 021).
const response: SkrStakeResponse = {
  mint: 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3',
  decimals: 6,
  sharePrice: '1151142678',
  cooldownSeconds: 172800,
  apy: 0.151,
  usdPrice: 0.01622,
  liquid: '0',
  totalStaked: '5026970696857042',
  positions: [
    {
      address: '7yFnVkeEk4Qd6jgGsjrU4rhYDd7UQ985ah1VgWNg8m58',
      staked: '46045707120',
      earned: '6045707120',
      guardian: {
        pool: 'DPJ58trLsF9yPrBa2pk6UaRkvqW8hWUYjawe788WBuqr',
        name: 'Solana Mobile Guardian',
        commissionBps: 0,
        active: true,
      },
      unstaking: null,
      stakedSince: Date.parse('2026-01-21T06:44:27Z'),
      history: [
        { at: Date.parse('2026-10-08T10:00:00Z'), earned: '41000000' },
        { at: Date.parse('2026-10-06T10:00:00Z'), earned: '41090000' },
      ],
    },
  ],
};
const view = (r: SkrStakeResponse) =>
  skrView(r, { t, formatValue, formatDate, now: NOW, locale: 'en' });

describe('skrView', () => {
  it('gives the stake card its figures: staked, earned, available, each with its value', () => {
    const v = view(response);

    expect(v.staked).toEqual({ value: '46,045.71', caption: '≈ $746.86' });
    expect(v.earned).toEqual({ value: '+6,045.71', caption: '≈ $98.06' });
    expect(v.available).toEqual({ value: '0.00', caption: '≈ $0.00' });
    expect(v.apy).toBe('15.10%');
  });

  it('names each guardian with its commission and status', () => {
    expect(view(response).guardians).toEqual([
      {
        key: 'DPJ58trLsF9yPrBa2pk6UaRkvqW8hWUYjawe788WBuqr',
        name: 'Solana Mobile Guardian',
        commission: 'skr.guardian.commission:{"value":"0%"}',
        active: true,
      },
    ]);
  });

  it('estimates the SKR earned per day from the rate, and counts the days staked', () => {
    const v = view(response);

    // 46,045.707 × 0.151 / 365 = 19.049…
    expect(v.perDay).toEqual({ value: '≈ +19.05', caption: '≈ $0.31' });
    expect(v.days).toBe(260);
  });

  it('lists what each recorded period earned, newest first, and the total', () => {
    const v = view(response);

    expect(v.earnedTotal).toBe('+6,045.71 SKR');
    expect(v.history).toEqual([
      { key: 'h-1791453600000', date: '2026-10-08', value: '+41.00 SKR', caption: '$0.67' },
      { key: 'h-1791280800000', date: '2026-10-06', value: '+41.09 SKR', caption: '$0.67' },
    ]);
  });

  it("reads the program's total staked in whole SKR", () => {
    expect(view(response).totalStaked).toBeCloseTo(5026970696.857042, 3);
    expect(view({ ...response, totalStaked: undefined }).totalStaked).toBeNull();
  });

  it('says how much is unstaking and when it can be withdrawn', () => {
    const unstaking = {
      ...response,
      positions: [
        {
          ...response.positions[0]!,
          unstaking: { amount: '5000000', withdrawableAt: Date.parse('2026-10-10T00:00:00Z') },
        },
      ],
    };

    expect(view(unstaking).unstaking).toEqual({ value: '5.00', withdrawable: '2026-10-10' });
  });

  it('leaves out what is not known: rate, start, price, guardian name', () => {
    const v = view({
      ...response,
      apy: null,
      usdPrice: null,
      positions: [
        {
          ...response.positions[0]!,
          stakedSince: null,
          guardian: { ...response.positions[0]!.guardian, name: null, commissionBps: null },
        },
      ],
    });

    expect(v.apy).toBeNull();
    expect(v.perDay).toBeNull();
    expect(v.days).toBeNull();
    expect(v.staked).toEqual({ value: '46,045.71' });
    expect(v.guardians[0]).toMatchObject({ name: 'DPJ5...Buqr', commission: null });
  });

  it('is empty without SKR', () => {
    expect(view({ ...response, positions: [] }).empty).toBe(true);
    expect(view({ ...response, positions: [], liquid: '1000000' }).empty).toBe(false);
  });
});
