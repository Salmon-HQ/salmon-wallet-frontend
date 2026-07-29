import type {
    SolanaSignAndSendTransactionFeature,
    SolanaSignAndSendTransactionMethod,
    SolanaSignAndSendTransactionOutput,
    SolanaSignInInput,
    SolanaSignInOutput,
    SolanaSignMessageFeature,
    SolanaSignMessageMethod,
    SolanaSignMessageOutput,
    SolanaSignTransactionFeature,
    SolanaSignTransactionMethod,
    SolanaSignTransactionOutput,
} from '@solana/wallet-standard-features';
import { VersionedTransaction } from '@solana/web3.js';
import type { Wallet, WalletAccount } from '@wallet-standard/base';
import type {
    ConnectFeature,
    ConnectMethod,
    DisconnectFeature,
    DisconnectMethod,
    EventsFeature,
    EventsListeners,
    EventsNames,
    EventsOnMethod,
} from '@wallet-standard/features';
import bs58 from 'bs58';
import { SalmonWalletAccount } from './account.js';
import { icon } from './icon.js';
import type { SolanaChain } from './solana.js';
import { getNetworkForChain, isSolanaChain, SOLANA_CHAINS } from './solana.js';
import { bytesEqual } from './util.js';
import type { Salmon } from './window.js';

export type SalmonFeature = {
    'salmon:': {
        salmon: Salmon;
    };
};

// OCMS v1 (`solana:signOffchainMessage`) types, per Wallet Standard PR#92.
// Defined locally because the installed @solana/wallet-standard-features does
// not ship the feature yet; remove once the upstream package includes it.

export type SolanaSignOffchainMessageVersion = 1;

export interface SolanaSignOffchainMessageInput {
    readonly account: WalletAccount;
    readonly message: string;
    readonly messageVersion: SolanaSignOffchainMessageVersion;
    readonly requiredSigners: readonly Uint8Array[];
}

export interface SolanaSignOffchainMessageOutput {
    readonly signedOffchainMessage: Uint8Array;
    readonly signature: Uint8Array;
    readonly signatureType?: 'ed25519';
}

export type SolanaSignOffchainMessageMethod = (
    ...inputs: readonly SolanaSignOffchainMessageInput[]
) => Promise<readonly SolanaSignOffchainMessageOutput[]>;

export type SolanaSignOffchainMessageFeature = {
    'solana:signOffchainMessage': {
        version: '1.0.0';
        supportedMessageVersions: readonly SolanaSignOffchainMessageVersion[];
        signOffchainMessage: SolanaSignOffchainMessageMethod;
    };
};

// `solana:signIn` (SIWS) types. The installed @solana/wallet-standard-features
// ships the 1.0.0 feature; the extensions from Wallet Standard PR#93
// (`useOffchainMessage` input + `signedMessageFormat` output, feature version
// 1.1.0) are defined locally until the upstream package includes them.

export type SalmonSolanaSignInInput = SolanaSignInInput & {
    readonly useOffchainMessage?: { readonly messageVersion: 1 };
};

export type SalmonSolanaSignInOutput = SolanaSignInOutput & {
    readonly signedMessageFormat?: { kind: 'offchainMessage'; messageVersion: 1 };
};

export type SalmonSolanaSignInMethod = (
    ...inputs: readonly SalmonSolanaSignInInput[]
) => Promise<readonly SalmonSolanaSignInOutput[]>;

export type SalmonSolanaSignInFeature = {
    'solana:signIn': {
        version: '1.1.0';
        signIn: SalmonSolanaSignInMethod;
    };
};

export class SalmonWallet implements Wallet {
    readonly #listeners: { [E in EventsNames]?: EventsListeners[E][] } = {};
    readonly #version = '1.0.0' as const;
    readonly #name = 'Salmon' as const;
    readonly #icon = icon;
    #account: SalmonWalletAccount | null = null;
    readonly #salmon: Salmon;

    get version() {
        return this.#version;
    }

    get name() {
        return this.#name;
    }

    get icon() {
        return this.#icon;
    }

    get chains() {
        return SOLANA_CHAINS.slice();
    }

