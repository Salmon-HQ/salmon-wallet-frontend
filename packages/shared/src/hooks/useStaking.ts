/**
 * useStaking — what the wallet has staked, for Assets' Staking section and
 * the Home total (spec 038). Both Homes read it once; the SKR Powerup reads
 * the same `skr` query (spec 039).
 *
 * A failed read shows nothing and adds nothing: staking is extra, and a
 * stake read that fails must not take the token list or the total with it.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useCallback, useMemo } from 'react';

import { getSkrStake, getStakeAccounts } from '../api/services/staking';
import type { SkrStakeResponse, StakeAccountsResponse } from '../api/services/staking';
import { getBlockchainFromNetworkId } from '../config/blockchains';
import { queryKeys } from '../query/keys';
import type { NetworkId } from '../types/blockchain';
import type { Token } from '../types/ui';
import { stakeAccountCards, stakingSummary, type StakeAccountCard } from '../utils/staking';

// Stake amounts and rewards move once an epoch (about two days).
const STALE_MS = 5 * 60 * 1000;

export interface UseStakingParams {
  publicKey: string | undefined;
  networkId: string | undefined;
  /** Logos by symbol from the liquid tokens (`SOL`, `SKR`). */
  logos?: Record<string, string | undefined>;
}

export interface UseStakingResult {
  /** The Staking section's rows; empty when nothing is staked or the reads failed. */
  tokens: Token[];
  /** USD of what is staked and priced. */
  stakedUsd: number;
  stakeAccounts: StakeAccountsResponse | undefined;
  skr: SkrStakeResponse | undefined;
}

export function useStaking({ publicKey, networkId, logos }: UseStakingParams): UseStakingResult {
  const { t } = useTranslation();
  const onSolana = !!networkId && getBlockchainFromNetworkId(networkId) === 'solana';
  const stakes = useStakeAccounts(onSolana ? publicKey : undefined, networkId);
  const skr = useSkrStake(networkId === 'solana-mainnet' ? publicKey : undefined);

  const logosKey = JSON.stringify(logos ?? {});
  const summary = useMemo(
    () =>
      stakingSummary({
        stakes: stakes.data,
        skr: skr.data,
        labels: { sol: t('staking.staked_sol'), skr: t('staking.staked_skr') },
        logos,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stakes.data, skr.data, t, logosKey]
  );

  return { ...summary, stakeAccounts: stakes.data, skr: skr.data };
}

/**
 * A wallet's total with what it has staked: the one sum Home's balance and
 * each card of the wallets screen (`useWalletTotals`) show, so they agree.
 */
export const withStakes = (usdTotal: number | undefined, stakedUsd: number) =>
  usdTotal === undefined ? undefined : usdTotal + stakedUsd;

/**
 * Home's staking, once for both Homes: the Staking section's rows, and the
 * total with what is staked added. Logos come from the liquid tokens.
 */
export function useHomeStaking({
  publicKey,
  networkId,
  tokens,
  usdTotal,
}: Pick<UseStakingParams, 'publicKey' | 'networkId'> & {
  tokens: readonly { symbol: string; logo?: string }[];
  usdTotal: number | undefined;
}): { tokens: Token[]; totalWithStakes: number | undefined } {
  const logos = useMemo(
    () => Object.fromEntries(tokens.map((token) => [token.symbol, token.logo])),
    [tokens]
  );
  const staking = useStaking({ publicKey, networkId, logos });
  return {
    tokens: staking.tokens,
    totalWithStakes: withStakes(usdTotal, staking.stakedUsd),
  };
}

/** The SOL stake accounts `address` manages on `networkId`. Disabled without an address. */
export const stakeAccountsQuery = (address: string | undefined, networkId: string | undefined) => ({
  queryKey: queryKeys.stakeAccounts({
    address: address ?? '',
    networkId: (networkId ?? 'solana-mainnet') as NetworkId,
  }),
  queryFn: () => getStakeAccounts(networkId as string, address as string),
  enabled: !!address && !!networkId,
  staleTime: STALE_MS,
});

function useStakeAccounts(address: string | undefined, networkId: string | undefined) {
  return useQuery(stakeAccountsQuery(address, networkId));
}

export interface UseStakeAccountsScreenResult {
  state: 'loading' | 'error' | 'empty' | 'ready';
  cards: StakeAccountCard[];
  refresh: () => Promise<void>;
}

/** The stake accounts detail screen, on both apps (spec 038). */
export function useStakeAccountsScreen({
  publicKey,
  networkId,
}: Pick<UseStakingParams, 'publicKey' | 'networkId'>): UseStakeAccountsScreenResult {
  const { t } = useTranslation();
  const query = useStakeAccounts(publicKey, networkId);
  const cards = useMemo(
    () => (query.data ? stakeAccountCards(query.data.data, t) : []),
    [query.data, t]
  );
  const state = query.data
    ? cards.length > 0
      ? 'ready'
      : 'empty'
    : query.isError
      ? 'error'
      : 'loading';
  const { refetch } = query;
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);
  return { state, cards, refresh };
}

/** The owner's SKR position (mainnet). Disabled without an owner. */
export const skrStakeQuery = (owner: string | undefined) => ({
  queryKey: queryKeys.skrStake({ owner: owner ?? '' }),
  queryFn: () => getSkrStake(owner as string),
  enabled: !!owner,
  staleTime: STALE_MS,
});

export function useSkrStake(owner: string | undefined) {
  return useQuery(skrStakeQuery(owner));
}
