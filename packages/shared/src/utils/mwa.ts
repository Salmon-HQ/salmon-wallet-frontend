import bs58 from 'bs58';
import type { TrustedApp } from '../types/trusted-app';
import type {
  DAppSignAllTransactionsRequest,
  DAppSignAndSendTransactionRequest,
} from '../types/dapp-approval';
import {
  getBase58Decoder,
  getTransactionDecoder,
  getTransactionEncoder,
  type Address,
  type SignatureBytes,
} from '@solana/kit';

/**
 * Mobile Wallet Adapter ↔ dApp approval translation (spec 036).
 *
 * MWA hands the wallet raw bytes and protocol identifiers; the approval and
 * signing path the extension already uses speaks bs58 messages and Salmon
 * network ids. These helpers convert between the two without touching keys.
 */

const MWA_NETWORKS: Record<string, 'solana-mainnet' | 'solana-devnet'> = {
  'solana:mainnet': 'solana-mainnet',
  'mainnet-beta': 'solana-mainnet',
  'solana:devnet': 'solana-devnet',
  devnet: 'solana-devnet',
};

/** MWA chain (or legacy cluster name) → Salmon network id; null when Salmon does not support it. */
export function mwaChainToNetworkId(
  chain: string | undefined
): 'solana-mainnet' | 'solana-devnet' | null {
  return (chain && MWA_NETWORKS[chain]) || null;
}

/**
 * Origin of the identity URI a dApp declares; null when missing or not http(s).
 * Trusted apps are keyed by origin, the same key the extension uses.
 */
export function mwaIdentityOrigin(identityUri: string | undefined): string | null {
  if (!identityUri) return null;
  try {
    const url = new URL(identityUri);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * Puts this wallet's signature into the dApp's wire transaction, keeping every
 * other signature the dApp already applied. MWA `sign_transactions` returns full
 * transactions, and rebuilding one from its message would drop co-signers.
 */
export function withSignature(wire: Uint8Array, signer: string, signatureBs58: string): Uint8Array {
  const tx = decodeWire(wire);
  if (!(signer in tx.signatures)) {
    throw new Error(`${signer} is not a required signer of this transaction`);
  }
  const signatures = { ...tx.signatures, [signer as Address]: bs58.decode(signatureBs58) as SignatureBytes };
  return new Uint8Array(getTransactionEncoder().encode({ ...tx, signatures }));
}

function decodeWire(wire: Uint8Array) {
  try {
    return getTransactionDecoder().decode(wire);
  } catch {
    throw new Error('The dApp sent bytes that are not a valid transaction');
  }
}

const encodedMessage = (wire: Uint8Array) => getBase58Decoder().decode(decodeWire(wire).messageBytes);

/** MWA `sign_transactions` payloads → the request the extension's approval path signs. */
export function toSignAllTransactionsRequest(
  id: string,
  wires: Uint8Array[]
): DAppSignAllTransactionsRequest {
  return { id, method: 'signAllTransactions', params: { messages: wires.map(encodedMessage) } };
}

/** Send options a dApp may attach to `sign_and_send_transactions`. */
export interface MwaSendOptions {
  minContextSlot?: number;
  commitment?: string;
  skipPreflight?: boolean;
  maxRetries?: number;
}

/**
 * One MWA `sign_and_send_transactions` payload → the extension's signAndSend request.
 * The full transaction travels with its message so co-signer signatures survive and
 * the approval path's what-you-see-is-what-you-sign check applies.
 */
export function toSignAndSendRequest(
  id: string,
  wire: Uint8Array,
  options: MwaSendOptions
): DAppSignAndSendTransactionRequest {
  return {
    id,
    method: 'signAndSendTransaction',
    params: {
      message: encodedMessage(wire),
      transaction: bs58.encode(wire),
      options: { ...options },
    },
  };
}

/** Fresh authorization token handed to a dApp as its MWA `auth_token`. */
export function newMwaAuthToken(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/** Storage form of a token, kept on the trusted app. */
export const encodeMwaAuthToken = (token: Uint8Array): string => bs58.encode(token);

/**
 * A request is authorized only while the user keeps trusting the dApp, for the
 * account it was shown, with the token it was given. Revoking the trusted app,
 * switching account or presenting another token all fail.
 */
export function isMwaAuthorizationValid(
  app: TrustedApp | undefined,
  address: string,
  authorizationScope: Uint8Array
): boolean {
  return (
    !!app?.authToken &&
    app.address === address &&
    app.authToken === encodeMwaAuthToken(authorizationScope)
  );
}

/** The four refusals the MWA wallet bridge can return. */
export type MwaFailReason =
  | 'USER_DECLINED'
  | 'TOO_MANY_PAYLOADS'
  | 'INVALID_SIGNATURES'
  | 'AUTHORIZATION_NOT_VALID';

/** Most transactions or messages Salmon accepts in one request. */
export const MWA_MAX_PAYLOADS = 10;

export interface MwaPrecheckInput {
  /** A connect request carries no token yet. */
  authorize: boolean;
  chain: string;
  identityUri?: string;
  authorizationScope?: Uint8Array;
  payloadCount?: number;
}

export interface MwaPrecheckContext {
  /** Active account's address, or null when it cannot sign (watch-only). */
  address: string | null;
  networkId: string | null;
  /** Trusted apps on the active network. */
  trustedApps: Record<string, TrustedApp>;
}

export type MwaPrecheck =
  | { ok: true; origin: string; networkId: string }
  | {
      ok: false;
      failReason: MwaFailReason;
      /** Set when the user should be told why before the dApp hears no. */
      reason?: 'network' | 'identity' | 'watch-only';
      requested?: string;
    };

/**
 * Everything a dApp request must pass before the user is asked anything:
 * a network Salmon is on, a declared identity, an account that can sign,
 * a live authorization, and a payload count Salmon advertised.
 */
export function mwaPrecheck(input: MwaPrecheckInput, ctx: MwaPrecheckContext): MwaPrecheck {
  const networkId = mwaChainToNetworkId(input.chain);
  if (!networkId || networkId !== ctx.networkId) {
    return { ok: false, reason: 'network', requested: input.chain, failReason: 'USER_DECLINED' };
  }
  const origin = mwaIdentityOrigin(input.identityUri);
  if (!origin) return { ok: false, reason: 'identity', failReason: 'USER_DECLINED' };
  if (!ctx.address) return { ok: false, reason: 'watch-only', failReason: 'USER_DECLINED' };
  if (
    !input.authorize &&
    !isMwaAuthorizationValid(
      ctx.trustedApps[origin],
      ctx.address,
      input.authorizationScope ?? new Uint8Array()
    )
  ) {
    return { ok: false, failReason: 'AUTHORIZATION_NOT_VALID' };
  }
  if ((input.payloadCount ?? 0) > MWA_MAX_PAYLOADS) {
    return { ok: false, failReason: 'TOO_MANY_PAYLOADS' };
  }
  return { ok: true, origin, networkId };
}

/** The account an approved `authorize` hands the dApp: the raw key of the address the user saw. */
export function mwaAuthorizedAccount(address: string, chain: string, label?: string) {
  return { publicKey: bs58.decode(address), accountLabel: label, chains: [chain] };
}
