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
 *
 * `requestFreshSignature` (spec 043) is the same request for a transaction
 * that needs co-signers the Powerup must never hold: core generates them,
 * hands the Powerup's build their public keys only, refuses a build whose
 * signers are not exactly the user and those keys, signs with them after the
 * user confirms, and drops them on every way out. It refuses before any key
 * exists unless the provider's `freshSigning` declares the Powerup and the
 * wallet is on devnet.
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
import type { KeyPairSigner } from '@solana/kit';
import { SolanaOutcomeUnknownError } from '../../blockchain/solana/confirm';
import { usePendingTransactionsOptional } from '../../contexts/PendingTransactionsContext';
import { signProposal as defaultSignProposal, type SignProposalFn } from '../signing';
import type { SolanaBroadcaster } from '../broadcast';
import { generateFreshSigners, MAX_FRESH_SIGNERS, signReadMessage } from '../signing/fresh-signers';
import { assertSolanaTransactionMatches, SolanaTransactionMismatchError } from '../verify';
import {
  FreshSignersRefusedError,
  NoSigningAccountError,
  SignatureRequestCancelledError,
  type FreshSignatureRequest,
  type FreshSignerKeys,
  type ReadAuthorization,
  type SignedResult,
  type TransactionProposal,
} from './types';

/** The one network fresh co-signers exist on (spec 043 FR-040). */
const FRESH_SIGNING_NETWORK = 'solana-devnet';

export type SignatureRequestPhase = 'review' | 'signing';

export interface PendingSignatureRequest {
  proposal: TransactionProposal;
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
  /**
   * The same request, for a transaction core co-signs with keys it generates
   * for it and discards (spec 043). Refused unless the provider declares the
   * Powerup and the wallet is on devnet.
   */
  requestFreshSignature: (request: FreshSignatureRequest) => Promise<SignedResult>;
  /** The host's side. Each is a no-op without a parked request. */
  confirm: () => Promise<void>;
  cancel: () => void;
  /** The receipt's one button: close the window and hand the Powerup back. */
  dismissReceipt: () => void;
  /** Replace the parked proposal with a fresh build of the same intent. */
  refresh: () => Promise<void>;
}

const SignatureRequestContext = createContext<SignatureRequestContextValue | null>(null);

function reportOutcome(proposal: TransactionProposal, success: boolean): void {
  try {
    // An async callback's rejection is caught here too, not left unhandled.
    void Promise.resolve(proposal.onOutcome?.(success)).catch(() => undefined);
  } catch {
    // The Powerup's bookkeeping never turns a signed transaction into a failure.
  }
}

interface ParkedRequest {
  proposal: TransactionProposal;
  resolve: (result: SignedResult) => void;
  reject: (error: Error) => void;
  /** Set once signed; the request resolves with it when the receipt is dismissed. */
  result?: SignedResult;
  /**
   * Sent, with no verdict: it may have landed, so it is never signed again,
   * and closing hands the Powerup this error instead of a plain cancel.
   */
  unresolved?: SolanaOutcomeUnknownError;
  /**
   * Core's fresh keys for this request. Never leaves this record; cleared on
   * success, on an unknown outcome and when the request settles.
   */
  fresh?: ParkedFresh;
}

interface ParkedFresh {
  signers: readonly KeyPairSigner[];
  /** Dropped as soon as it has signed the read message. */
  viewer?: KeyPairSigner;
  readAuthorization?: ReadAuthorization;
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
  /**
   * Which Powerups may ask for fresh co-signers, and the wallet's active
   * network. Absent: every `requestFreshSignature` is refused.
   */
  freshSigning?: { powerupIds: readonly string[]; networkId: string | null };
  children: ReactNode;
}