    get features(): ConnectFeature &
        DisconnectFeature &
        EventsFeature &
        SolanaSignAndSendTransactionFeature &
        SolanaSignTransactionFeature &
        SolanaSignMessageFeature &
        SolanaSignOffchainMessageFeature &
        SalmonSolanaSignInFeature &
        SalmonFeature {
        return {
            'standard:connect': {
                version: '1.0.0',
                connect: this.#connect,
            },
            'standard:disconnect': {
                version: '1.0.0',
                disconnect: this.#disconnect,
            },
            'standard:events': {
                version: '1.0.0',
                on: this.#on,
            },
            'solana:signAndSendTransaction': {
                version: '1.0.0',
                supportedTransactionVersions: ['legacy', 0],
                signAndSendTransaction: this.#signAndSendTransaction,
            },
            'solana:signTransaction': {
                version: '1.0.0',
                supportedTransactionVersions: ['legacy', 0],
                signTransaction: this.#signTransaction,
            },
            'solana:signMessage': {
                version: '1.0.0',
                signMessage: this.#signMessage,
            },
            'solana:signOffchainMessage': {
                version: '1.0.0',
                supportedMessageVersions: [1],
                signOffchainMessage: this.#signOffchainMessage,
            },
            'solana:signIn': {
                version: '1.1.0',
                signIn: this.#signIn,
            },
            'salmon:': {
                salmon: this.#salmon,
            },
        };
    }

    get accounts() {
        return this.#account ? [this.#account] : [];
    }

    constructor(salmon: Salmon) {
        if (new.target === SalmonWallet) {
            Object.freeze(this);
        }

        this.#salmon = salmon;

        salmon.on('connect', this.#connected, this);
        salmon.on('disconnect', this.#disconnected, this);
        salmon.on('accountChanged', this.#reconnected, this);

        this.#connected();
    }

    #on: EventsOnMethod = (event, listener) => {
        this.#listeners[event]?.push(listener) || (this.#listeners[event] = [listener]);
        return (): void => this.#off(event, listener);
    };

    #emit<E extends EventsNames>(event: E, ...args: Parameters<EventsListeners[E]>): void {
        // eslint-disable-next-line prefer-spread
        this.#listeners[event]?.forEach((listener) => listener.apply(null, args));
    }

    #off<E extends EventsNames>(event: E, listener: EventsListeners[E]): void {
        this.#listeners[event] = this.#listeners[event]?.filter((existingListener) => listener !== existingListener);
    }

    #connected = () => {
        const address = this.#salmon.publicKey?.toBase58();
        if (address) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const publicKey = this.#salmon.publicKey!.toBytes();

