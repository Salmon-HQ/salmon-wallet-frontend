/**
 * useSolanaPayTransactionRequest — paying a merchant that builds the
 * transaction (spec 043, data-model.md §MerchantPaymentState).
 *
 * The link names the merchant; this hook asks it for its label and icon,
 * posts the user's address, checks the transaction it gets back, previews it
 * as a dApp transaction, and hands core's confirmation screen a received
 * proposal. Every decision lives here, so the twins only draw the sheet this
 * returns. Lint-blocked for Powerups: it reaches core's received door.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import bs58 from 'bs58';
import type { Address, Blockhash } from '@solana/kit';
import {
  fetchMerchantDetails,
  fetchMerchantTransaction,
  SOLANA_PAY_ERROR_KEY,
  TransactionRequestError,
  type MerchantDetails,
  type TransactionRequestLink,
  type TransactionRequestRefusal,
} from '../blockchain/solana/transaction-request';
import { prepareMerchantTransaction } from '../blockchain/solana/transaction-request-checks';
import type { SolanaAccount } from '../blockchain/solana/SolanaAccount';
import { SolanaOutcomeUnknownError } from '../blockchain/solana/confirm';
import { useRequestReceivedSignature } from '../core/confirmation/received';
import {
  SignatureRequestCancelledError,
  type ReceivedTransactionProposal,
} from '../core/confirmation/types';
import {
  loadSolanaTransactionApprovalDetails,
  previewSolanaApprovalEffects,
} from '../utils/dapp-approval';
import { dappTransactionDisplay, dappTransactionGate } from '../utils/dapp-transaction-display';
import { formatBaseUnits } from '../utils/formatting';
import { isSignableSolanaAccount } from '../utils/account';
import type { BlockchainAccount } from '../types/blockchain';
import type { TransactionEffects } from '../blockchain/solana/simulation-types';
import type { SolanaNetworkId } from '../types/blockchain';
import type { DAppSignAndSendTransactionRequest } from '../types/dapp-approval';
import type {
  SolanaPayRequestPropsBase,
  SolanaPayRequestSheetPropsBase,
} from '../types/ui/solana-pay-request-sheet';
import { useAccountsContext } from '../contexts/AccountsContext';
import { applySymbols } from './useSolanaTransactionApproval';
import { useTokenCatalog } from './useTokenCatalog';

export interface MerchantIdentity {
  domain: string;
  label?: string;
  icon?: string | null;
}

export type MerchantPaymentState =
  | { phase: 'idle' }
  | { phase: 'refused'; reason: TransactionRequestRefusal; merchant: MerchantIdentity }
  | { phase: 'loadingDetails'; merchant: MerchantIdentity }
  | { phase: 'loadingTransaction'; merchant: MerchantIdentity }
  | { phase: 'preparing'; merchant: MerchantIdentity }
  | { phase: 'reviewing'; merchant: MerchantIdentity }
  | {
      phase: 'failed';
      reason: TransactionRequestRefusal;
      merchant: MerchantIdentity;
      merchantMessage?: string;
    }
  /** Core did not open the review (another one is open, …): its own copy key. */
  | { phase: 'failed'; errorKey: string; merchant: MerchantIdentity }
  | { phase: 'done' };

export interface UseSolanaPayTransactionRequestParams {
  /** The account that pays: the active one. */
  account: BlockchainAccount | null | undefined;
  /** Its name, shown on the review's wallet row. */
  accountName?: string;
}

export interface UseSolanaPayTransactionRequestResult {
  state: MerchantPaymentState;
  /** What the merchant sheet draws; hidden while core's review is up. */
  sheet: SolanaPayRequestSheetPropsBase;
  start: (link: TransactionRequestLink) => void;
  /** Leave the flow: aborts what is in flight, signs nothing. */
  close: () => void;
}

const SOL_DECIMALS = 9;

function sheetPhase(state: MerchantPaymentState): SolanaPayRequestSheetPropsBase['phase'] | null {
  switch (state.phase) {
    case 'loadingDetails':
    case 'loadingTransaction':
      return 'contacting';
    case 'preparing':
      return 'preparing';
    case 'failed':
    case 'refused':
      return 'failed';
    default:
      return null;
  }
}

