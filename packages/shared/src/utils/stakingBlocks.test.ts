import { describe, expect, it, vi } from 'vitest';
import { stakeAccountsBlocks, stakingSectionBlocks } from './stakingBlocks';
import type { Token } from '../types/ui';

const t = (key: string) => key;
const token: Token = { address: 'staked-sol', name: 'Staked SOL', symbol: 'SOL', uiAmount: 1 };

describe('stakingSectionBlocks', () => {
  it('is the title, then a token row per thing staked', () => {
    const onPress = vi.fn();
    expect(stakingSectionBlocks({ tokens: [token], onPress, hiddenBalance: true }, t)).toEqual([
      { kind: 'label', key: 'title', props: { variant: 'title', children: 'staking.title' } },
      {
        kind: 'token',
        key: 'staked-sol',
        props: {
          testID: 'staking-row-staked-sol',
          token,
          onPress,
          hiddenBalance: true,
          blockchain: 'solana',
        },
      },
    ]);
  });

  it('is nothing when nothing is staked', () => {
    expect(stakingSectionBlocks({ tokens: [] }, t)).toEqual([]);
  });

  it('leaves a row that leads nowhere on this device without a press', () => {
    const blocks = stakingSectionBlocks(
      { tokens: [token], onPress: vi.fn(), canPress: () => false },
      t
    );
    expect(blocks[1]).toMatchObject({ props: { onPress: undefined } });
  });
});

describe('stakeAccountsBlocks', () => {
  const card = { key: 'E5zH', title: 'Salmon Wallet', rows: [] };

  it('is a facts card per stake account', () => {
    expect(stakeAccountsBlocks({ state: 'ready', cards: [card], onRetry: vi.fn() }, t)).toEqual([
      {
        kind: 'facts',
        key: 'E5zH',
        props: { testID: 'stake-account-E5zH', title: 'Salmon Wallet', rows: [] },
      },
    ]);
  });

  it('waits with skeletons, says when empty, and offers a retry on failure', () => {
    const onRetry = vi.fn();
    expect(stakeAccountsBlocks({ state: 'loading', cards: [], onRetry }, t)[0]!.kind).toBe(
      'skeleton'
    );
    expect(stakeAccountsBlocks({ state: 'empty', cards: [], onRetry }, t)[0]).toMatchObject({
      kind: 'state',
      props: { tone: 'empty', title: 'staking.detail.empty', testID: 'stake-accounts-empty' },
    });
    expect(stakeAccountsBlocks({ state: 'error', cards: [], onRetry }, t)[0]).toMatchObject({
      kind: 'state',
      props: {
        tone: 'error',
        onRetry,
        retryLabel: 'actions.retry',
        testID: 'stake-accounts-error',
      },
    });
  });
});
