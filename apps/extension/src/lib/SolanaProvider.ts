import EventEmitter from 'eventemitter3';
import bs58 from 'bs58';
import { getBase58Decoder, getTransactionDecoder, getTransactionEncoder } from '@solana/kit';
import type { Address, SignatureBytes } from '@solana/kit';
import { toSalmonAddress } from './SalmonAddress';
import type { SalmonAddress } from './SalmonAddress';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * JSON-RPC request message sent to the content script
 */
export interface RequestMessage {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params: Record<string, unknown>;
}

/**
 * JSON-RPC response message received from the content script
 */
export interface ResponseMessage {
  jsonrpc: '2.0';
  id: string;
  method?: string;
  result?: unknown;
  params?: Record<string, unknown>;
  error?: string;
}

/**
 * Result returned from a successful connect call
 */
export interface ConnectResult {
  publicKey: SalmonAddress;
}

/**
 * Options for the connect method
 */
export interface ConnectOptions {
  onlyIfTrusted?: boolean;
}

/**
 * Result from signing a transaction
 */
export interface SignTransactionResult {
  signature: string;
  publicKey: string;
}

/**
 * Result from signing multiple transactions
 */
export interface SignAllTransactionsResult {
  signatures: string[];
  publicKey: string;
}

/**
 * Result from signing and sending a transaction
 */
export interface SignAndSendTransactionResult {
  signature: string;
}

/**
 * Options for signing and sending a transaction
 */
export interface SendOptions {
  skipPreflight?: boolean;
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
  minContextSlot?: number;
}

/**
 * Result from signing a message
 */
export interface SignMessageResult {
  signature: Uint8Array;
}

/**
 * Input for signing an OCMS v1 off-chain message (Wallet Standard PR#92)
 */
export interface SignOffchainMessageInput {
  messageVersion: number;
  message: string;
  requiredSigners: Uint8Array[];
}

/**
 * Result from signing an OCMS v1 off-chain message
 */
export interface SignOffchainMessageResult {
  signedOffchainMessage: Uint8Array;
  signature: Uint8Array;
  signatureType: 'ed25519';
}

/**
 * Input for `solana:signIn` (Sign-In-With-Solana) — JSON-safe
 * `SolanaSignInInput`, incl. the Wallet Standard PR#93 `useOffchainMessage`
 */
export interface SignInInput {
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

/**
 * Result from `solana:signIn`
 */
export interface SignInResult {
  address: string;
  publicKey: Uint8Array;
  signedMessage: Uint8Array;
  signature: Uint8Array;
  signatureType: 'ed25519';
  signedMessageFormat?: { kind: 'offchainMessage'; messageVersion: 1 };
}

/**
 * Network type for transaction operations
 */
export type Network = 'solana-mainnet' | 'solana-devnet' | string;

/**
 * Structural shape of a legacy web3.js `Transaction`, limited to the members
 * this provider touches. Structural rather than imported so the injected
 * bundle carries no `@solana/web3.js`; dApps keep passing the real objects.
 */
export interface LegacyTransactionLike {
  serializeMessage(): Uint8Array;
  serialize(config?: { requireAllSignatures?: boolean; verifySignatures?: boolean }): Uint8Array;
  signatures: { publicKey: { toBase58(): string }; signature: Uint8Array | null }[];
}

/** Structural shape of a web3.js `VersionedTransaction`. */
export interface VersionedTransactionLike {
  message: {
    serialize(): Uint8Array;
    header: { numRequiredSignatures: number };
    staticAccountKeys: { toBase58(): string }[];
  };
  signatures: Uint8Array[];
  serialize(): Uint8Array;
}

/**
 * Transaction type that can be either legacy or versioned
 */
export type SolanaTransaction = LegacyTransactionLike | VersionedTransactionLike;

const SIGNATURE_LENGTH = 64;

/**
 * Decodes a base58 signature coming back from the extension, refusing a
 * wrong-length one. Kit's fixed-size encoder pads or truncates silently, so
 * without this a malformed response would be re-encoded into a plausible-looking
 * transaction instead of failing.
 */
function toSignatureBytes(signature: string): SignatureBytes {
  const bytes = bs58.decode(signature);
  if (bytes.length !== SIGNATURE_LENGTH) {
    throw new Error('Invalid signature length');
  }
  return bytes as SignatureBytes;
}

/**
 * Writes `signature` into the slot that belongs to `base58`, for either wire
 * format, and returns the transaction the dApp handed us.
 *
 * Replaces web3.js's `addSignature`, which the injected address object cannot
 * feed: `VersionedTransaction.addSignature` compares `realKey.equals(ours)` and
 * dies on the missing `_bn`, while the legacy path happens to compare the other
 * way round and survives. One path for both, byte-identical to web3.js's own
 * signing for each format.
 */
function writeSignature(
  transaction: SolanaTransaction,
  base58: string,
  signature: Uint8Array
): void {
  if (signature.length !== SIGNATURE_LENGTH) {
    throw new Error('Invalid signature length');
  }

  if ('serializeMessage' in transaction) {
    // Forces the compile that populates `signatures`; idempotent.
    transaction.serializeMessage();
    const entry = transaction.signatures.find((s) => s.publicKey.toBase58() === base58);
    if (!entry) {
      throw new Error(`Transaction does not require a signature from ${base58}`);
    }
    entry.signature = signature;
    return;
  }

  const { message } = transaction;
  const index = message.staticAccountKeys
    .slice(0, message.header.numRequiredSignatures)
    .findIndex((key) => key.toBase58() === base58);
  if (index === -1) {
    throw new Error(`Transaction does not require a signature from ${base58}`);
  }
  transaction.signatures[index] = signature;
}

/**
 * Events emitted by the provider
 */
export interface SolanaProviderEvents {
  connect: (publicKey: SalmonAddress) => void;
  disconnect: () => void;
  accountChanged: (publicKey: SalmonAddress | null) => void;
}

// ============================================================================
// Custom Event Types for Window Communication
// ============================================================================

interface ContentScriptMessageDetail extends ResponseMessage {}

interface ContentScriptMessageEvent extends CustomEvent<ContentScriptMessageDetail> {}

// ============================================================================
// SolanaProvider Class
// ============================================================================

/**
 * Solana wallet provider that implements the wallet-standard interface.
 * This provider is injected into web pages and communicates with the
 * extension's content script via custom events.
 */
export class SolanaProvider extends EventEmitter<SolanaProviderEvents> {
  #publicKey: SalmonAddress | null = null;

