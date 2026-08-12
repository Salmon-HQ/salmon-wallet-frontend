import bs58 from 'bs58';
import {
  getBase58Decoder,
  getBase64Decoder,
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  getTransactionEncoder,
  partiallySignTransaction,
  signBytes,
} from '@solana/kit';
import type {
  Address,
  Commitment,
  CompiledTransactionMessage,
  CompiledTransactionMessageWithLifetime,
  ReadonlyUint8Array,
  SignatureBytes,
  Slot,
  TransactionMessageBytes,
  TransactionMessageBytesBase64,
} from '@solana/kit';
import { address } from '@solana/addresses';
import { fetchAndMergeNetworkConfigs } from '../hooks/useAvailableNetworks';
import {
  buildOffchainMessageV1,
  parseOffchainMessageV1,
  signOffchainMessage,
  signSiwsMessage,
} from '../blockchain/solana';
import type { SolanaAccount, SolanaSignInInputFields } from '../blockchain/solana';
import type {
  DAppSignAllTransactionsApprovalPayload,
  DAppSignInApprovalPayload,
  DAppSignMessageApprovalPayload,
  DAppSignOffchainMessageApprovalPayload,
  DAppSignTransactionApprovalPayload,
  DAppSignAndSendTransactionApprovalPayload,
  DAppTransactionRequest,
} from '../types/dapp-approval';

export interface DecodedDAppMessage {
  text: string;
  isHex: boolean;
}

export interface ParsedSolanaTransaction {
  /** Raw compiled-message bytes, exactly as received. Never re-serialized. */
  messageBytes: Uint8Array;
  /** Decoded compiled message. `message.version` is `'legacy'` or `0`. */
  message: CompiledTransactionMessage & CompiledTransactionMessageWithLifetime;
}

export interface SolanaTransactionApprovalDetails {
  feeLamports: number | null;
  instructionCount: number | null;
  feePayer: string | null;
  recentBlockhash: string | null;
}

/**
 * Builds the signature map for a compiled message, with every required signer
 * slot empty. Insertion order is the wire order — kit serializes
 * `Object.values(signatures)` and never looks a signer up against the message —
 * so the map is always built from the message's own signer order.
 */
function emptySignatureMap(
  message: ParsedSolanaTransaction['message']
): Record<Address, SignatureBytes | null> {
  const signatures: Record<Address, SignatureBytes | null> = {};
  for (const signer of message.staticAccounts.slice(0, message.header.numSignerAccounts)) {
    signatures[signer] = null;
  }
  return signatures;
}

/** Signs an approved compiled message, leaving every other signer slot empty. */
function signApprovedMessage(account: SolanaAccount, encodedMessage: string) {
  const { messageBytes, message } = buildTransactionFromEncodedMessage(encodedMessage);
  return partiallySignTransaction([account.signer.keyPair], {
    messageBytes: messageBytes as ReadonlyUint8Array as TransactionMessageBytes,
    signatures: emptySignatureMap(message),
  });
}

const SEND_COMMITMENTS: readonly Commitment[] = ['processed', 'confirmed', 'finalized'];

/**
 * Narrows the dApp-supplied `options` to the send parameters the wallet is
 * willing to honour. The object is untrusted JSON off the bridge, so unknown
 * keys are dropped instead of reaching the RPC node.
 */
function toSendConfig(options: Record<string, unknown> | undefined) {
  const { skipPreflight, preflightCommitment, maxRetries, minContextSlot } = options ?? {};
  return {
    encoding: 'base64' as const,
    ...(typeof skipPreflight === 'boolean' ? { skipPreflight } : {}),
    ...(SEND_COMMITMENTS.includes(preflightCommitment as Commitment)
      ? { preflightCommitment: preflightCommitment as Commitment }
      : {}),
    ...(Number.isInteger(maxRetries) ? { maxRetries: BigInt(maxRetries as number) } : {}),
    ...(Number.isInteger(minContextSlot)
      ? { minContextSlot: BigInt(minContextSlot as number) as Slot }
      : {}),
  };
}

function toHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

export function isSecureOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

export function decodeDAppMessage(data: number[]): DecodedDAppMessage {
  const bytes = Uint8Array.from(data);
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(decoded)) {
      return { text: toHex(bytes), isHex: true };
    }
    return { text: decoded, isHex: false };
  } catch {
    return { text: toHex(bytes), isHex: true };
  }
}

/**
 * Decodes a base58-encoded compiled transaction message. Legacy and v0 messages
 * both decode through the same codec — `message.version` tells them apart — and
 * the raw bytes are carried alongside so callers never have to re-serialize.
 */
export function buildTransactionFromEncodedMessage(
  encodedMessage: string
): ParsedSolanaTransaction {
  const messageBytes = bs58.decode(encodedMessage);
  return {
    messageBytes,
    message: getCompiledTransactionMessageDecoder().decode(messageBytes),
  };
}

/**
 * Thrown by `approveSolanaSignMessage` when the requested bytes deserialize as a
 * valid Solana transaction message. Refusing to sign is the point: a dApp asking
 * the raw `signMessage` path to sign transaction bytes is trying to obtain what
 * looks like a message signature but is structurally a valid transaction
 * signature — the exact blind-signing attack OCMS (`solana:signOffchainMessage`)
 * exists to prevent.
 */
export class TransactionLookalikeMessageError extends Error {
  constructor() {
    super(
      'This message cannot be signed as plain text because it decodes as a Solana ' +
        'transaction. Signing it here would let this app move funds without a proper ' +
        'transaction approval. Ask the app to use signTransaction or ' +
        'solana:signOffchainMessage instead.'
    );
    this.name = 'TransactionLookalikeMessageError';
    Object.setPrototypeOf(this, TransactionLookalikeMessageError.prototype);
  }
}

/**
 * Returns true when `bytes` deserialize as a valid Solana `Message`/`VersionedMessage`.
 *
 * A dApp can smuggle a real transaction through the raw `signMessage` flow,
 * disguised as arbitrary data to sign — tricking a wallet into producing what looks
 * like a message signature but is structurally a valid transaction signature. OCMS's
 * domain-separated buffer format (see `blockchain/solana/offchain-message.ts`)
 * prevents this for new-style messages by construction; this guard detects the
 * lookalike case for the legacy raw `signMessage` path so callers can block or warn
 * before invoking `approveSolanaSignMessage`.
 */
export function isTransactionLookalike(bytes: Uint8Array): boolean {
  try {
    getCompiledTransactionMessageDecoder().decode(bytes);
    return true;
  } catch {
    return false;
  }
}

export function getDAppTransactionRequestSummary(
  method: DAppTransactionRequest['method']
): DAppTransactionRequest['method'] {
  return method;
}

export async function loadSolanaTransactionApprovalDetails(
  account: SolanaAccount,
  request: DAppTransactionRequest
): Promise<SolanaTransactionApprovalDetails> {
  await fetchAndMergeNetworkConfigs();

  const encodedMessage =
    request.method === 'signAllTransactions'
      ? (request.params?.messages?.[0] ?? '')
      : (request.params?.message ?? '');

  if (!encodedMessage) {
    throw new Error(
      request.method === 'signAllTransactions' ? 'Missing messages' : 'Missing message'
    );
  }

  const parsed = buildTransactionFromEncodedMessage(encodedMessage);
  const { value } = await account
    .getRpc()
    .getFeeForMessage(
      getBase64Decoder().decode(parsed.messageBytes) as TransactionMessageBytesBase64
    )
    .send();

  return {
    feeLamports: value != null ? Number(value) : null,
    instructionCount:
      'instructions' in parsed.message
        ? parsed.message.instructions.length
        : parsed.message.numInstructions,
    feePayer: parsed.message.staticAccounts[0] ?? null,
    recentBlockhash: parsed.message.lifetimeToken ?? null,
  };
}

