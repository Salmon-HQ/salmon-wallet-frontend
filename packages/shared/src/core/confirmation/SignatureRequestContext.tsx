/**
 * The signature request — how a Powerup reaches signing without touching it.
 *
 * `requestSignature(proposal)` parks the proposal in this context and returns
 * a promise. The platform mounts a host that renders core's confirmation
 * screen from the parked proposal; the user's confirm calls `signProposal`
 * with the active account, their cancel rejects the promise. One request at a
 * time: a second request while one is parked rejects immediately, so no
 * Powerup can queue a confirmation behind another.
 *
 * A signature does NOT end the request. Core keeps the window and shows the
 * receipt (`receipt`); the promise resolves only when the user dismisses it
 * (`dismissReceipt`), so the Powerup gets control back after the user has
 * read the outcome, not while they are still reading it (owner ruling,
 * 2026-09-11).
 *
 * The account is a prop of the provider, not of the request: the Powerup does
 * not choose who signs.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import isEqual from 'lodash-es/isEqual';
import { SolanaOutcomeUnknownError } from '../../blockchain/solana/confirm';
import { usePendingTransactionsOptional } from '../../contexts/PendingTransactionsContext';
import { usePhraseBackup } from '../../contexts/PhraseBackupContext';
import { signProposal as defaultSignProposal, type SignProposalFn } from '../signing';
import type { SolanaBroadcaster } from '../broadcast';
import { ReceivedSignatureContext } from './received';
import {
  NoSigningAccountError,
  SignatureRequestCancelledError,
  type AnyTransactionProposal,
  type ReceivedTransactionProposal,
  type SignedResult,
  type TransactionProposal,
} from './types';

export type SignatureRequestPhase = 'review' | 'signing';

export interface PendingSignatureRequest {
  /** A Powerup's proposal, or a received one from core's own flows (spec 043). */
  proposal: AnyTransactionProposal;
  phase: SignatureRequestPhase;
  /** The last failure to sign or refresh — a translation key. Cleared on retry. */
  error: string | null;
  /**
   * The last attempt may have landed (the chain could not be asked): signing
   * again would send a second transaction, so the only way out is to close.
   */
  unresolved?: boolean;
}

/** A signed proposal, waiting to be read: what the host's receipt renders. */
export interface SignatureRequestReceipt {
  proposal: AnyTransactionProposal;
  signature: string;
}

export interface SignatureRequestContextValue {
  /** The parked request the host renders, or `null`. */
  pending: PendingSignatureRequest | null;
  /** The signed outcome the host's receipt renders, or `null`. */
  receipt: SignatureRequestReceipt | null;
  /**
   * The Powerup's side: park a proposal and wait for the user. Resolves once
   * the user has dismissed the receipt of a signed transaction; rejects when
   * they back out of the confirmation.
   */
  requestSignature: (proposal: TransactionProposal) => Promise<SignedResult>;
  /** The host's side. Each is a no-op without a parked request. */
  confirm: () => Promise<void>;
  cancel: () => void;
  /** The receipt's one button: close the window and hand the Powerup back. */
  dismissReceipt: () => void;
  /** Replace the parked proposal with a fresh build of the same intent. */
  refresh: () => Promise<void>;
  /**
   * Rebuild a proposal that went stale. `true` when the rebuilt review shows
   * exactly what the user saw, so the press may go on to sign; otherwise the
   * review stays, with the rebuild's error or the note that it changed.
   */
  refreshStale: () => Promise<boolean>;
}

const SignatureRequestContext = createContext<SignatureRequestContextValue | null>(null);

function reportOutcome(proposal: AnyTransactionProposal, success: boolean): void {
  try {
    // An async callback's rejection is caught here too, not left unhandled.
    void Promise.resolve(proposal.onOutcome?.(success)).catch(() => undefined);
  } catch {
    // The Powerup's bookkeeping never turns a signed transaction into a failure.
  }
}

/**
 * Which door a request came in through. Recorded at parking and checked on
 * every proposal that later takes its place (a refresh) and again right
 * before signing, so a Powerup's proposal can never turn into a received one.
 */
type Door = 'powerup' | 'received';

/** A Powerup's proposal carries no `source`; a received one says so. */
function fitsDoor(proposal: AnyTransactionProposal, door: Door): boolean {
  return door === 'received'
    ? 'source' in proposal && proposal.source === 'received'
    : !('source' in proposal);
}

const PROPOSAL_KIND_ERROR = 'transaction.errors.proposalKind';
/** Shown when a stale proposal was rebuilt into something the user has not seen. */
const REFRESHED_NOTE = 'solanaPay.refreshed';

/**
 * The proposal as core holds it: every field read once, from a plain object,
 * into a frozen copy of core's own making. What is signed is this copy, so a
 * getter, a Proxy or a mutation of the caller's object after the door check
 * changes nothing. `null` when the object is not plain or does not fit `door`.
 */