export function SignatureRequestProvider({
  account,
  signProposal = defaultSignProposal,
  freshSigning,
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
  const freshSigningRef = useRef(freshSigning);
  useEffect(() => {
    freshSigningRef.current = freshSigning;
  }, [freshSigning]);

  const settle = useCallback(() => {
    if (parkedRef.current) parkedRef.current.fresh = undefined;
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

  const requestFreshSignature = useCallback(
    async (request: FreshSignatureRequest): Promise<SignedResult> => {
      if (parkedRef.current) throw new Error('transaction.errors.confirmationBusy');
      const capability = freshSigningRef.current;
      if (!capability?.powerupIds.includes(request.powerupId)) {
        throw new FreshSignersRefusedError('undeclared');
      }
      if (
        request.networkId !== FRESH_SIGNING_NETWORK ||
        capability.networkId !== FRESH_SIGNING_NETWORK
      ) {
        throw new FreshSignersRefusedError('network');
      }
      const { count, viewer: wantsViewer = false } = request;
      if (
        !Number.isInteger(count) ||
        count < 0 ||
        count > MAX_FRESH_SIGNERS ||
        (wantsViewer && count !== 1)
      ) {
        throw new FreshSignersRefusedError('count');
      }
      const account = accountRef.current;
      if (!account) throw new NoSigningAccountError();

      // From here on the keys exist: every way out of this function either
      // parks them or lets them go with the local.
      let fresh: ParkedFresh | undefined = {
        signers: await generateFreshSigners(count),
        viewer: wantsViewer ? (await generateFreshSigners(1))[0] : undefined,
      };
      const keys: FreshSignerKeys = Object.freeze({
        freshSigners: Object.freeze(fresh.signers.map((signer) => String(signer.address))),
        ...(fresh.viewer ? { viewer: String(fresh.viewer.address) } : {}),
      });
      const feePayer = String(account.signer.address);
      // Core's own refresh: the same keys, the same check, so a rebuilt
      // proposal cannot name other signers than the first one did.
      const build = async (): Promise<TransactionProposal> => {
        const proposal = await request.build(keys);
        if (proposal.networkId !== request.networkId) {
          throw new SolanaTransactionMismatchError(
            `Transaction is built for ${proposal.networkId}, not ${request.networkId}`
          );
        }
        assertSolanaTransactionMatches(proposal.transaction, {
          feePayer,
          ...proposal.expect,
          coSigners: keys.freshSigners,
        });
        return { ...proposal, refresh: build };
      };

      let proposal: TransactionProposal;
      try {
        proposal = await build();
      } catch (error) {
        fresh = undefined;
        throw error;
      }
      // Another request may have parked while the build was in flight.
      if (parkedRef.current) {
        fresh = undefined;
        throw new Error('transaction.errors.confirmationBusy');
      }
      const parkedFresh = fresh;
      fresh = undefined;
      return new Promise<SignedResult>((resolve, reject) => {
        parkedRef.current = { proposal, resolve, reject, fresh: parkedFresh };
        setPending({ proposal, phase: 'review', error: null });
      });
    },
    []
  );

  const confirm = useCallback(async () => {
    const parked = parkedRef.current;
    if (!parked || parked.unresolved) return;
    setPending((prev) => (prev ? { ...prev, phase: 'signing', error: null } : prev));

    const signer = accountRef.current;
    if (!signer) {
      settle();
      parked.reject(new NoSigningAccountError());
      return;
    }
    const { fresh } = parked;
    // The wallet may have left devnet while the user was reading.
    if (fresh && freshSigningRef.current?.networkId !== FRESH_SIGNING_NETWORK) {
      settle();
      parked.reject(new FreshSignersRefusedError('network'));
      return;
    }

    let signed = false;
    try {
      let result: SignedResult;
      if (fresh) {
        // The viewer signs the one read message, after the user confirmed,
        // and is dropped at once (plan O3).
        if (fresh.viewer) {
          fresh.readAuthorization = await signReadMessage(fresh.viewer, fresh.signers[0].address);
          fresh.viewer = undefined;
        }
        const { signature } = await signProposal(signer, parked.proposal, fresh.signers);
        const { readAuthorization } = fresh;
        parked.fresh = undefined;
        result = readAuthorization ? { signature, readAuthorization } : { signature };
      } else {
        result = await signProposal(signer, parked.proposal);
      }
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
        parked.fresh = undefined;
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
  }, [settle, signProposal, pendingTransactions]);

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
    () => ({
      pending,
      receipt,
      requestSignature,
      requestFreshSignature,
      confirm,
      cancel,
      dismissReceipt,
      refresh,
    }),
    [
      pending,
      receipt,
      requestSignature,
      requestFreshSignature,
      confirm,
      cancel,
      dismissReceipt,
      refresh,
    ]
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

/**
 * A Powerup's entry point for a transaction that needs co-signers it must
 * never hold (spec 043): core generates, signs with and discards them.
 */
export function useRequestFreshSignature(): SignatureRequestContextValue['requestFreshSignature'] {
  return useSignatureRequestContext().requestFreshSignature;
}
