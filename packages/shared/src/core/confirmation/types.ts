/**
 * core/confirmation — the contract between a Powerup and the confirmation
 * screen core renders before anything is signed (spec 027 §2).
 *
 * A Powerup proposes; it never signs. The proposal carries the unsigned bytes
 * and everything the user must see to decide: what leaves and what arrives,
 * every fee as its own line, who routed it, and how long the quote holds.
 * Every string here is already in the user's language — the Powerup resolves
 * its own copy, core only lays it out.
 */
import type { SolanaNetworkId } from '../../types/blockchain';
import type { SwapReviewExchangeSide } from '../../types/swap';

/** One row of the confirmation's detail card. */
export interface ConfirmationRow {
  label: string;
  value: string;
  /** True while a refresh may change this value; fixed rows never set it. */
  pending?: boolean;
}

export interface ConfirmationWarning {
  title: string;
  body: string;
}

/** What the confirmation screen shows. */
export interface ProposalDisplay {
  /** The screen title, e.g. "Swap Review". */
  title: string;
  /** Sent → received graphic; the protagonist of an exchange. */
  exchange?: {
    send: SwapReviewExchangeSide;
    receive: SwapReviewExchangeSide;
  };
  /** Always-visible rows: the Salmon fee, the route's fee, slippage, minimum received. */
  rows: ConfirmationRow[];
  /** Rows folded behind the "Details" disclosure. */
  advancedRows?: ConfirmationRow[];
  /** Provider attribution rendered verbatim, e.g. "Powered by 0x". */
  attribution?: string;
  warning?: ConfirmationWarning;
  /** The wave wait's title while core signs and broadcasts, e.g. "Processing swap". */
  pendingTitle: string;
  /** Amounts and symbols only, e.g. `1.5 SOL → 210 USDC`. */
  pendingSubtitle?: string;
}

/**
 * An unsigned transaction and its rendering. `refresh` returns a new proposal
 * for the same intent — called when the quote expired before the user
 * confirmed, or when they ask for a fresh one.
 */
export interface TransactionProposal {
  /** Identity of this build: a new proposal from `refresh` has a new id. */
  id: string;
  networkId: SolanaNetworkId;
  /** Base64 unsigned transaction, wire format. */
  transaction: string;
  /** ISO timestamp after which the transaction must be rebuilt. */
  expiresAt?: string;
  refresh?: () => Promise<TransactionProposal>;
  display: ProposalDisplay;
}

export interface SignedResult {
  /** The confirmed signature. */
  signature: string;
}

/** The user backed out of the confirmation. */
export class SignatureRequestCancelledError extends Error {
  constructor() {
    super('transaction.errors.cancelled');
    this.name = 'SignatureRequestCancelledError';
  }
}

/** No signing account for the proposal's network, or a watch-only one. */
export class NoSigningAccountError extends Error {
  constructor() {
    super('transaction.errors.watchOnlyAccount');
    this.name = 'NoSigningAccountError';
  }
}
