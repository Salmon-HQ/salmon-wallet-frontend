import type { SendOptions, SignAndSendTransactionResult } from '../lib/SolanaProvider.js';
import type { SalmonAddress } from '../lib/SalmonAddress.js';

export interface SalmonEvent {
    connect(...args: unknown[]): unknown;
    disconnect(...args: unknown[]): unknown;
    accountChanged(...args: unknown[]): unknown;
}

export interface SalmonEventEmitter {
    on<E extends keyof SalmonEvent>(event: E, listener: SalmonEvent[E], context?: any): void;
    off<E extends keyof SalmonEvent>(event: E, listener: SalmonEvent[E], context?: any): void;
}

/** The connected public key as `window.salmon` exposes it. */
export type SalmonPublicKey = SalmonAddress;

export interface Salmon extends SalmonEventEmitter {
    publicKey: SalmonPublicKey | null;
    connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: SalmonPublicKey }>;
    disconnect(): Promise<void>;
    signTransactionBytes(transaction: Uint8Array, network?: string): Promise<Uint8Array>;
    signAllTransactionsBytes(transactions: Uint8Array[], network?: string): Promise<Uint8Array[]>;
    signAndSendTransactionBytes(
        transaction: Uint8Array,
        network?: string,
        options?: SendOptions
    ): Promise<SignAndSendTransactionResult>;
    signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
    signOffchainMessage(input: {
        messageVersion: number;
        message: string;
        requiredSigners: Uint8Array[];
    }): Promise<{ signedOffchainMessage: Uint8Array; signature: Uint8Array; signatureType: 'ed25519' }>;
    signIn(input: SalmonSignInInput): Promise<SalmonSignInResult>;
}

/** JSON-safe `SolanaSignInInput` (incl. Wallet Standard PR#93 `useOffchainMessage`). */
export interface SalmonSignInInput {
    domain?: string;
    address?: string;
    statement?: string;
    uri?: string;
    version?: string;
    chainId?: string;
    nonce?: string;
    issuedAt?: string;
    expirationTime?: string;
    notBefore?: string;
    requestId?: string;
    resources?: string[];
    useOffchainMessage?: { messageVersion: 1 };
}

export interface SalmonSignInResult {
    address: string;
    publicKey: Uint8Array;
    signedMessage: Uint8Array;
    signature: Uint8Array;
    signatureType: 'ed25519';
    signedMessageFormat?: { kind: 'offchainMessage'; messageVersion: 1 };
}