  constructor() {
    super();
    this.#publicKey = null;
  }

  /**
   * The public key of the connected wallet, or null if not connected
   */
  get publicKey(): SalmonAddress | null {
    return this.#publicKey;
  }

  /**
   * Whether the wallet is currently connected
   */
  get isConnected(): boolean {
    return this.#publicKey !== null;
  }

  /**
   * Encodes a transaction message to base58 for transmission
   */
  #encodeTransaction = (transaction: SolanaTransaction): string => {
    let serialized: Uint8Array;

    // Handle legacy Transaction with serializeMessage method
    if ('serializeMessage' in transaction && typeof transaction.serializeMessage === 'function') {
      serialized = transaction.serializeMessage();
    }
    // Handle VersionedTransaction with message.serialize method
    else if ('message' in transaction && transaction.message && typeof transaction.message.serialize === 'function') {
      serialized = transaction.message.serialize();
    } else {
      throw new Error('Unable to serialize transaction');
    }

    return bs58.encode(serialized);
  };

  /**
   * Encodes a FULL transaction to base58, keeping any signatures a dApp already
   * applied. Only `signAndSendTransaction` needs this: the wallet submits that
   * transaction itself, so dropping co-signer signatures makes it invalid. The
   * `signTransaction` paths return only the wallet's own signature and the dApp
   * reassembles the transaction, so they keep using `#encodeTransaction`.
   */
  #encodeSignedTransaction = (transaction: SolanaTransaction): string => {
    const serialized =
      'serializeMessage' in transaction && typeof transaction.serializeMessage === 'function'
        ? transaction.serialize({ requireAllSignatures: false, verifySignatures: false })
        : transaction.serialize();

