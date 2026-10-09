import { describe, expect, it, vi } from 'vitest';
import type { KitBlock } from '../../types/ui/block-list';
import { skrBlocks, type SkrScreenInput } from './skrBlocks';
import type { SkrView } from './skrView';

const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${JSON.stringify(options)}` : key;

const view: SkrView = {
  empty: false,
  apy: '15.10%',
  staked: { value: '46,045.71', caption: '≈ $746.86' },
  earned: { value: '+6,045.71', caption: '≈ $98.06' },
  available: { value: '0.00', caption: '≈ $0.00' },
  unstaking: null,
  guardians: [
    { key: 'DPJ5', name: 'Solana Mobile Guardian', commission: '0% commission', active: true },
  ],
  perDay: { value: '≈ +19.05', caption: '≈ $0.31' },
  days: 260,
  earnedTotal: '+6,045.71 SKR',
  history: [{ key: 'h-1', date: '2026-10-08', value: '+41.00 SKR', caption: '$0.67' }],
  totalStaked: 5_026_970_696.86,
};
const chart = {
  data: [{ timestamp: 1, price: 0.016 }],
  selectedPeriod: '1M' as const,
  onPeriodChange: vi.fn(),
  loading: false,
  error: false,
};
const input = (over: Partial<SkrScreenInput> = {}): SkrScreenInput => ({
  state: 'ready',
  view,
  market: {
    logo: 'https://img/skr.png',
    price: '$0.01622',
    change: { label: '−4.20% · 1M', tone: 'negative' },
    totalSupply: 10_644_670_846,
    circulatingSupply: 7_144_670_823,
  },
  chart,
  refresh: vi.fn(),
  ...over,
});
const find = (blocks: readonly KitBlock[], key: string): KitBlock | undefined => {
  for (const block of blocks) {
    if (block.key === key) return block;
    if (block.kind === 'card') {
      const inner = find(block.blocks, key);
      if (inner) return inner;
    }
  }
  return undefined;
};

describe('skrBlocks', () => {
  it('is the header, the stake card, daily, rewards, then About SKR', () => {
    expect(skrBlocks(input(), t).map((b) => b.key)).toEqual([
      'header',
      'stake',
      'daily-title',
      'daily',
      'rewards-title',
      'h-1',
      'about-title',
      'price',
      'supply',
    ]);
  });

  it('opens the stake card on the staked amount, large, then earned and available', () => {
    const blocks = skrBlocks(input(), t);

    expect(find(blocks, 'staked')).toMatchObject({
      kind: 'stats',
      props: { items: [{ value: '46,045.71', unit: 'SKR', size: 'hero', caption: '≈ $746.86' }] },
    });
    expect(find(blocks, 'split')).toMatchObject({
      props: {
        items: [
          { key: 'earned', value: '+6,045.71', tone: 'positive' },
          { key: 'available', value: '0.00' },
        ],
      },
    });
  });

  it('shows each guardian sunk into the card, with its status as a pill', () => {
    expect(find(skrBlocks(input(), t), 'guardian-DPJ5')).toMatchObject({
      kind: 'row',
      props: {
        tone: 'ink',
        title: 'Solana Mobile Guardian',
        subtitle: '0% commission',
        pill: { tone: 'success', dot: true, label: 'skr.guardian.active' },
      },
    });
  });

  it('puts the rate on the header as a pill, and leaves it off when unknown', () => {
    expect(find(skrBlocks(input(), t), 'header')).toMatchObject({
      props: { pill: { label: 'skr.apy:{"value":"15.10%"}', tone: 'accent', icon: 'Percent' } },
    });
    const noRate = skrBlocks(input({ view: { ...view, apy: null, perDay: null } }), t);
    expect(find(noRate, 'header')).not.toHaveProperty('props.pill');
  });

  it('drops the daily section when neither the estimate nor the days are known', () => {
    const keys = skrBlocks(input({ view: { ...view, perDay: null, days: null } }), t).map(
      (b) => b.key
    );
    expect(keys).not.toContain('daily');
    expect(keys).not.toContain('daily-title');
  });

  it("shows the program's staked share of circulating SKR as a bar", () => {
    expect(find(skrBlocks(input(), t), 'staked-share')).toMatchObject({
      kind: 'progress',
      props: { value: 5_026_970_696.86 / 7_144_670_823 },
    });
  });

  it('keeps the supply card without the staked figures from an older backend', () => {
    const blocks = skrBlocks(input({ view: { ...view, totalStaked: null } }), t);
    expect(find(blocks, 'supply')).toBeDefined();
    expect(find(blocks, 'staked-share')).toBeUndefined();
  });

  it('adds the unstaking amount and its date to the stake card', () => {
    const blocks = skrBlocks(
      input({ view: { ...view, unstaking: { value: '5.00', withdrawable: '2026-10-10' } } }),
      t
    );
    expect(find(blocks, 'unstaking')).toMatchObject({
      props: { items: [{ value: '5.00' }, { value: '2026-10-10' }] },
    });
  });

  it('explains an empty history in its place', () => {
    const blocks = skrBlocks(input({ view: { ...view, history: [] } }), t);
    expect(find(blocks, 'history-empty')).toMatchObject({
      kind: 'state',
      props: { title: 'skr.history.empty' },
    });
  });

  it("draws the token screen's own chart for the price", () => {
    expect(find(skrBlocks(input(), t), 'chart')).toEqual({
      kind: 'chart',
      key: 'chart',
      props: chart,
    });
  });

  it('has the loading, error and empty states', () => {
    expect(skrBlocks(input({ state: 'loading' }), t)[0]!.kind).toBe('skeleton');
    expect(skrBlocks(input({ state: 'error' }), t)[0]).toMatchObject({
      props: { tone: 'error', testID: 'skr-error', retryLabel: 'actions.retry' },
    });
    expect(skrBlocks(input({ state: 'empty' }), t)[0]).toMatchObject({
      props: { tone: 'empty', title: 'skr.empty.title', body: 'skr.empty.body' },
    });
  });
});
