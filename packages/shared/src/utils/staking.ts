/**
 * What the wallet has staked, as the rows Assets draws under its tokens and
 * the USD the Home total adds (spec 038). Rows are `Token`s so the token
 * list's own row renders them; their `address` is a fixed key, not a mint.
 */
import type {
  SkrStakeResponse,
  StakeAccount,
  StakeAccountsResponse,
} from '../api/services/staking';
import type { Token } from '../types/ui';
import type { FactsCardRow } from '../types/ui/facts-card';
import { getShortAddress } from './address';
import { formatTokenAmountSignificant } from './formatting';

const SOL_DECIMALS = 9;

export const STAKED_SOL_KEY = 'staked-sol';
export const STAKED_SKR_KEY = 'staked-skr';

/** Base units (string) → UI amount. Precise to ~15 significant digits. */
const toUi = (baseUnits: bigint, decimals: number) => Number(baseUnits) / 10 ** decimals;

const row = (
  address: string,
  name: string,
  symbol: string,
  uiAmount: number,
  price: number | null,
  logo: string | undefined
): Token => ({
  address,
  name,
  symbol,
  logo,
  uiAmount,
  price: price ?? undefined,
  usdBalance: price === null ? null : uiAmount * price,
});

export interface StakingSummary {
  /** Staked SOL, then staked SKR; only what is staked. */
  tokens: Token[];
  /** USD of what could be priced; never a guess. */
  stakedUsd: number;
}

export function stakingSummary({
  stakes,
  skr,
  labels,
  logos = {},
}: {
  stakes: StakeAccountsResponse | undefined;
  skr: SkrStakeResponse | undefined;
  labels: { sol: string; skr: string };
  /**
   * Logos by symbol from the wallet's liquid tokens: the fallback when a read
   * carries no logo of its own (an older backend).
   */
  logos?: Record<string, string | undefined>;
}): StakingSummary {
  const tokens: Token[] = [];
  const lamports = (stakes?.data ?? []).reduce((sum, a) => sum + BigInt(a.lamports), 0n);
  if (lamports > 0n) {
    tokens.push(
      row(
        STAKED_SOL_KEY,
        labels.sol,
        'SOL',
        toUi(lamports, SOL_DECIMALS),
        stakes!.usdPrice,
        stakes!.logo ?? logos.SOL
      )
    );
  }
  const staked = (skr?.positions ?? []).reduce((sum, p) => sum + BigInt(p.staked), 0n);
  if (staked > 0n) {
    tokens.push(
      row(
        STAKED_SKR_KEY,
        labels.skr,
        'SKR',
        toUi(staked, skr!.decimals),
        skr!.usdPrice,
        skr!.logo ?? logos.SKR
      )
    );
  }
  const stakedUsd = tokens.reduce((sum, t) => sum + (t.usdBalance ?? 0), 0);
  return { tokens, stakedUsd };
}

/** One stake account as the detail screen's facts card (spec 038). */
export interface StakeAccountCard {
  key: string;
  title: string;
  rows: FactsCardRow[];
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

const sol = (lamports: string) =>
  `${formatTokenAmountSignificant(toUi(BigInt(lamports), SOL_DECIMALS))} SOL`;

/**
 * Each stake account: titled by its validator's published name, else its vote
 * address, then its amount, state and the reward of each recent epoch.
 */
export function stakeAccountCards(accounts: StakeAccount[], t: Translate): StakeAccountCard[] {
  return accounts.map((account) => ({
    key: account.address,
    title:
      account.validator?.name ?? getShortAddress(account.voter) ?? t('staking.detail.undelegated'),
    rows: [
      { key: 'amount', label: t('staking.detail.amount'), value: sol(account.lamports) },
      {
        key: 'state',
        label: t('staking.detail.state'),
        value: t(`staking.state.${account.state}`),
      },
      ...account.rewards.map((reward) => ({
        key: `reward-${reward.epoch}`,
        label: t('staking.detail.epoch_reward', { epoch: reward.epoch }),
        value: `+${sol(reward.lamports)}`,
      })),
    ],
  }));
}