/**
 * When the user pays the fee, the SOL held must cover it and whatever else the
 * preview shows leaving. The simulated change already contains the fee when
 * the user pays it, so the need is the larger of the two. A balance that
 * cannot be read blocks nothing: the network refuses an unpayable fee anyway.
 */
async function lacksSolForFee(
  wallet: SolanaAccount,
  signer: string,
  feeLamports: bigint,
  effects: TransactionEffects | null
): Promise<boolean> {
  const leaving = effects?.kind === 'effects' ? -effects.sol.lamports : 0n;
  const needed = leaving > feeLamports ? leaving : feeLamports;
  try {
    const { value } = await wallet
      .getRpc()
      .getBalance(signer as Address, { commitment: 'confirmed' })
      .send();
    return BigInt(value) < needed;
  } catch {
    return false;
  }
}

/** Tells two builds of one payment apart, even within the same millisecond. */
let buildCount = 0;

/** Failures a second try can cure: the merchant or the network, never the transaction. */
const RETRYABLE: ReadonlySet<TransactionRequestRefusal> = new Set([
  'unreachable',
  'merchantError',
  'unreadable',
  'networkUnavailable',
  'unexpected',
]);

/** What `fetch` throws when the request never got an answer: Hermes, Chrome, Safari. */
const FETCH_FAILED = /network request failed|failed to fetch|load failed/i;

/**
 * A bug in the wallet's own code, told apart from its network calls failing:
 * the engine's own error types, except the TypeError a failed `fetch` throws.
 */
function isWalletFault(error: unknown): boolean {
  if (error instanceof TypeError) return !FETCH_FAILED.test(error.message);
  return (
    error instanceof ReferenceError || error instanceof RangeError || error instanceof SyntaxError
  );
}

/**
 * Every failure as a refusal. The merchant's requests only ever throw
 * refusals, so anything else came from the wallet: its own network calls
 * (blockhash, lookup tables, fees), or a fault in its code, which must not
 * pass for a network outage.
 */
function asRefusal(error: unknown): TransactionRequestError {
  if (error instanceof TransactionRequestError) return error;
  if (isWalletFault(error)) {
    console.error('[useSolanaPayTransactionRequest] Unexpected failure:', error);
    return new TransactionRequestError('unexpected');
  }
  return new TransactionRequestError('networkUnavailable');
}

function identity(details: MerchantDetails): MerchantIdentity {
  return { domain: details.domain, label: details.label, icon: details.iconToRender };
}

