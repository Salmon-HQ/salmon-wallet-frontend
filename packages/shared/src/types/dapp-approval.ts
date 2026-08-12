/**
 * Canonical types for dApp approval flows shared by web and extension.
 */

import type { SolanaSignInInputFields } from '../blockchain/solana/sign-in';

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

/**
 * Request for `solana:signIn` (Sign-In-With-Solana). Carries only the dApp's
 * `SolanaSignInInput` — the wallet builds the actual SIWS message from the real
 * requesting origin (see `blockchain/solana/sign-in.ts`), so no message text
 * crosses this boundary. All input fields are JSON-safe strings.
 */
export interface DAppSignInRequest {
  id: string | number;
  method: 'signIn';
  params?: {
    input?: SolanaSignInInputFields;
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
    /**
     * bs58-encoded FULL serialized transaction, including any signatures the dApp
     * already applied. Sent alongside `message` for `signAndSendTransaction` so
     * co-signer signatures survive the hop. Optional so a pending approval queued
     * by an older build still resolves via `message`.
     *
     * Enforced invariant: this transaction's embedded message MUST be byte-identical
     * to `message`, which is what the approval screen previews. The check runs in
     * `approveSolanaTransactionRequest` before the key is used, and a mismatch is
     * rejected without signing — otherwise a page could preview one transaction and
     * have a different one signed.
     */
    transaction?: string;
    network?: string;
    options?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export type DAppTransactionRequest =
  DAppSignTransactionRequest | DAppSignAllTransactionsRequest | DAppSignAndSendTransactionRequest;

export type DAppApprovalRequest =
  | DAppConnectRequest
  | DAppSignMessageRequest
  | DAppSignOffchainMessageRequest
  | DAppSignInRequest
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

/**
 * Output shape for `solana:signIn`, field-name-compatible with the Wallet
 * Standard `SolanaSignInOutput` (incl. PR#93's `signedMessageFormat`) — but with
 * bytes bs58-encoded and the account reduced to its base58 `address`, matching
 * how every other payload in this file crosses the postMessage/bridge boundary
 * as JSON. `signedMessage` is the exact signed bytes: raw UTF-8 SIWS text, or
 * the OCMS v1 envelope when `signedMessageFormat` is present.
 */
export interface DAppSignInApprovalPayload {
  address: string;
  signedMessage: string;
  signature: string;
  signatureType: 'ed25519';
  signedMessageFormat?: { kind: 'offchainMessage'; messageVersion: 1 };
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
