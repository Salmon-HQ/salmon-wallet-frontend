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
import { usePendingTransactionsOptional } from '../../contexts/PendingTransactionsContext';
import { signProposal as defaultSignProposal, type SignProposalFn } from '../signing';
import type { SolanaBroadcaster } from '../broadcast';
import {
  NoSigningAccountError,
  SignatureRequestCancelledError,
  type SignedResult,
  type TransactionProposal,
} from './types';

export type SignatureRequestPhase = 'review' | 'signing';

export interface PendingSignatureRequest {
  proposal: TransactionProposal;
  phase: SignatureRequestPhase;
  /** The last failure to sign or refresh — a translation key. Cleared on retry. */
  error: string | null;
}

/** A signed proposal, waiting to be read: what the host's receipt renders. */
export interface SignatureRequestReceipt {
  proposal: TransactionProposal;
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
}

const SignatureRequestContext = createContext<SignatureRequestContextValue | null>(null);

interface ParkedRequest {
  proposal: TransactionProposal;
  resolve: (result: SignedResult) => void;
  reject: (error: Error) => void;
  /** Set once signed; the request resolves with it when the receipt is dismissed. */
  result?: SignedResult;
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
  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  const settle = useCallback(() => {
    parkedRef.current = null;
    setPending(null);
    setReceipt(null);
  }, []);

  const requestSignature = useCallback(
    (proposal: TransactionProposal) =>
      new Promise<SignedResult>((resolve, reject) => {
        if (parkedRef.current) {
          reject(new Error('transaction.errors.confirmationBusy'));
          return;
        }
        parkedRef.current = { proposal, resolve, reject };
        setPending({ proposal, phase: 'review', error: null });
      }),
    []
  );

  const confirm = useCallback(async () => {
    const parked = parkedRef.current;
    if (!parked) return;
    setPending((prev) => (prev ? { ...prev, phase: 'signing', error: null } : prev));

    const signer = accountRef.current;
    if (!signer) {
      settle();
      parked.reject(new NoSigningAccountError());
      return;
    }

    try {
      const result = await signProposal(signer, parked.proposal);
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
      // The parked request stays: the host shows the failure and the user
      // retries or backs out. The rejection reaches the Powerup only on cancel.
      const message = error instanceof Error ? error.message : String(error);
      setPending((prev) => (prev ? { ...prev, phase: 'review', error: message } : prev));
    }
  }, [settle, signProposal, pendingTransactions]);

  const cancel = useCallback(() => {
    const parked = parkedRef.current;
    // Nothing backs out of a transaction that is already signed and away.
    if (!parked || parked.result) return;
    settle();
    parked.reject(new SignatureRequestCancelledError());
  }, [settle]);

  const dismissReceipt = useCallback(() => {
    const parked = parkedRef.current;
    const result = parked?.result;
    if (!parked || !result) return;
    settle();
    parked.resolve(result);
  }, [settle]);

  const refresh = useCallback(async () => {
    const parked = parkedRef.current;
    const refreshFn = parked?.proposal.refresh;
    if (!parked || !refreshFn) return;
    try {
      const next = await refreshFn();
      // The request may have been cancelled while the build was in flight.
      if (parkedRef.current !== parked) return;
      parked.proposal = next;
      setPending((prev) => (prev ? { ...prev, proposal: next, error: null } : prev));
    } catch (error) {
      if (parkedRef.current !== parked) return;
      const message = error instanceof Error ? error.message : String(error);
      setPending((prev) => (prev ? { ...prev, error: message } : prev));
    }
  }, []);

  const value = useMemo(
    () => ({ pending, receipt, requestSignature, confirm, cancel, dismissReceipt, refresh }),
    [pending, receipt, requestSignature, confirm, cancel, dismissReceipt, refresh]
  );

  return (
    <SignatureRequestContext.Provider value={value}>{children}</SignatureRequestContext.Provider>
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
