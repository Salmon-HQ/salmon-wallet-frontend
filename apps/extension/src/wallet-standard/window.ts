import type { PublicKey, SendOptions, Transaction, TransactionSignature, VersionedTransaction } from '@solana/web3.js';

export interface SalmonEvent {
    connect(...args: unknown[]): unknown;
    disconnect(...args: unknown[]): unknown;
    accountChanged(...args: unknown[]): unknown;
}

export interface SalmonEventEmitter {
    on<E extends keyof SalmonEvent>(event: E, listener: SalmonEvent[E], context?: any): void;
    off<E extends keyof SalmonEvent>(event: E, listener: SalmonEvent[E], context?: any): void;
}

export interface Salmon extends SalmonEventEmitter {
    publicKey: PublicKey | null;
    connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PublicKey }>;
    disconnect(): Promise<void>;
    signAndSendTransaction<T extends Transaction | VersionedTransaction>(
        transaction: T,
        network?: string,
        options?: SendOptions
    ): Promise<{ signature: TransactionSignature }>;
    signTransaction<T extends Transaction | VersionedTransaction>(transaction: T, network?: string): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[], network?: string): Promise<T[]>;
    signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
}
