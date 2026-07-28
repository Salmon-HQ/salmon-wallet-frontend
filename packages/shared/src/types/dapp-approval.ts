/**
 * Canonical types for dApp approval flows shared by web and extension.
 */

export interface DAppConnectRequest {
  id: string | number;
  method: 'connect';
  params?: Record<string, unknown>;
}

export interface DAppSignMessageRequest {
  id: string | number;
  method: 'sign';
  params?: {
    data?: number[];
    [key: string]: unknown;
  };
}

/**
 * Request for `solana:signOffchainMessage` (OCMS v1). Mirrors `DAppSignMessageRequest`'s
 * shape, but carries the required signers alongside the message bytes — OCMS's
 * domain-separated buffer is built from both, so the approval flow needs both to build
 * and preview the exact bytes that will be signed (see `buildOffchainMessageV1`).
 * `requiredSigners` are base58-encoded addresses, matching how every other identifier in
 * this file crosses the postMessage/bridge boundary as JSON.
 */
export interface DAppSignOffchainMessageRequest {
  id: string | number;
  method: 'signOffchain';
  params?: {
    data?: number[];
    requiredSigners?: string[];
    [key: string]: unknown;
  };
}

export interface DAppSignTransactionRequest {
  id: string | number;
  method: 'signTransaction';
  params?: {
    message?: string;
    network?: string;
    [key: string]: unknown;
  };
}

export interface DAppSignAllTransactionsRequest {
  id: string | number;
  method: 'signAllTransactions';
  params?: {
    messages?: string[];
    network?: string;
    [key: string]: unknown;
  };
}

export interface DAppSignAndSendTransactionRequest {
  id: string | number;
  method: 'signAndSendTransaction';
  params?: {
    message?: string;
    network?: string;
    options?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export type DAppTransactionRequest =
  | DAppSignTransactionRequest
  | DAppSignAllTransactionsRequest
  | DAppSignAndSendTransactionRequest;

export type DAppApprovalRequest =
  | DAppConnectRequest
  | DAppSignMessageRequest
  | DAppSignOffchainMessageRequest
  | DAppTransactionRequest;

export interface DAppConnectApprovalPayload {
  publicKey: string;
}

export interface DAppSignMessageApprovalPayload {
  signature: string;
  publicKey: string;
}

/**
 * Output shape for `solana:signOffchainMessage` (OCMS v1), field-name-compatible
 * with the Wallet Standard `SolanaSignOffchainMessageOutput` from PR#92 — but with
 * `signedOffchainMessage`/`signature` bs58-encoded strings instead of raw
 * `Uint8Array`, matching how every other payload in this file crosses the
 * postMessage/bridge boundary as JSON.
 */
export interface DAppSignOffchainMessageApprovalPayload {
  signedOffchainMessage: string;
  signature: string;
  signatureType: 'ed25519';
}

export interface DAppSignTransactionApprovalPayload {
  signature: string;
  publicKey: string;
}

export interface DAppSignAllTransactionsApprovalPayload {
  signatures: string[];
  publicKey: string;
}

export interface DAppSignAndSendTransactionApprovalPayload {
  signature: string;
}

export type DAppTransactionApprovalPayload =
  | DAppSignTransactionApprovalPayload
  | DAppSignAllTransactionsApprovalPayload
  | DAppSignAndSendTransactionApprovalPayload;
