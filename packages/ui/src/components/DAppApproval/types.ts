export interface DAppConnectApprovalViewProps {
  origin: string;
  appName?: string;
  appIcon?: string;
  address?: string;
  disabled?: boolean;
  loading?: boolean;
  showOriginWarning?: boolean;
  onApprove: () => void | Promise<void>;
  onReject: () => void;
}

export interface DAppSignMessageApprovalViewProps {
  origin: string;
  appName?: string;
  appIcon?: string;
  messageText: string;
  /** Raw message bytes, as received from the dApp. Enables the tx-lookalike guard
   * and, when `requiredSigners` is also set, OCMS content parsing. */
  data?: number[];
  /** Base58 required-signer addresses. Presence marks this as an OCMS
   * `solana:signOffchainMessage` request rather than a legacy raw `sign`. */
  requiredSigners?: string[];
  disabled?: boolean;
  loading?: boolean;
  onApprove: () => void | Promise<void>;
  onReject: () => void;
}

export interface DAppSignInApprovalViewProps {
  origin: string;
  appName?: string;
  appIcon?: string;
  /** Wallet-built SIWS fields (`prepareSignInMessage(...).fields`); null when the
   * request was structurally invalid and could not be prepared. */
  siws: {
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
  } | null;
  /** The exact SIWS message text the wallet will sign. */
  messageText: string;
  /** dApp claimed a domain different from the real origin — approval is blocked. */
  domainMismatch: boolean;
  requestedDomain?: string;
  /** PR#93 `useOffchainMessage`: the message will be signed in an OCMS envelope. */
  isOffchainMessage?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onApprove: () => void | Promise<void>;
  onReject: () => void;
}

export interface DAppTransactionApprovalViewProps {
  origin: string;
  appName?: string;
  appIcon?: string;
  requestSummary: string;
  feeSol: string | null;
  instructionCount: number | null;
  feePayer: string | null;
  recentBlockhash: string | null;
  parsingError: string | null;
  disabled?: boolean;
  loading?: boolean;
  onApprove: () => void | Promise<void>;
  onReject: () => void;
}