function snapshotProposal(
  proposal: AnyTransactionProposal,
  door: Door
): AnyTransactionProposal | null {
  if (typeof proposal !== 'object' || proposal === null) return null;
  const prototype = Object.getPrototypeOf(proposal);
  if (prototype !== Object.prototype && prototype !== null) return null;
  if (!fitsDoor(proposal, door)) return null;

  const { transaction } = proposal;
  if (typeof transaction !== 'string') return null;
  const base = {
    id: proposal.id,
    networkId: proposal.networkId,
    display: proposal.display,
    expiresAt: proposal.expiresAt,
    isStale: proposal.isStale,
    pending: proposal.pending,
    onOutcome: proposal.onOutcome,
    transaction,
  };
  if (door === 'received') {
    const { signer, refresh } = proposal as ReceivedTransactionProposal;
    if (typeof signer !== 'string') return null;
    return Object.freeze({ ...base, source: 'received' as const, signer, refresh });
  }
  const { expect, refresh } = proposal as TransactionProposal;
  let copied: TransactionProposal['expect'];
  try {
    // The declaration decides what may be signed: a deep copy, JSON-shaped by contract.
    copied = JSON.parse(JSON.stringify(expect));
  } catch {
    return null;
  }
  return Object.freeze({ ...base, expect: copied, refresh });
}

interface ParkedRequest {
  proposal: AnyTransactionProposal;
  door: Door;
  resolve: (result: SignedResult) => void;
  reject: (error: Error) => void;
  /** Set once signed; the request resolves with it when the receipt is dismissed. */
  result?: SignedResult;
  /**
   * Sent, with no verdict: it may have landed, so it is never signed again,
   * and closing hands the Powerup this error instead of a plain cancel.
   */
  unresolved?: SolanaOutcomeUnknownError;
}

export interface SignatureRequestProviderProps {
  /**
   * The account that signs — the active one, or `null` when there is none or
   * it cannot sign. Read at confirm time, so a wallet switch mid-review is
   * honoured.
   */
  account: SolanaBroadcaster | null;
  /** Test seam: the signing function. Defaults to core's. */
  signProposal?: SignProposalFn;
  children: ReactNode;
}

