/**
 * useSolanaTransactionApproval
 *
 * Everything a dApp transaction-approval screen needs to describe a request:
 * the structural details (fee, instruction count, fee payer, blockhash) and the
 * effect preview (what the transaction would do to the approving account's
 * balances, previewed before signing).
 *
 * The two are separate queries on purpose. The structural details come back in
 * one RPC call; the preview needs a simulation plus two account reads and is
 * far slower, and a screen that waited for both would show nothing at all for
 * as long as the slower one takes.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  loadSolanaTransactionApprovalDetails,
  previewSolanaApprovalEffects,
} from '../utils/dapp-approval';
import type { SolanaTransactionApprovalDetails } from '../utils/dapp-approval';
import { useJupiterTokenList } from './useJupiterTokenList';
import type { ResolveSymbolFn, TransactionEffects } from '../blockchain/solana';
import type { SolanaAccount } from '../blockchain/solana';
import type { DAppTransactionRequest } from '../types/dapp-approval';
import type { SwapNetworkId } from '../types/swap';

const LAMPORTS_PER_SOL = 1_000_000_000;

export interface UseSolanaTransactionApprovalParams {
  account: SolanaAccount | null | undefined;
  request: DAppTransactionRequest | null | undefined;
  /** Ticker lookup for the mints in the preview. Unresolved mints render as addresses. */
  resolveSymbol?: ResolveSymbolFn;
}

export interface UseSolanaTransactionApprovalResult {
  details: SolanaTransactionApprovalDetails | null;
  /** The fee in SOL, ready to render, or `null` when it is not known yet. */
  feeSol: string | null;
  /** Set when the transaction could not be decoded at all. Blocks approval. */
  parsingError: string | null;
  /** `null` only while the preview is still running. */
  effects: TransactionEffects | null;
  effectsLoading: boolean;
}

/**
 * Fills in the tickers a preview could not resolve on its own.
 *
 * Applied to the finished result rather than passed into the simulation, so a
 * token list that arrives after the preview still names the tokens — and a
 * token list that never arrives leaves the mint addresses in place instead of
 * holding the preview back.
 *
 * @param effects - The preview, or `null` while it is still running.
 * @param resolveSymbol - Ticker lookup. Unresolved mints keep `symbol: null`.
 */
export function applySymbols(
  effects: TransactionEffects | null,
  resolveSymbol: ResolveSymbolFn
): TransactionEffects | null {
  if (effects?.kind !== 'effects') return effects;

  return {
    ...effects,
    tokens: effects.tokens.map((token) =>
      token.symbol ? token : { ...token, symbol: resolveSymbol(token.mint) ?? null }
    ),
    approvals: effects.approvals.map((grant) =>
      grant.symbol ? grant : { ...grant, symbol: resolveSymbol(grant.mint) ?? null }
    ),
  };
}

/** The message this request is about — the identity a preview is cached under. */
function requestFingerprint(request: DAppTransactionRequest | null | undefined): string {
  if (!request) return '';
  return request.method === 'signAllTransactions'
    ? (request.params?.messages ?? []).join(',')
    : (request.params?.message ?? '');
}

export function useSolanaTransactionApproval({
  account,
  request,
  resolveSymbol,
}: UseSolanaTransactionApprovalParams): UseSolanaTransactionApprovalResult {
  const fingerprint = requestFingerprint(request);
  const accountId = account?.getReceiveAddress() ?? '';
  const isEnabled = !!account && !!request && !!fingerprint;

  const details = useQuery({
    queryKey: ['dapp-approval-details', { accountId, fingerprint }],
    queryFn: () =>
      loadSolanaTransactionApprovalDetails(
        account as SolanaAccount,
        request as DAppTransactionRequest
      ),
    enabled: isEnabled,
    // A request is approved once. Retrying a decode that already failed only
    // delays telling the user the transaction is unreadable.
    retry: false,
    staleTime: Infinity,
  });

  const effects = useQuery({
    queryKey: ['dapp-approval-effects', { accountId, fingerprint }],
    queryFn: () =>
      previewSolanaApprovalEffects(
        account as SolanaAccount,
        request as DAppTransactionRequest,
        resolveSymbol ? { resolveSymbol } : {}
      ),
    enabled: isEnabled,
    // `previewSolanaApprovalEffects` reports its own failures as an
    // `undetermined` result rather than throwing, so a retry would only repeat
    // a call that already answered.
    retry: false,
    staleTime: Infinity,
  });

  // The catalog the swap screens already hold: cached, shared, and free here.
  // A preview never waits for it, and never fails because of it.
  const { tokens } = useJupiterTokenList({
    networkId: account?.network?.id as SwapNetworkId | undefined,
    enabled: isEnabled,
  });

  const namedEffects = useMemo(() => {
    if (resolveSymbol) return applySymbols(effects.data ?? null, resolveSymbol);
    const catalog = new Map(tokens.map((token) => [token.address, token.symbol]));
    return applySymbols(effects.data ?? null, (mint) => catalog.get(mint));
  }, [effects.data, resolveSymbol, tokens]);

  const feeSol = useMemo(() => {
    const feeLamports = details.data?.feeLamports;
    if (feeLamports == null) return null;
    return (feeLamports / LAMPORTS_PER_SOL).toFixed(9).replace(/0+$/, '').replace(/\.$/, '');
  }, [details.data?.feeLamports]);

  return {
    details: details.data ?? null,
    feeSol,
    parsingError: details.isError ? 'Failed to decode transaction' : null,
    effects: namedEffects,
    effectsLoading: isEnabled && effects.isPending,
  };
}
