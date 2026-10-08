import { describe, expect, it, vi } from 'vitest';
import { skrBlocks } from './skrBlocks';

const t = (key: string) => key;

describe('skrBlocks', () => {
  const summary = [{ key: 'liquid', label: 'l', value: 'v' }];
  const history = [{ key: 'h-1', label: 'd', value: '+1 SKR' }];
  const refresh = vi.fn();

  it('is the facts, the rewards title and the rewards', () => {
    expect(skrBlocks({ state: 'ready', summary, history, refresh }, t).map((b) => b.key)).toEqual([
      'facts',
      'history-title',
      'history',
    ]);
  });

  it('explains an empty history in its place', () => {
    const blocks = skrBlocks({ state: 'ready', summary, history: [], refresh }, t);
    expect(blocks[2]).toMatchObject({ kind: 'state', props: { title: 'skr.history.empty' } });
  });

  it('has the loading, error and empty states', () => {
    expect(skrBlocks({ state: 'loading', summary: [], history: [], refresh }, t)[0]!.kind).toBe(
      'skeleton'
    );
    expect(skrBlocks({ state: 'error', summary: [], history: [], refresh }, t)[0]).toMatchObject({
      props: { tone: 'error', testID: 'skr-error', retryLabel: 'actions.retry' },
    });
    expect(skrBlocks({ state: 'empty', summary: [], history: [], refresh }, t)[0]).toMatchObject({
      props: { tone: 'empty', title: 'skr.empty.title', body: 'skr.empty.body' },
    });
  });
});