export async function approveSolanaSignMessage(
  account: SolanaAccount,
  data: number[]
): Promise<DAppSignMessageApprovalPayload> {
  const messageBytes = Uint8Array.from(data);
  if (isTransactionLookalike(messageBytes)) {
    throw new TransactionLookalikeMessageError();
  }
  const signature = await signBytes(account.signer.keyPair.privateKey, messageBytes);

  return {
    signature: bs58.encode(signature),
    publicKey: account.getReceiveAddress(),
  };
}

/**
 * Approves an OCMS v1 `solana:signOffchainMessage` request (Wallet Standard PR#92).
 * Builds the domain-separated signing buffer via `signOffchainMessage` and returns
 * a payload that is field-name-compatible with the Wallet Standard output shape —
 * see `DAppSignOffchainMessageApprovalPayload` for the string-encoding rationale.
 *
 * @param account - The signing account
 * @param data - Raw UTF-8-encoded message bytes, as received from a dApp
 * @param requiredSigners - Required signer addresses, base58-encoded. Validated
 *   here by `address()`, which rejects anything that is not a well-formed
 *   Solana address — same contract as `parseOffchainMessageForApproval`.
 */
export async function approveSolanaSignOffchainMessage(
  account: SolanaAccount,
  data: number[],
  requiredSigners: string[]
): Promise<DAppSignOffchainMessageApprovalPayload> {
  const messageBytes = Uint8Array.from(data);
  const signers = requiredSigners.map((signer) => address(signer));
  const { signature, buffer } = await signOffchainMessage(account, messageBytes, signers);

  return {
    signedOffchainMessage: bs58.encode(buffer),
    signature: bs58.encode(signature),
    signatureType: 'ed25519',
  };
}

/**
 * Rebuilds and decodes an OCMS v1 signing buffer for approval-UI display, using the
 * same `buildOffchainMessageV1` -> `parseOffchainMessageV1` round-trip that
 * `approveSolanaSignOffchainMessage` signs — so the approval screen shows exactly what
 * the user is about to sign, not a separately-derived decode that could drift from it.
 * Throws if `data` is not valid UTF-8 or `requiredSigners` are not well-formed base58
 * addresses (mirrors `buildOffchainMessageV1`/`parseOffchainMessageV1`'s own contract).
 *
 * @param data - Raw UTF-8-encoded message bytes, as received from a dApp
 * @param requiredSigners - Required signer addresses, base58-encoded
 */
export function parseOffchainMessageForApproval(
  data: number[],
  requiredSigners: string[]
): ReturnType<typeof parseOffchainMessageV1> {
  const contentBytes = Uint8Array.from(data);
  const signers = requiredSigners.map((signer) => address(signer));
  const buffer = buildOffchainMessageV1(contentBytes, signers);
  return parseOffchainMessageV1(buffer);
}

/**
 * Approves a `solana:signIn` (Sign-In-With-Solana) request. The wallet builds
 * the SIWS message itself via `signSiwsMessage`, binding the `domain` line to
 * the real requesting `origin` — dApp-claimed domains or addresses that differ
 * are rejected there (see `SiwsDomainMismatchError`). When
 * `input.useOffchainMessage` is set (Wallet Standard PR#93), the message is
 * signed wrapped in an OCMS v1 envelope and `signedMessageFormat` marks it.
 *
 * @param account - The signing account (also the account being signed in)
 * @param input - The dApp's `SolanaSignInInput`, as received over the bridge
 * @param origin - The REAL requesting origin (from the connection, never the dApp)
 */
export async function approveSolanaSignIn(
  account: SolanaAccount,
  input: SolanaSignInInputFields,
  origin: string
): Promise<DAppSignInApprovalPayload> {
  const { signedMessage, signature, signedMessageFormat } = await signSiwsMessage(
    account,
    input,
    origin
  );

  return {
    address: account.getReceiveAddress(),
    signedMessage: bs58.encode(signedMessage),
    signature: bs58.encode(signature),
    signatureType: 'ed25519',
    ...(signedMessageFormat ? { signedMessageFormat } : {}),
  };
}

