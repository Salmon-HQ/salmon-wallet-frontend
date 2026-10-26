/**
 * dApp approval views — the signing gate's contract.
 *
 * Every field here is what the wallet shows the user before a signature:
 * the requesting origin and its identity, the wallet-built message, the
 * transaction's effects and technical summary. The DOM renders it today; a
 * mobile dApp surface would read the same shape. Rendering never adds to or
 * subtracts from these fields — see `.claude/skills/security-context`.
 */
import type { TransactionEffects } from '../../blockchain/solana/simulation';

interface DAppApprovalBase {
  origin: string;
  appName?: string;
  appIcon?: string;
  disabled?: boolean;
  loading?: boolean;
  onApprove: () => void | Promise<void>;
  onReject: () => void;
}

/** The account a signature comes from: its name, when it has one, and its address. */
export interface SigningAccount {
  name?: string;
  address: string;
}

export interface DAppConnectApprovalViewPropsBase extends DAppApprovalBase {
  address?: string;
  showOriginWarning?: boolean;
}

export interface DAppSignMessageApprovalViewPropsBase extends DAppApprovalBase {
  /**
   * Shown so the user sees which of their accounts the site gets a signature
   * from. Absent only while no account can sign, when approval is disabled.
   */
  signingAccount?: SigningAccount;
  messageText: string;
  /** Raw message bytes, as received from the dApp. Enables the tx-lookalike guard
   * and, when `requiredSigners` is also set, OCMS content parsing. */
  data?: number[];
  /** Base58 required-signer addresses. Presence marks this as an OCMS
   * `solana:signOffchainMessage` request rather than a legacy raw `sign`. */
  requiredSigners?: string[];
}

export interface SiwsFields {
  domain: string;
  address: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  resources?: string[];
}

export interface DAppSignInApprovalViewPropsBase extends DAppApprovalBase {
  /** Wallet-built SIWS fields (`prepareSignInMessage(...).fields`); null when the
   * request was structurally invalid and could not be prepared. */
  siws: SiwsFields | null;
  /** The exact SIWS message text the wallet will sign. */
  messageText: string;
  /** dApp claimed a domain different from the real origin — approval is blocked. */
  domainMismatch: boolean;
  requestedDomain?: string;
  /** PR#93 `useOffchainMessage`: the message will be signed in an OCMS envelope. */
  isOffchainMessage?: boolean;
}

export interface DAppTransactionApprovalViewPropsBase extends DAppApprovalBase {
  /** Shown so the user sees which of their accounts signs. Absent while none can. */
  signingAccount?: SigningAccount;
  requestSummary: string;
  /** Pre-signature effect preview. `null` while it is still being simulated. */
  effects: TransactionEffects | null;
  effectsLoading: boolean;
  feeSol: string | null;
  /** v1 priority fee in SOL. Absent/`null` for legacy/v0 or when the message sets none. */
  priorityFeeSol?: string | null;
  instructionCount: number | null;
  feePayer: string | null;
  recentBlockhash: string | null;
  /**
   * Transactions in the request. Above 1, the fee, instruction count, fee
   * payer and blockhash describe only the first, and the view says so.
   */
  transactionCount?: number;
  parsingError: string | null;
  /**
   * Set when the request names a network other than the one the wallet is
   * on. The wallet never switches networks on a site's word, so the request
   * is shown against the active network and cannot be approved.
   */
  networkMismatch?: { requested: string; active: string } | null;
}

export interface TransactionEffectsCardPropsBase {
  /** `null` while the preview is still running. */
  effects: TransactionEffects | null;
  loading: boolean;
}
