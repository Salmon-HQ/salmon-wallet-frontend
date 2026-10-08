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
const view = (r: SkrStakeResponse) => skrView(r, { t, formatValue, formatDate, now: NOW });

describe('skrView', () => {
  it("lays out the wallet's SKR: liquid, staked, earned, rate, guardian and how long", () => {
    expect(view(response).summary).toEqual([
      { key: 'liquid', label: 'skr.facts.liquid', value: '0 SKR' },
      { key: 'staked', label: 'skr.facts.staked', value: '46045.7 SKR · $746.86' },
      { key: 'earned', label: 'skr.facts.earned', value: '+6045.71 SKR · $98.06' },
      { key: 'apy', label: 'skr.facts.apy', value: '15.10%' },
      { key: 'guardian', label: 'skr.facts.guardian', value: 'Solana Mobile Guardian' },
      { key: 'commission', label: 'skr.facts.commission', value: '0%' },
      { key: 'since', label: 'skr.facts.since', value: 'skr.facts.days:{"count":260}' },
    ]);
  });

  it('lists what each recorded period earned, newest first', () => {
    expect(view(response).history).toEqual([
      { key: 'h-1791453600000', label: '2026-10-08', value: '+41 SKR · $0.67' },
      { key: 'h-1791280800000', label: '2026-10-06', value: '+41.09 SKR · $0.67' },
    ]);
  });

  it('says when an unstake can be withdrawn', () => {
    const unstaking = {
      ...response,
      positions: [
        {
          ...response.positions[0]!,
          unstaking: { amount: '5000000', withdrawableAt: Date.parse('2026-10-10T00:00:00Z') },
        },
      ],
    };

    expect(view(unstaking).summary).toEqual(
      expect.arrayContaining([
        { key: 'unstaking', label: 'skr.facts.unstaking', value: '5 SKR' },
        { key: 'withdrawable', label: 'skr.facts.withdrawable', value: '2026-10-10' },
      ])
    );
  });

  it('leaves out what is not known: rate, start, price', () => {
    const unknown = {
      ...response,
      apy: null,
      usdPrice: null,
      positions: [
        {
          ...response.positions[0]!,
          stakedSince: null,
          guardian: { ...response.positions[0]!.guardian, name: null },
        },
      ],
    };
    const keys = view(unknown).summary.map((row) => row.key);

    expect(keys).not.toContain('apy');
    expect(keys).not.toContain('since');
    expect(view(unknown).summary.find((r) => r.key === 'staked')!.value).toBe('46045.7 SKR');
    expect(view(unknown).summary.find((r) => r.key === 'guardian')!.value).toBe('DPJ5...Buqr');
  });

  it('is empty without SKR', () => {
    expect(view({ ...response, positions: [] }).empty).toBe(true);
    expect(view({ ...response, positions: [], liquid: '1000000' }).empty).toBe(false);
  });
});