export async function approveSolanaTransactionRequest(
  account: SolanaAccount,
  request: DAppTransactionRequest
): Promise<
  | DAppSignTransactionApprovalPayload
  | DAppSignAllTransactionsApprovalPayload
  | DAppSignAndSendTransactionApprovalPayload
> {
  const publicKey = account.getReceiveAddress();

  if (request.method === 'signTransaction') {
    const encodedMessage = request.params?.message ?? '';
    if (!encodedMessage) throw new Error('Missing message');

    const signed = await signApprovedMessage(account, encodedMessage);
    const signature = signed.signatures[account.signer.address];
    if (!signature) throw new Error('Failed to sign transaction');
    return {
      signature: bs58.encode(signature),
      publicKey,
    };
  }

  if (request.method === 'signAllTransactions') {
    const encodedMessages = request.params?.messages ?? [];
    if (!encodedMessages.length) throw new Error('Missing messages');

    const signatures = await Promise.all(
      encodedMessages.map(async (encodedMessage) => {
        const signed = await signApprovedMessage(account, encodedMessage);
        const signature = signed.signatures[account.signer.address];
        if (!signature) {
          throw new Error('Failed to sign one of the transactions');
        }
        return bs58.encode(signature);
      })
    );

    return {
      signatures,
      publicKey,
    };
  }

  const encodedMessage = request.params?.message ?? '';
  if (!encodedMessage) throw new Error('Missing message');

  await fetchAndMergeNetworkConfigs();
  const rpc = account.getRpc();
  const sendConfig = toSendConfig(request.params?.options as Record<string, unknown> | undefined);

  // Signing the transaction the dApp sent preserves signatures it already
  // applied; rebuilding from the message alone silently drops them, producing a
  // transaction the cluster rejects. The decoder reads both wire formats and
  // `partiallySignTransaction` only ever fills this wallet's own slot.
  const encodedTransaction = request.params?.transaction;
  if (encodedTransaction) {
    const decoded = getTransactionDecoder().decode(bs58.decode(encodedTransaction));

    // WYSIWYS: the approval screen previews `message`, but this branch signs and
    // broadcasts `transaction`. Without this check a page could preview benign
    // bytes and have entirely different ones signed, so the two must agree
    // exactly before the key is ever used. The comparison is against the raw
    // message slice carried by the transaction, never a re-serialization of it.
    if (getBase58Decoder().decode(decoded.messageBytes) !== encodedMessage) {
      throw new Error(
        'Transaction does not match the approved message. The app sent transaction ' +
          'bytes that differ from the transaction shown for approval, so it was not signed.'
      );
    }

    const signed = await partiallySignTransaction([account.signer.keyPair], decoded);
    const signature = await rpc
      .sendTransaction(getBase64EncodedWireTransaction(signed), sendConfig)
      .send();
    return { signature };
  }

  const signed = await signApprovedMessage(account, encodedMessage);
  const signature = await rpc
    .sendTransaction(getBase64EncodedWireTransaction(signed), sendConfig)
    .send();
  return { signature };
}

export function serializeSignedTransactionFromApproval(
  encodedMessage: string,
  publicKey: string,
  signature: string
): Uint8Array {
  const { messageBytes, message } = buildTransactionFromEncodedMessage(encodedMessage);
  const signatures = emptySignatureMap(message);

  if (signatures[publicKey as Address] === undefined) {
    throw new Error('Signer public key not found in transaction message');
  }
  signatures[publicKey as Address] = bs58.decode(signature) as SignatureBytes;

  return new Uint8Array(
    getTransactionEncoder().encode({
      messageBytes: messageBytes as ReadonlyUint8Array as TransactionMessageBytes,
      signatures,
    })
  );
}

export function serializeSignedTransactionsFromApproval(
  encodedMessages: string[],
  publicKey: string,
  signatures: string[]
): Uint8Array[] {
  if (encodedMessages.length !== signatures.length) {
    throw new Error('Mismatched messages and signatures');
  }

  return encodedMessages.map((encodedMessage, index) =>
    serializeSignedTransactionFromApproval(encodedMessage, publicKey, signatures[index])
  );
}