export function SignatureRequestProvider({
  account,
  signProposal = defaultSignProposal,
  children,
}: SignatureRequestProviderProps) {
  const [pending, setPending] = useState<PendingSignatureRequest | null>(null);
  const [receipt, setReceipt] = useState<SignatureRequestReceipt | null>(null);
  const parkedRef = useRef<ParkedRequest | null>(null);
  const pendingTransactions = usePendingTransactionsOptional();
  const { requireBackup } = usePhraseBackup();
  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  const settle = useCallback(() => {
    parkedRef.current = null;
    setPending(null);
    setReceipt(null);
  }, []);

  const park = useCallback(
    (proposal: AnyTransactionProposal, door: Door) =>
      new Promise<SignedResult>((resolve, reject) => {
        const held = snapshotProposal(proposal, door);
        if (!held) {
          reject(new Error(PROPOSAL_KIND_ERROR));
          return;
        }
        if (parkedRef.current) {
          reject(new Error('transaction.errors.confirmationBusy'));
          return;
        }
        parkedRef.current = { proposal: held, door, resolve, reject };
        setPending({ proposal: held, phase: 'review', error: null });
      }),
    []
  );

  // The Powerup door: a proposal that claims to be received would skip the
  // declared-effects check, so it is refused here whatever its type says.
  // Core's own received flows come in through `ReceivedSignatureContext`.
  const requestSignature = useCallback(
    (proposal: TransactionProposal) => park(proposal, 'powerup'),
    [park]
  );
  const requestReceivedSignature = useCallback(
    (proposal: ReceivedTransactionProposal) => park(proposal, 'received'),
    [park]
  );

  const confirm = useCallback(async () => {
    const parked = parkedRef.current;
    if (!parked || parked.unresolved) return;
    // The last word before the key is used: the bytes must be of the kind
    // their door admits, whatever replaced them since.
    if (!fitsDoor(parked.proposal, parked.door)) {
      setPending((prev) =>
        prev ? { ...prev, phase: 'review', error: PROPOSAL_KIND_ERROR } : prev
      );
      return;
    }
    // A new wallet's first transaction waits on the phrase check (DEV-208);
    // left unconfirmed, the review stays open.
    if (!(await requireBackup())) return;
    // The wait above is long enough for anything to happen: the request must
    // still be this one, and still fit its door, when the key is used.
    if (parkedRef.current !== parked) return;
    if (!fitsDoor(parked.proposal, parked.door)) {
      setPending((prev) =>
        prev ? { ...prev, phase: 'review', error: PROPOSAL_KIND_ERROR } : prev
      );
      return;
    }
    setPending((prev) => (prev ? { ...prev, phase: 'signing', error: null } : prev));

    const signer = accountRef.current;
    if (!signer) {
      settle();
      parked.reject(new NoSigningAccountError());
      return;
    }

    let signed = false;
    try {
      // The path is chosen by the recorded door, never by the proposal. A
      // Powerup's keeps the two-argument call, whose default is its door.
      const result =
        parked.door === 'received'
          ? await signProposal(signer, parked.proposal, 'received')
          : await signProposal(signer, parked.proposal);
      signed = true;
      reportOutcome(parked.proposal, true);
      // Signing waited for the chain, so the banner reports the transaction as
      // done from the same moment the receipt shows — never "in progress"
      // beside it.
      const { pending: report, networkId } = parked.proposal;
      if (report) {
        pendingTransactions?.trackPendingTransaction({
          signature: result.signature,
          kind: report.kind,
          networkId,
          submittedAt: Date.now(),
          summary: report.summary,
          status: 'confirmed',
        });
      }
      // The request stays parked: the window now shows the receipt, and the
      // Powerup hears nothing until the user has closed it.
      parked.result = result;
      setPending(null);
      setReceipt({ proposal: parked.proposal, signature: result.signature });
    } catch (error) {
      if (error instanceof SolanaOutcomeUnknownError) {
        // It may have landed: the banner follows the signature until the
        // chain answers, and the host offers only a way out. Analytics hears
        // nothing, because neither outcome is known.
        parked.unresolved = error;
        const { pending: report, networkId } = parked.proposal;
        if (report) {
          pendingTransactions?.trackPendingTransaction({
            signature: error.signature,
            kind: report.kind,
            networkId,
            submittedAt: Date.now(),
            summary: report.summary,
          });
        }
        setPending((prev) =>
          prev ? { ...prev, phase: 'review', error: error.message, unresolved: true } : prev
        );
        return;
      }
      // A throw after signing is not a failed attempt: it was already reported.
      if (!signed) reportOutcome(parked.proposal, false);
      // The parked request stays: the host shows the failure and the user
      // retries or backs out. The rejection reaches the Powerup only on cancel.
      const message = error instanceof Error ? error.message : String(error);
      setPending((prev) => (prev ? { ...prev, phase: 'review', error: message } : prev));
    }
  }, [settle, signProposal, pendingTransactions, requireBackup]);

  const cancel = useCallback(() => {
    const parked = parkedRef.current;
    // Nothing backs out of a transaction that is already signed and away.
    if (!parked || parked.result) return;
    settle();
    parked.reject(parked.unresolved ?? new SignatureRequestCancelledError());
  }, [settle]);

  const dismissReceipt = useCallback(() => {
    const parked = parkedRef.current;
    const result = parked?.result;
    if (!parked || !result) return;
    settle();
    parked.resolve(result);
  }, [settle]);

  /** The parked proposal rebuilt in place; `null` when it was not (the error is shown). */
  const rebuild = useCallback(
    async (parked: ParkedRequest): Promise<AnyTransactionProposal | null> => {
      const refreshFn = parked.proposal.refresh;
      if (!refreshFn) return null;
      try {
        const next = await refreshFn();
        // The request may have been cancelled while the build was in flight.
        if (parkedRef.current !== parked) return null;
        // A rebuild keeps its door: a Powerup's refresh that returns a received
        // proposal would otherwise skip the declared-effects check.
        const held = snapshotProposal(next, parked.door);
        if (!held) {
          setPending((prev) => (prev ? { ...prev, error: PROPOSAL_KIND_ERROR } : prev));
          return null;
        }
        parked.proposal = held;
        setPending((prev) => (prev ? { ...prev, proposal: held, error: null } : prev));
        return held;
      } catch (error) {
        if (parkedRef.current !== parked) return null;
        const message = error instanceof Error ? error.message : String(error);
        setPending((prev) => (prev ? { ...prev, error: message } : prev));
        return null;
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    const parked = parkedRef.current;
    if (parked) await rebuild(parked);
  }, [rebuild]);

  const refreshStale = useCallback(async () => {
    const parked = parkedRef.current;
    if (!parked) return false;
    const seen = parked.proposal.display;
    const held = await rebuild(parked);
    if (!held) return false;
    if (isEqual(held.display, seen)) return true;
    // What the user reviewed is not what would be signed: they look again.
    setPending((prev) => (prev ? { ...prev, error: REFRESHED_NOTE } : prev));
    return false;
  }, [rebuild]);

  const value = useMemo(
    () => ({
      pending,
      receipt,
      requestSignature,
      confirm,
      cancel,
      dismissReceipt,
      refresh,
      refreshStale,
    }),
    [pending, receipt, requestSignature, confirm, cancel, dismissReceipt, refresh, refreshStale]
  );

  return (
    <SignatureRequestContext.Provider value={value}>
      <ReceivedSignatureContext.Provider value={requestReceivedSignature}>
        {children}
      </ReceivedSignatureContext.Provider>
    </SignatureRequestContext.Provider>
  );
}

/** The whole context — what a platform host reads. */
export function useSignatureRequestContext(): SignatureRequestContextValue {
  const value = useContext(SignatureRequestContext);
  if (!value) {
    throw new Error('useSignatureRequestContext must be used within a SignatureRequestProvider');
  }
  return value;
}

/** The Powerup's entry point: the one way to a signature. */
export function useRequestSignature(): SignatureRequestContextValue['requestSignature'] {
  return useSignatureRequestContext().requestSignature;
}
