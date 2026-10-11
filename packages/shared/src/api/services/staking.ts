/**
 * Staking reads (specs 038/039; backend specs 020/021). Read-only: neither
 * endpoint builds a transaction. Amounts arrive as base-unit strings.
 */
import { apiClient } from '../client';

export type StakeState = 'activating' | 'active' | 'deactivating' | 'inactive';

/** One SOL stake account the wallet manages. */
export interface StakeAccount {
  address: string;
  /** Everything the account holds, in lamports. */
  lamports: string;
  /** What is delegated, in lamports; null when never delegated. */
  delegatedLamports: string | null;
  voter: string | null;
  /** What the validator published on chain, if anything. */
  validator: { name: string; iconUrl: string | null } | null;
  activationEpoch: number | null;
  deactivationEpoch: number | null;
  state: StakeState;
  /** Newest first. */
  rewards: { epoch: number; lamports: string; postBalance: string }[];
}

export interface StakeAccountsResponse {
  epoch: number;
  /** USD per SOL, or null when no quote could be had. */
  usdPrice: number | null;
  /** The staked token's logo, from the backend's token catalog; absent from an older backend. */
  logo?: string | null;
  data: StakeAccount[];
}

/** One SKR staking position. */
export interface SkrPosition {
  address: string;
  staked: string;
  earned: string;
  guardian: {
    pool: string;
    name: string | null;
    commissionBps: number | null;
    active: boolean | null;
  };
  unstaking: { amount: string; withdrawableAt: number } | null;
  /** Epoch ms of the position's oldest known transaction, or null. */
  stakedSince: number | null;
  /** Newest first; `at` in epoch ms. */
  history: { at: number; earned: string }[];
}

export interface SkrStakeResponse {
  mint: string;
  decimals: number;
  sharePrice: string;
  cooldownSeconds: number;
  /** Annual rate as a fraction (0.151 = 15.1%), or null until a week of records. */
  apy: number | null;
  /** USD per SKR, or null. */
  usdPrice: number | null;
  /** The staked token's logo, from the backend's token catalog; absent from an older backend. */
  logo?: string | null;
  /** SKR outside staking, in base units. */
  liquid: string;
  /** Everything staked in the program, base units; absent from an older backend. */
  totalStaked?: string;
  /** The SKR payout schedule on chain, epoch ms; absent from an older backend. */
  payouts?: { intervalSeconds: number; lastAt: number; nextAt: number } | null;
  /** The first share-price record the history counts from, epoch ms. */
  historySince?: number | null;
  positions: SkrPosition[];
}

const TIMEOUT = 15000;

export async function getStakeAccounts(
  networkId: string,
  address: string
): Promise<StakeAccountsResponse> {
  const { data } = await apiClient.get<StakeAccountsResponse>(
    `/v1/${networkId}/account/${address}/stakes`,
    { timeout: TIMEOUT }
  );
  return data;
}

/** SKR staking exists on mainnet only. */
export async function getSkrStake(owner: string): Promise<SkrStakeResponse> {
  const { data } = await apiClient.get<SkrStakeResponse>('/v1/solana-mainnet/skr/stake', {
    params: { owner },
    timeout: TIMEOUT,
  });
  return data;
}