    return bs58.encode(serialized);
  };

  /**
   * Sends a message to the content script and waits for a response
   */
  sendMessage = async (message: RequestMessage): Promise<ResponseMessage> => {
    return new Promise((resolve, reject) => {
      const listener = (event: Event) => {
        const customEvent = event as ContentScriptMessageEvent;
        if (customEvent.detail.id === message.id) {
          window.removeEventListener('salmon_contentscript_message', listener);

          if (customEvent.detail.error) {
            reject(customEvent.detail);
          } else {
            resolve(customEvent.detail);
          }
        }
      };

      window.addEventListener('salmon_contentscript_message', listener);

      window.dispatchEvent(
        new CustomEvent('salmon_injected_script_message', { detail: message })
      );
    });
  };

  /**
   * Sends a JSON-RPC request to the content script
   */
  sendRequest = async (
    method: string,
    params: Record<string, unknown>
  ): Promise<ResponseMessage> => {
    try {
      return await this.sendMessage({
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method,
        params,
      });
    } catch (response) {
      const errorResponse = response as ResponseMessage;
      throw new Error(errorResponse.error || 'Unknown error');
    }
  };

  /**
   * Connects to the wallet
   * @param options - Connection options
   * @returns The public key of the connected wallet
   */
  connect = async (options?: ConnectOptions): Promise<ConnectResult> => {
    const response = await this.sendRequest('connect', { options });

    if (response.method === 'connected' && response.params) {
      const publicKeyString = response.params.publicKey as string;
      this.#publicKey = toSalmonAddress(publicKeyString);
      this.emit('connect', this.#publicKey);
      return { publicKey: this.#publicKey };
    }

    throw new Error('Not connected');
  };

  /**
   * Disconnects from the wallet
   */
  disconnect = async (): Promise<void> => {
    const response = await this.sendRequest('disconnect', {});

    if (response.method === 'disconnected') {
      this.#publicKey = null;
      this.emit('disconnect');
    } else {
      throw new Error('Not disconnected');
    }
  };

  /**
   * Signs and sends a transaction to the network
   * @param transaction - The transaction to sign and send
   * @param network - The network to send the transaction to
   * @param options - Send options
   * @returns The transaction signature
   */
  signAndSendTransaction = async (
    transaction: SolanaTransaction,
    network?: Network,
    options?: SendOptions
  ): Promise<SignAndSendTransactionResult> => {
    const response = await this.sendRequest('signAndSendTransaction', {
      message: this.#encodeTransaction(transaction),
      transaction: this.#encodeSignedTransaction(transaction),
      network,
      options,
    });

    return response.result as SignAndSendTransactionResult;
  };

  /**
   * Signs a transaction without sending it
   * @param transaction - The transaction to sign
   * @param network - The network context for the transaction
   * @returns The signed transaction
   */
  signTransaction = async <T extends SolanaTransaction>(
    transaction: T,
    network?: Network
  ): Promise<T> => {
    const response = await this.sendRequest('signTransaction', {
      message: this.#encodeTransaction(transaction),
      network,
    });

    const result = response.result as SignTransactionResult;
    writeSignature(transaction, result.publicKey, bs58.decode(result.signature));

    return transaction;
  };

  /**
   * Signs multiple transactions without sending them
   * @param transactions - The transactions to sign
   * @param network - The network context for the transactions
   * @returns The signed transactions
   */
  signAllTransactions = async <T extends SolanaTransaction>(
    transactions: T[],
    network?: Network
  ): Promise<T[]> => {
    const response = await this.sendRequest('signAllTransactions', {
      messages: transactions.map(this.#encodeTransaction),
      network,
    });

    const result = response.result as SignAllTransactionsResult;

    return transactions.map((tx, idx) => {
      writeSignature(tx, result.publicKey, bs58.decode(result.signatures[idx]));
      return tx;
    });
  };

  /**
   * Signs a wire-format transaction without sending it. Bytes-native
   * counterpart of {@link signTransaction}, used by the wallet-standard
   * adapter, which only ever holds raw transaction bytes. Decodes the wire
   * with the kit codecs, writes the returned signature into the wallet's own
   * slot (every other slot, e.g. a co-signer's, is carried over untouched),
   * and re-encodes.
   * @param transaction - The wire-format transaction bytes to sign
   * @param network - The network context for the transaction
   * @returns The signed transaction, still in wire format
   */
  signTransactionBytes = async (transaction: Uint8Array, network?: Network): Promise<Uint8Array> => {
    const decoded = getTransactionDecoder().decode(transaction);
    const response = await this.sendRequest('signTransaction', {
      message: getBase58Decoder().decode(decoded.messageBytes),
      network,
    });

    const result = response.result as SignTransactionResult;
    const signerAddress = result.publicKey as Address;
    if (!(signerAddress in decoded.signatures)) {
      throw new Error('Signer public key not found in transaction message');
    }

    const signatures = {
      ...decoded.signatures,
      [signerAddress]: toSignatureBytes(result.signature),
    };

    return new Uint8Array(getTransactionEncoder().encode({ ...decoded, signatures }));
  };

  /**
   * Signs multiple wire-format transactions without sending them. Bytes-native
   * counterpart of {@link signAllTransactions}.
   * @param transactions - The wire-format transactions to sign
   * @param network - The network context for the transactions
   * @returns The signed transactions, still in wire format
   */
  signAllTransactionsBytes = async (transactions: Uint8Array[], network?: Network): Promise<Uint8Array[]> => {
    const decodedList = transactions.map((wire) => getTransactionDecoder().decode(wire));
    const response = await this.sendRequest('signAllTransactions', {
      messages: decodedList.map((decoded) => getBase58Decoder().decode(decoded.messageBytes)),
      network,
    });

    const result = response.result as SignAllTransactionsResult;
    const signerAddress = result.publicKey as Address;
    const signatureBytes = result.signatures.map(toSignatureBytes);

    return decodedList.map((decoded, index) => {
      if (!(signerAddress in decoded.signatures)) {
        throw new Error('Signer public key not found in transaction message');
      }
      const signatures = { ...decoded.signatures, [signerAddress]: signatureBytes[index] };
      return new Uint8Array(getTransactionEncoder().encode({ ...decoded, signatures }));
    });
  };

  /**
   * Signs and sends a wire-format transaction. Bytes-native counterpart of
   * {@link signAndSendTransaction} — forwards the input bytes verbatim as
   * `transaction`, so any signatures the dApp already applied (co-signers)
   * survive, exactly like the object-based path.
   * @param transaction - The wire-format transaction bytes to sign and send
   * @param network - The network to send the transaction to
   * @param options - Send options
   * @returns The transaction signature
   */
  signAndSendTransactionBytes = async (
    transaction: Uint8Array,
    network?: Network,
    options?: SendOptions
  ): Promise<SignAndSendTransactionResult> => {
    const decoded = getTransactionDecoder().decode(transaction);
    const response = await this.sendRequest('signAndSendTransaction', {
      message: getBase58Decoder().decode(decoded.messageBytes),
      transaction: bs58.encode(transaction),
      network,
      options,
    });

    return response.result as SignAndSendTransactionResult;
  };

  /**
   * Signs an arbitrary message
   * @param message - The message to sign (must be Uint8Array)
   * @returns The signature
   */
  signMessage = async (message: Uint8Array): Promise<SignMessageResult> => {
    if (!(message instanceof Uint8Array)) {
      throw new Error('Data must be an instance of Uint8Array');
    }

    const response = await this.sendRequest('sign', { data: Array.from(message) });
    const result = response.result as { signature: string };
    const signature = bs58.decode(result.signature);

    return { signature: new Uint8Array(signature) };
  };

  /**
   * Signs an OCMS v1 off-chain message (`solana:signOffchainMessage`, Wallet
   * Standard PR#92). The UTF-8 message and required signer public keys travel
   * to the extension as JSON (byte array + base58 strings); the approval
   * layer's bs58 payload is decoded back to Uint8Array at this edge.
   * @param input - messageVersion (v1 only), UTF-8 message, required signers
   * @returns The full signed OCMS buffer, the signature, and its type
   */
  signOffchainMessage = async (
    input: SignOffchainMessageInput
  ): Promise<SignOffchainMessageResult> => {
    if (input.messageVersion !== 1) {
      throw new Error('Unsupported off-chain message version');
    }
    if (typeof input.message !== 'string') {
      throw new Error('Message must be a string');
    }
    if (!Array.isArray(input.requiredSigners)) {
      throw new Error('requiredSigners must be an array');
    }

    const response = await this.sendRequest('signOffchain', {
      data: Array.from(new TextEncoder().encode(input.message)),
      requiredSigners: input.requiredSigners.map((publicKey) => bs58.encode(publicKey)),
    });
    const result = response.result as {
      signedOffchainMessage: string;
      signature: string;
      signatureType: 'ed25519';
    };

    return {
      signedOffchainMessage: new Uint8Array(bs58.decode(result.signedOffchainMessage)),
      signature: new Uint8Array(bs58.decode(result.signature)),
      signatureType: result.signatureType,
    };
  };

  /**
   * Native `solana:signIn` (Sign-In-With-Solana). Only the dApp's
   * `SolanaSignInInput` travels to the extension — the wallet builds and signs
   * the SIWS message from the REAL requesting origin, so no dApp-supplied
   * message text is ever trusted. A successful sign-in also proves account
   * ownership, so the provider treats it as a connect.
   * @param input - JSON-safe SolanaSignInInput (all optional string fields)
   * @returns The signed-in account, the exact signed bytes, and the signature
   */
  signIn = async (input: SignInInput = {}): Promise<SignInResult> => {
    const response = await this.sendRequest('signIn', { input });
    const result = response.result as {
      address: string;
      signedMessage: string;
      signature: string;
      signatureType: 'ed25519';
      signedMessageFormat?: { kind: 'offchainMessage'; messageVersion: 1 };
    };

    const publicKey = toSalmonAddress(result.address);
    if (!this.#publicKey || !this.#publicKey.equals(publicKey)) {
      this.#publicKey = publicKey;
      this.emit('connect', publicKey);
    }

    return {
      address: result.address,
      publicKey: publicKey.toBytes(),
      signedMessage: new Uint8Array(bs58.decode(result.signedMessage)),
      signature: new Uint8Array(bs58.decode(result.signature)),
      signatureType: result.signatureType,
      ...(result.signedMessageFormat
        ? { signedMessageFormat: result.signedMessageFormat }
        : {}),
    };
  };

}
