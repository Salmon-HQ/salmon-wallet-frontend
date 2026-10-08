import { describe, expect, it, vi } from 'vitest';
import { skrBlocks } from './skrBlocks';

const t = (key: string) => key;

describe('skrBlocks', () => {
  const summary = [{ key: 'liquid', label: 'l', value: 'v' }];
  const history = [{ key: 'h-1', label: 'd', value: '+1 SKR' }];
  const refresh = vi.fn();
  const chart = {
    data: [{ timestamp: 1, price: 0.016 }],
    selectedPeriod: '1M' as const,
    onPeriodChange: vi.fn(),
    loading: false,
    error: false,
  };

  it('is the facts, the price chart, then the rewards', () => {
    expect(
      skrBlocks({ state: 'ready', summary, history, refresh, chart }, t).map((b) => b.key)
    ).toEqual(['facts', 'price-title', 'price', 'history-title', 'history']);
  });

  it('explains an empty history in its place', () => {
    const blocks = skrBlocks({ state: 'ready', summary, history: [], refresh, chart }, t);
    expect(blocks[4]).toMatchObject({ kind: 'state', props: { title: 'skr.history.empty' } });
  });

  it('has the loading, error and empty states', () => {
    expect(
      skrBlocks({ state: 'loading', summary: [], history: [], refresh, chart }, t)[0]!.kind
    ).toBe('skeleton');
    expect(
      skrBlocks({ state: 'error', summary: [], history: [], refresh, chart }, t)[0]
    ).toMatchObject({
      props: { tone: 'error', testID: 'skr-error', retryLabel: 'actions.retry' },
    });
    expect(
      skrBlocks({ state: 'empty', summary: [], history: [], refresh, chart }, t)[0]
    ).toMatchObject({
      props: { tone: 'empty', title: 'skr.empty.title', body: 'skr.empty.body' },
    });
  });
});

describe('the price chart', () => {
  it("is the token screen's chart, fed with SKR's price", () => {
    const chart = {
      data: [{ timestamp: 1, price: 0.016 }],
      selectedPeriod: '1M' as const,
      onPeriodChange: vi.fn(),
      loading: false,
      error: false,
    };
    const blocks = skrBlocks(
      { state: 'ready', summary: [], history: [], refresh: vi.fn(), chart },
      (key: string) => key
    );

    expect(blocks.find((b) => b.key === 'price')).toEqual({
      kind: 'chart',
      key: 'price',
      props: chart,
    });
  });
});