            const account = this.#account;
            if (!account || account.address !== address || !bytesEqual(account.publicKey, publicKey)) {
                this.#account = new SalmonWalletAccount({ address, publicKey });
                this.#emit('change', { accounts: this.accounts });
            }
        }
    };

    #disconnected = () => {
        if (this.#account) {
            this.#account = null;
            this.#emit('change', { accounts: this.accounts });
        }
    };

    #reconnected = () => {
        if (this.#salmon.publicKey) {
            this.#connected();
        } else {
            this.#disconnected();
        }
    };

    #connect: ConnectMethod = async ({ silent } = {}) => {
        if (!this.#account) {
            await this.#salmon.connect(silent ? { onlyIfTrusted: true } : undefined);
        }

        this.#connected();

        return { accounts: this.accounts };
    };

    #disconnect: DisconnectMethod = async () => {
        await this.#salmon.disconnect();

        this.#disconnected();
    };

    #signAndSendTransaction: SolanaSignAndSendTransactionMethod = async (...inputs) => {
        if (!this.#account) throw new Error('not connected');

        const outputs: SolanaSignAndSendTransactionOutput[] = [];

        if (inputs.length === 1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const { transaction, account, chain, options } = inputs[0]!;
            const { minContextSlot, preflightCommitment, skipPreflight, maxRetries } = options || {};
            if (account !== this.#account) throw new Error('invalid account');
            if (!isSolanaChain(chain)) throw new Error('invalid chain');
            const network = chain ? getNetworkForChain(chain) : undefined;

            const { signature } = await this.#salmon.signAndSendTransaction(
                VersionedTransaction.deserialize(transaction),
                network,
                {
                    preflightCommitment,
                    minContextSlot,
                    maxRetries,
                    skipPreflight,
                }
            );

            outputs.push({ signature: bs58.decode(signature) });
        } else if (inputs.length > 1) {
            for (const input of inputs) {
                outputs.push(...(await this.#signAndSendTransaction(input)));
            }
        }

        return outputs;
    };

    #signTransaction: SolanaSignTransactionMethod = async (...inputs) => {
        if (!this.#account) throw new Error('not connected');

        const outputs: SolanaSignTransactionOutput[] = [];

        if (inputs.length === 1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const { transaction, account, chain } = inputs[0]!;
            if (account !== this.#account) throw new Error('invalid account');
            if (chain && !isSolanaChain(chain)) throw new Error('invalid chain');
            const network = chain ? getNetworkForChain(chain) : undefined;

            const signedTransaction = await this.#salmon.signTransaction(VersionedTransaction.deserialize(transaction), network);

            outputs.push({ signedTransaction: signedTransaction.serialize() });
        } else if (inputs.length > 1) {
            let chain: SolanaChain | undefined = undefined;
            for (const input of inputs) {
                if (input.account !== this.#account) throw new Error('invalid account');
                if (input.chain) {
                    if (!isSolanaChain(input.chain)) throw new Error('invalid chain');
                    if (chain) {
                        if (input.chain !== chain) throw new Error('conflicting chain');
                    } else {
                        chain = input.chain;
                    }
                }
            }
            const network = chain ? getNetworkForChain(chain) : undefined;

            const transactions = inputs.map(({ transaction }) => VersionedTransaction.deserialize(transaction));

            const signedTransactions = await this.#salmon.signAllTransactions(transactions, network);

            outputs.push(
                ...signedTransactions.map((signedTransaction) => ({ signedTransaction: signedTransaction.serialize() }))
            );
        }

        return outputs;
    };

    #signMessage: SolanaSignMessageMethod = async (...inputs) => {
        if (!this.#account) throw new Error('not connected');

        const outputs: SolanaSignMessageOutput[] = [];

        if (inputs.length === 1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const { message, account } = inputs[0]!;
            if (account !== this.#account) throw new Error('invalid account');

            const { signature } = await this.#salmon.signMessage(message);

            outputs.push({ signedMessage: message, signature });
        } else if (inputs.length > 1) {
            for (const input of inputs) {
                outputs.push(...(await this.#signMessage(input)));
            }
        }

        return outputs;
    };

    // Sign-In-With-Solana. Unlike the other features, `signIn` does not require
    // an existing connection: a successful sign-in itself proves account
    // ownership, so the provider connects as part of it (Phantom semantics).
    // The wallet builds the SIWS message from the real origin; the dApp input
    // only parameterizes it.
    #signIn: SalmonSolanaSignInMethod = async (...inputs) => {
        const outputs: SalmonSolanaSignInOutput[] = [];

        // Per the feature contract, `signIn()` with no inputs is a valid
        // sign-in request with all fields defaulted by the wallet.
        for (const input of inputs.length ? inputs : [{}]) {
            const result = await this.#salmon.signIn({ ...input, resources: input.resources?.slice() });

            this.#connected();
            const account = this.#account;
            if (!account) throw new Error('not connected');
            if (account.address !== result.address) throw new Error('invalid account');

            outputs.push({
                account,
                signedMessage: result.signedMessage,
                signature: result.signature,
                signatureType: result.signatureType,
                ...(result.signedMessageFormat
                    ? { signedMessageFormat: result.signedMessageFormat }
                    : {}),
            });
        }

        return outputs;
    };

    #signOffchainMessage: SolanaSignOffchainMessageMethod = async (...inputs) => {
        if (!this.#account) throw new Error('not connected');

        const outputs: SolanaSignOffchainMessageOutput[] = [];

        for (const input of inputs) {
            const { account, message, messageVersion, requiredSigners } = input;
            if (account !== this.#account) throw new Error('invalid account');
            if (messageVersion !== 1) throw new Error('unsupported message version');

            const { signedOffchainMessage, signature, signatureType } =
                await this.#salmon.signOffchainMessage({
                    messageVersion,
                    message,
                    requiredSigners: requiredSigners.slice(),
                });

            outputs.push({ signedOffchainMessage, signature, signatureType });
        }

        return outputs;
    };
}
