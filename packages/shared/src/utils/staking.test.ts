import { describe, expect, it } from 'vitest';
import { stakeAccountCards, stakingSummary } from './staking';
import type { SkrStakeResponse, StakeAccountsResponse } from '../api/services/staking';

// The recorded mainnet wallet (backend specs 020/021).
const stakes: StakeAccountsResponse = {
  epoch: 1052,
  usdPrice: 108.2,
  data: [
    {
      address: 'E5zHk2dnsnk6bL94BPe3svRczbT6WfZnmcQm3wVVEQRs',
      lamports: '1002513301',
      delegatedLamports: '1000847061',
      voter: 'Sa1HXZsn2u6p2dMLZGhfxtsRw7Jo32hF15yBghWJsCz',
      validator: { name: 'Salmon Wallet', iconUrl: null },
      activationEpoch: 1046,
      deactivationEpoch: null,
      state: 'active',
      rewards: [],
    },
  ],
};
const skr: SkrStakeResponse = {
  mint: 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3',
  decimals: 6,
  sharePrice: '1151142678',
  cooldownSeconds: 172800,
  apy: null,
  usdPrice: 0.01622,
  liquid: '0',
  positions: [
    {
      address: '7yFn',
      staked: '46045707120',
      earned: '6045707120',
      guardian: { pool: 'DPJ58', name: 'Solana Mobile Guardian', commissionBps: 0, active: true },
      unstaking: null,
      stakedSince: null,
      history: [],
    },
  ],
};
const labels = { sol: 'Staked SOL', skr: 'Staked SKR' };

describe('stakingSummary', () => {
  it('turns both reads into the rows the token list draws, and their USD total', () => {
    const { tokens, stakedUsd } = stakingSummary({ stakes, skr, labels });

    expect(tokens).toEqual([
      expect.objectContaining({
        address: 'staked-sol',
        name: 'Staked SOL',
        symbol: 'SOL',
        uiAmount: 1.002513301,
        price: 108.2,
        usdBalance: 1.002513301 * 108.2,
      }),
      expect.objectContaining({
        address: 'staked-skr',
        name: 'Staked SKR',
        symbol: 'SKR',
        uiAmount: 46045.70712,
        price: 0.01622,
        usdBalance: 46045.70712 * 0.01622,
      }),
    ]);
    expect(stakedUsd).toBeCloseTo(1.002513301 * 108.2 + 46045.70712 * 0.01622, 6);
  });

  it('adds every stake account and every position', () => {
    const two = {
      ...stakes,
      data: [stakes.data[0]!, { ...stakes.data[0]!, address: 'b', lamports: '500000000' }],
    };
    const { tokens } = stakingSummary({ stakes: two, skr: undefined, labels });

    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.uiAmount).toBeCloseTo(1.502513301, 9);
  });

  it('draws nothing for what is not staked, and counts nothing it cannot price', () => {
    const { tokens, stakedUsd } = stakingSummary({
      stakes: { ...stakes, data: [] },
      skr: { ...skr, usdPrice: null },
      labels,
    });

    expect(tokens.map((t) => t.address)).toEqual(['staked-skr']);
    expect(tokens[0]!.usdBalance).toBeNull();
    expect(stakedUsd).toBe(0);
  });

  it('is empty without reads', () => {
    expect(stakingSummary({ stakes: undefined, skr: undefined, labels })).toEqual({
      tokens: [],
      stakedUsd: 0,
    });
  });
});

describe('stakeAccountCards', () => {
  const t = (key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key;
  const account = {
    ...stakes.data[0]!,
    rewards: [
      { epoch: 1051, lamports: '169992', postBalance: '1002513301' },
      { epoch: 1050, lamports: '169163', postBalance: '1002343309' },
    ],
  };

  it('gives each stake account a card titled by its validator, with amount, state and rewards', () => {
    const [card] = stakeAccountCards([account], t);

    expect(card).toEqual({
      key: 'E5zHk2dnsnk6bL94BPe3svRczbT6WfZnmcQm3wVVEQRs',
      title: 'Salmon Wallet',
      rows: [
        { key: 'amount', label: 'staking.detail.amount', value: '1.00251 SOL' },
        { key: 'state', label: 'staking.detail.state', value: 'staking.state.active' },
        {
          key: 'reward-1051',
          label: 'staking.detail.epoch_reward:{"epoch":1051}',
          value: '+0.000169992 SOL',
        },
        {
          key: 'reward-1050',
          label: 'staking.detail.epoch_reward:{"epoch":1050}',
          value: '+0.000169163 SOL',
        },
      ],
    });
  });

  it('names an unnamed validator by its vote address, and an undelegated account plainly', () => {
    const [named, undelegated] = stakeAccountCards(
      [
        { ...account, validator: null },
        { ...account, address: 'x', voter: null, validator: null, state: 'inactive', rewards: [] },
      ],
      t
    );

    expect(named!.title).toBe('Sa1H...JsCz');
    expect(undelegated!.title).toBe('staking.detail.undelegated');
  });
});
