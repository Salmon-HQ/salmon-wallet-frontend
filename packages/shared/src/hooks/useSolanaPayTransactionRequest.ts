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
import {
  fetchMerchantDetails,
  fetchMerchantTransaction,
  TransactionRequestError,
  type TransactionRequestLink,
  type TransactionRequestRefusal,
} from '../blockchain/solana/transaction-request';
import { prepareMerchantTransaction } from '../blockchain/solana/transaction-request-checks';
import type { SolanaAccount } from '../blockchain/solana/SolanaAccount';
import { useRequestReceivedSignature } from '../core/confirmation/received';
import { SignatureRequestCancelledError } from '../core/confirmation/types';
import {
  loadSolanaTransactionApprovalDetails,
  previewSolanaApprovalEffects,
} from '../utils/dapp-approval';
import { dappTransactionDisplay, dappTransactionGate } from '../utils/dapp-transaction-display';
import { formatBaseUnits } from '../utils/formatting';
import { isSignableSolanaAccount } from '../utils/account';
import type { BlockchainAccount } from '../types/blockchain';
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

export function useSolanaPayTransactionRequest({
  account,
  accountName,
}: UseSolanaPayTransactionRequestParams): UseSolanaPayTransactionRequestResult {
  const { t } = useTranslation();
  const requestReceived = useRequestReceivedSignature();
  const [state, setState] = useState<MerchantPaymentState>({ phase: 'idle' });
  const attemptRef = useRef<AbortController | null>(null);

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
    setState({ phase: 'idle' });
  }, []);

  const start = useCallback(
    (link: TransactionRequestLink) => {
      attemptRef.current?.abort();
      if (!solanaAccount || !networkId) {
        setState({ phase: 'refused', reason: 'watchOnly', merchant: { domain: link.host } });
        return;
      }
      const attempt = new AbortController();
      attemptRef.current = attempt;
      const { signal } = attempt;
      // Every step re-checks: a closed sheet must not be reopened by a late answer.
      const update = (next: MerchantPaymentState) => {
        if (!signal.aborted) setState(next);
      };
      let merchant: MerchantIdentity = { domain: link.host };

      const run = async () => {
        update({ phase: 'loadingDetails', merchant });
        const details = await fetchMerchantDetails(link, { signal });
        // A closed sheet ends the flow: no further request leaves the device.
        if (signal.aborted) return;
        merchant = { domain: details.domain, label: details.label, icon: details.iconToRender };
        update({ phase: 'loadingTransaction', merchant });

        const signer = solanaAccount.getReceiveAddress();
        const response = await fetchMerchantTransaction(link, signer, { signal });
        if (signal.aborted) return;
        update({ phase: 'preparing', merchant });

        const prepared = await prepareMerchantTransaction(
          solanaAccount.getRpc(),
          signer,
          response.transaction
        );
        if (signal.aborted) return;
        const request: DAppSignAndSendTransactionRequest = {
          id: `solana-pay-${Date.now()}`,
          method: 'signAndSendTransaction',
          params: {
            message: prepared.message,
            transaction: bs58.encode(new Uint8Array(Buffer.from(prepared.wire, 'base64'))),
          },
        };
        // The review opens only once the preview answered: the merchant
        // controls the bytes, so "still simulating" is never signable.
        const [approval, rawEffects] = await Promise.all([
          loadSolanaTransactionApprovalDetails(solanaAccount, request),
          previewSolanaApprovalEffects(solanaAccount, request),
        ]);
        if (signal.aborted) return;
        const effects = applySymbols(rawEffects, (mint) => catalogRef.current.get(mint));
        const gate = dappTransactionGate({ effects, effectsLoading: false, parsingError: null });
        const label = details.label;
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
          requiresHold: gate.requiresHold,
        };

        update({ phase: 'reviewing', merchant });
        try {
          await requestReceived({
            id: request.id as string,
            source: 'received',
            networkId,
            transaction: prepared.wire,
            signer,
            display,
            pending: { kind: 'send' },
          });
        } catch {
          // ponytail: every way out of the review (back, busy, an unknown
          // outcome the host already showed) ends the flow quietly.
          update({ phase: 'idle' });
          return;
        }
        update({ phase: 'done' });
      };

      run().catch((error: unknown) => {
        if (error instanceof SignatureRequestCancelledError) return;
        const reason = error instanceof TransactionRequestError ? error.reason : 'unreachable';
        update({
          phase: 'failed',
          reason,
          merchant,
          ...(error instanceof TransactionRequestError && error.merchantMessage
            ? { merchantMessage: error.merchantMessage }
            : {}),
        });
      });
    },
    [solanaAccount, networkId, accountName, requestReceived, t]
  );

  const sheet = useMemo<SolanaPayRequestSheetPropsBase>(() => {
    const phase = sheetPhase(state);
    const merchant = 'merchant' in state ? state.merchant : { domain: '' };
    return {
      visible: phase !== null,
      merchant,
      phase: phase ?? 'contacting',
      error:
        state.phase === 'failed' || state.phase === 'refused'
          ? {
              key: `solanaPay.errors.${state.reason}`,
              merchantMessage: state.phase === 'failed' ? state.merchantMessage : undefined,
            }
          : null,
      onClose: close,
    };
  }, [state, close]);

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
  const { state, sheet, start } = useSolanaPayTransactionRequest({
    account,
    accountName: accounts.activeAccount?.name,
  });
  const startedRef = useRef(false);
  const runningRef = useRef(false);
  const endedRef = useRef(false);

  useEffect(() => {
    // ponytail: one start per mount; a new link remounts the container.
    if (startedRef.current) return;
    startedRef.current = true;
    start(link);
  }, [link, start]);

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