export function useSolanaPayTransactionRequest({
  account,
  accountName,
}: UseSolanaPayTransactionRequestParams): UseSolanaPayTransactionRequestResult {
  const { t } = useTranslation();
  const requestReceived = useRequestReceivedSignature();
  const [state, setState] = useState<MerchantPaymentState>({ phase: 'idle' });
  const attemptRef = useRef<AbortController | null>(null);
  /** Where a retry resumes, when a second try can cure the failure. */
  const retryRef = useRef<{ link: TransactionRequestLink; details: MerchantDetails | null } | null>(
    null
  );

  const solanaAccount: SolanaAccount | null =
    account && isSignableSolanaAccount(account) ? account : null;
  const networkId = solanaAccount?.network?.id as SolanaNetworkId | undefined;
  // The preview names tokens from the verified catalogue, as the dApp review does.
  const { tokens } = useTokenCatalog({ networkId, enabled: !!solanaAccount });
  const catalogRef = useRef(new Map<string, string>());
  useEffect(() => {
    catalogRef.current = new Map(tokens.map((token) => [token.address, token.symbol]));
  }, [tokens]);

  useEffect(() => () => attemptRef.current?.abort(), []);

  const close = useCallback(() => {
    attemptRef.current?.abort();
    attemptRef.current = null;
    retryRef.current = null;
    setState({ phase: 'idle' });
  }, []);

  /**
   * POST → checks → preview → the proposal core reviews. Run once per
   * attempt; `onPosted` moves the sheet to "preparing" once the merchant
   * answered.
   */
  const buildProposal = useCallback(
    async (
      wallet: SolanaAccount,
      network: SolanaNetworkId,
      link: TransactionRequestLink,
      details: MerchantDetails,
      signal: AbortSignal,
      onPosted: () => void
    ): Promise<ReceivedTransactionProposal | null> => {
      const signer = wallet.getReceiveAddress();
      const rpc = wallet.getRpc();

      const build = async (onAnswer: () => void): Promise<ReceivedTransactionProposal | null> => {
        const response = await fetchMerchantTransaction(link, signer, { signal });
        if (signal.aborted) return null;
        onAnswer();

        const prepared = await prepareMerchantTransaction(rpc, signer, response.transaction);
        if (signal.aborted) return null;
        const request: DAppSignAndSendTransactionRequest = {
          id: `solana-pay-${Date.now()}-${(buildCount += 1)}`,
          method: 'signAndSendTransaction',
          params: {
            message: prepared.message,
            transaction: bs58.encode(new Uint8Array(Buffer.from(prepared.wire, 'base64'))),
          },
        };
        // The review opens only once the preview answered: the merchant
        // controls the bytes, so "still simulating" is never signable.
        const [approval, rawEffects] = await Promise.all([
          loadSolanaTransactionApprovalDetails(wallet, request),
          previewSolanaApprovalEffects(wallet, request),
        ]);
        if (signal.aborted) return null;
        const effects = applySymbols(rawEffects, (mint) => catalogRef.current.get(mint));
        const gate = dappTransactionGate({ effects, effectsLoading: false, parsingError: null });
        const short =
          !prepared.sponsored &&
          (await lacksSolForFee(wallet, signer, BigInt(approval.feeLamports ?? 0), effects));
        if (signal.aborted) return null;
        const { label } = details;
        const display = {
          ...dappTransactionDisplay(
            {
              origin: details.domain,
              signingAccount: { name: accountName, address: signer },
              effects,
              effectsLoading: false,
              feeSol:
                approval.feeLamports == null
                  ? null
                  : formatBaseUnits(BigInt(approval.feeLamports), SOL_DECIMALS),
              transactionCount: 1,
              parsingError: null,
              requester: { name: label, icon: details.iconToRender, domain: details.domain },
              message: response.message,
              feePayer: prepared.feePayer,
            },
            t
          ),
          title: t('solanaPay.reviewTitle'),
          pendingTitle: t('solanaPay.paying', { label }),
          receipt: { title: t('solanaPay.receiptTitle') },
          // A payment the network would reject only spends the fee: it cannot be
          // confirmed at all, rather than held (dApps keep the hold).
          requiresHold: gate.requiresHold && effects?.kind !== 'transaction-would-fail',
          ...(effects?.kind === 'transaction-would-fail' ? { confirmDisabled: true } : {}),
          ...(short
            ? { confirmDisabled: true, warning: { title: t('solanaPay.notEnoughSolForFee') } }
            : {}),
        };
        return {
          id: request.id as string,
          source: 'received',
          networkId: network,
          transaction: prepared.wire,
          signer,
          display,
          pending: { kind: 'send' },
          // The merchant's blockhash lives about a minute; asked on the active
          // network right before the press signs.
          isStale: async () => {
            const { value } = await rpc
              .isBlockhashValid(prepared.lifetime as Blockhash, { commitment: 'confirmed' })
              .send();
            return !value;
          },
          // A stale payment is asked for again (the POST, not the GET), checked
          // and previewed as the first one was. A failure says why; only a
          // flow closed meanwhile reads as expired.
          refresh: async () => {
            let next: ReceivedTransactionProposal | null;
            try {
              next = await build(() => undefined);
            } catch (error) {
              throw asRefusal(error);
            }
            if (!next) throw new TransactionRequestError('expired');
            return next;
          },
        };
      };

      return build(onPosted);
    },
    [accountName, t]
  );

  /** One attempt from `details` (or from the GET when they are not known yet). */
  const attempt = useCallback(
    (link: TransactionRequestLink, known: MerchantDetails | null) => {
      attemptRef.current?.abort();
      retryRef.current = null;
      if (!solanaAccount || !networkId) {
        setState({ phase: 'refused', reason: 'watchOnly', merchant: { domain: link.host } });
        return;
      }
      const controller = new AbortController();
      attemptRef.current = controller;
      const { signal } = controller;
      // Every step re-checks: a closed sheet must not be reopened by a late answer.
      const update = (next: MerchantPaymentState) => {
        if (!signal.aborted) setState(next);
      };
      let details = known;
      let merchant: MerchantIdentity = details ? identity(details) : { domain: link.host };

      const run = async () => {
        if (!details) {
          update({ phase: 'loadingDetails', merchant });
          details = await fetchMerchantDetails(link, { signal });
          // A closed sheet ends the flow: no further request leaves the device.
          if (signal.aborted) return;
          merchant = identity(details);
        }
        update({ phase: 'loadingTransaction', merchant });
        const proposal = await buildProposal(solanaAccount, networkId, link, details, signal, () =>
          update({ phase: 'preparing', merchant })
        );
        if (!proposal) return;

        update({ phase: 'reviewing', merchant });
        try {
          await requestReceived(proposal);
        } catch (error) {
          // Backing out, or an unknown outcome the host already showed, ends
          // the flow quietly; core refusing to open the review says why.
          if (
            error instanceof SignatureRequestCancelledError ||
            error instanceof SolanaOutcomeUnknownError
          ) {
            update({ phase: 'idle' });
          } else {
            update({
              phase: 'failed',
              errorKey: error instanceof Error ? error.message : String(error),
              merchant,
            });
          }
          return;
        }
        update({ phase: 'done' });
      };

      run().catch((error: unknown) => {
        if (signal.aborted) return;
        const { reason, merchantMessage } = asRefusal(error);
        // A retry repeats only the request that failed: the GET when the
        // details never came, the POST otherwise.
        retryRef.current = RETRYABLE.has(reason) ? { link, details } : null;
        update({
          phase: 'failed',
          reason,
          merchant,
          ...(merchantMessage ? { merchantMessage } : {}),
        });
      });
    },
    [solanaAccount, networkId, buildProposal, requestReceived]
  );

  const start = useCallback((link: TransactionRequestLink) => attempt(link, null), [attempt]);
  const retry = useCallback(() => {
    const resume = retryRef.current;
    if (resume) attempt(resume.link, resume.details);
  }, [attempt]);

  const sheet = useMemo<SolanaPayRequestSheetPropsBase>(() => {
    const phase = sheetPhase(state);
    const merchant = 'merchant' in state ? state.merchant : { domain: '' };
    const failed = state.phase === 'failed' || state.phase === 'refused';
    return {
      visible: phase !== null,
      merchant,
      phase: phase ?? 'contacting',
      error: !failed
        ? null
        : 'errorKey' in state
          ? { key: state.errorKey }
          : {
              key: SOLANA_PAY_ERROR_KEY[state.reason],
              merchantMessage: 'merchantMessage' in state ? state.merchantMessage : undefined,
            },
      onRetry:
        state.phase === 'failed' && 'reason' in state && RETRYABLE.has(state.reason)
          ? retry
          : undefined,
      onClose: close,
    };
  }, [state, close, retry]);

  return { state, sheet, start, close };
}

