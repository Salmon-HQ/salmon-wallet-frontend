/**
 * The signature request — how a Powerup reaches signing without touching it.
 *
 * `requestSignature(proposal)` parks the proposal in this context and returns
 * a promise. The platform mounts a host that renders core's confirmation
 * screen from the parked proposal; the user's confirm calls `signProposal`
 * with the active account and resolves the promise with the signature, their
 * cancel rejects it. One request at a time: a second request while one is
 * parked rejects immediately, so no Powerup can queue a confirmation behind
 * another.
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

export interface SignatureRequestContextValue {
  /** The parked request the host renders, or `null`. */
  pending: PendingSignatureRequest | null;
  /** The Powerup's side: park a proposal and wait for the user. */
  requestSignature: (proposal: TransactionProposal) => Promise<SignedResult>;
  /** The host's side. Each is a no-op without a parked request. */
  confirm: () => Promise<void>;
  cancel: () => void;
  /** Replace the parked proposal with a fresh build of the same intent. */
  refresh: () => Promise<void>;
}

const SignatureRequestContext = createContext<SignatureRequestContextValue | null>(null);

interface ParkedRequest {
  proposal: TransactionProposal;
  resolve: (result: SignedResult) => void;
  reject: (error: Error) => void;
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
  const parkedRef = useRef<ParkedRequest | null>(null);
  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  const settle = useCallback(() => {
    parkedRef.current = null;
    setPending(null);
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
      settle();
      parked.resolve(result);
    } catch (error) {
      // The parked request stays: the host shows the failure and the user
      // retries or backs out. The rejection reaches the Powerup only on cancel.
      const message = error instanceof Error ? error.message : String(error);
      setPending((prev) => (prev ? { ...prev, phase: 'review', error: message } : prev));
    }
  }, [settle, signProposal]);

  const cancel = useCallback(() => {
    const parked = parkedRef.current;
    if (!parked) return;
    settle();
    parked.reject(new SignatureRequestCancelledError());
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
    () => ({ pending, requestSignature, confirm, cancel, refresh }),
    [pending, requestSignature, confirm, cancel, refresh]
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