/**
 * One payment for one link, as the Send recipient step mounts it: starts on
 * mount, pays from the active account (named on the review), and reports how
 * it ended. Returns what the merchant sheet draws, so each twin only renders.
 */
export function useSolanaPayRequest({
  link,
  account,
  onDone,
  onCancel,
}: SolanaPayRequestPropsBase): SolanaPayRequestSheetPropsBase {
  const [accounts] = useAccountsContext();
  const { state, sheet, start, close } = useSolanaPayTransactionRequest({
    account,
    accountName: accounts.activeAccount?.name,
  });
  // `start` changes with the account; the payment starts once per link.
  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  }, [start]);
  const runningRef = useRef(false);
  const endedRef = useRef(false);

  // Start and abort in one effect, so StrictMode's second run starts again
  // the attempt its cleanup aborted.
  useEffect(() => {
    startRef.current(link);
    return close;
  }, [link, close]);

  useEffect(() => {
    // The first render's `idle` is before the start, not a way out of it.
    if (state.phase !== 'idle') runningRef.current = true;
    if (!runningRef.current || endedRef.current) return;
    if (state.phase === 'done') {
      endedRef.current = true;
      onDone();
    } else if (state.phase === 'idle') {
      endedRef.current = true;
      onCancel();
    }
  }, [state.phase, onDone, onCancel]);

  return sheet;
}
