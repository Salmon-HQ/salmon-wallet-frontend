import { Buffer } from 'buffer';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import {
  Message,
  PublicKey,
  Transaction,
  VersionedMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { fetchAndMergeNetworkConfigs } from '../hooks/useAvailableNetworks';
import { buildOffchainMessageV1, parseOffchainMessageV1, signOffchainMessage } from '../blockchain/solana';
import type { SolanaAccount } from '../blockchain/solana';
import type {
  DAppSignAllTransactionsApprovalPayload,
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

export type ParsedSolanaTransaction =
  | { type: 'legacy'; message: Message; tx: Transaction }
  | { type: 'versioned'; message: VersionedMessage; tx: VersionedTransaction };

export interface SolanaTransactionApprovalDetails {
  feeLamports: number | null;
  instructionCount: number | null;
  feePayer: string | null;
  recentBlockhash: string | null;
}

function getVersionedSignerIndex(
  message: VersionedMessage,
  publicKey: PublicKey,
): number {
  const signerIndex = message.staticAccountKeys
    .slice(0, message.header.numRequiredSignatures)
    .findIndex((accountKey) => accountKey.equals(publicKey));

  if (signerIndex === -1) {
    throw new Error('Signer public key not found in transaction message');
  }

  return signerIndex;
}

function toHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

export function isSecureOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1';
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

export interface ParsedSiwsMessage {
  domain: string;
  address: string;
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
}

const SIWS_HEADER = /^(.+?) wants you to sign in with your Solana account:$/;

const SIWS_FIELDS: Record<string, keyof ParsedSiwsMessage> = {
  URI: 'uri',
  Version: 'version',
  'Chain ID': 'chainId',
  Nonce: 'nonce',
  'Issued At': 'issuedAt',
  'Expiration Time': 'expirationTime',
  'Not Before': 'notBefore',
  'Request ID': 'requestId',
};

/**
 * Parses a Sign-In-With-Solana message (ABNF derived from EIP-4361) into its
 * fields. Best-effort: returns null when the header line does not match, so
 * callers can fall back to showing the raw message verbatim. Never throws.
 *
 * TODO(OCMS Fase 2b): remove once native `solana:signIn` replaces the SIWS-over-
 * raw-signMessage flow. Must land atomically with the app/UI wiring so no
 * consumer is left calling this against a message that no longer arrives this way.
 */
export function parseSiwsMessage(text: string): ParsedSiwsMessage | null {
  if (!text) return null;

  const lines = text.split('\n');
  const headerMatch = lines[0]?.match(SIWS_HEADER);
  if (!headerMatch) return null;

  const address = lines[1]?.trim();
  if (!address) return null;

  const result: ParsedSiwsMessage = {
    domain: headerMatch[1].trim(),
    address,
  };

  const statementLines: string[] = [];
  const resources: string[] = [];
  let seenField = false;
  let inResources = false;

  for (let i = 2; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();

    if (inResources) {
      if (trimmed.startsWith('- ')) resources.push(trimmed.slice(2).trim());
      continue;
    }

    if (trimmed === 'Resources:') {
      seenField = true;
      inResources = true;
      continue;
    }

    const fieldMatch = trimmed.match(/^([A-Za-z][A-Za-z ]*?): (.+)$/);
    const fieldKey = fieldMatch ? SIWS_FIELDS[fieldMatch[1]] : undefined;
    if (fieldMatch && fieldKey) {
      seenField = true;
      (result as unknown as Record<string, string>)[fieldKey] = fieldMatch[2].trim();
      continue;
    }

    if (!seenField && trimmed) statementLines.push(trimmed);
  }

  if (statementLines.length) result.statement = statementLines.join(' ');
  if (resources.length) result.resources = resources;

  return result;
}

export function buildTransactionFromEncodedMessage(encodedMessage: string): ParsedSolanaTransaction {
  const bytes = bs58.decode(encodedMessage);

  try {
    const versionedMessage = VersionedMessage.deserialize(bytes);
    return {
      type: 'versioned',
      message: versionedMessage,
      tx: new VersionedTransaction(versionedMessage),
    };
  } catch {
    const message = Message.from(bytes);
    return {
      type: 'legacy',
      message,
      tx: Transaction.populate(message),
    };
  }
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
        'solana:signOffchainMessage instead.',
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
    VersionedMessage.deserialize(bytes);
    return true;
  } catch {
    // Not a versioned message — fall through to the legacy check.
  }

  try {
    Message.from(bytes);
    return true;
  } catch {
    return false;
  }
}

export function getDAppTransactionRequestSummary(
  method: DAppTransactionRequest['method'],
): DAppTransactionRequest['method'] {
  return method;
}

export async function loadSolanaTransactionApprovalDetails(
  account: SolanaAccount,
  request: DAppTransactionRequest,
): Promise<SolanaTransactionApprovalDetails> {
  await fetchAndMergeNetworkConfigs();

  const encodedMessage = request.method === 'signAllTransactions'
    ? request.params?.messages?.[0] ?? ''
    : request.params?.message ?? '';

  if (!encodedMessage) {
    throw new Error(
      request.method === 'signAllTransactions' ? 'Missing messages' : 'Missing message',
    );
  }

  const parsed = buildTransactionFromEncodedMessage(encodedMessage);
  const connection = await account.getConnection();

  if (parsed.type === 'legacy') {
    const fee = await connection.getFeeForMessage(parsed.message);
    return {
      feeLamports: fee.value ?? null,
      instructionCount: parsed.message.instructions.length,
      feePayer: parsed.message.accountKeys?.[0]?.toBase58?.() ?? null,
      recentBlockhash: parsed.message.recentBlockhash ?? null,
    };
  }

  const fee = await connection.getFeeForMessage(parsed.message);
  const staticAccountKeys = parsed.message.staticAccountKeys;
  const blockhash = parsed.message.recentBlockhash;

  return {
    feeLamports: fee.value ?? null,
    instructionCount: parsed.message.compiledInstructions.length,
    feePayer: staticAccountKeys?.[0]?.toBase58?.() ?? null,
    recentBlockhash: blockhash ?? null,
  };
}

export function approveSolanaSignMessage(
  account: SolanaAccount,
  data: number[],
): DAppSignMessageApprovalPayload {
  const messageBytes = Uint8Array.from(data);
  if (isTransactionLookalike(messageBytes)) {
    throw new TransactionLookalikeMessageError();
  }
  const signature = nacl.sign.detached(messageBytes, account.keyPair.secretKey);

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
 * @param requiredSigners - Accounts required to sign this message, per the OCMS spec
 */
export function approveSolanaSignOffchainMessage(
  account: SolanaAccount,
  data: number[],
  requiredSigners: PublicKey[],
): DAppSignOffchainMessageApprovalPayload {
  const messageBytes = Uint8Array.from(data);
  const { signature, buffer } = signOffchainMessage(account, messageBytes, requiredSigners);

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
  requiredSigners: string[],
): ReturnType<typeof parseOffchainMessageV1> {
  const contentBytes = Uint8Array.from(data);
  const signers = requiredSigners.map((address) => new PublicKey(address));
  const buffer = buildOffchainMessageV1(contentBytes, signers);
  return parseOffchainMessageV1(buffer);
}

export async function approveSolanaTransactionRequest(
  account: SolanaAccount,
  request: DAppTransactionRequest,
): Promise<
  | DAppSignTransactionApprovalPayload
  | DAppSignAllTransactionsApprovalPayload
  | DAppSignAndSendTransactionApprovalPayload
> {
  const publicKey = account.getReceiveAddress();

  if (request.method === 'signTransaction') {
    const encodedMessage = request.params?.message ?? '';
    if (!encodedMessage) throw new Error('Missing message');
    const parsed = buildTransactionFromEncodedMessage(encodedMessage);

    if (parsed.type === 'legacy') {
      parsed.tx.partialSign(account.keyPair);
      if (!parsed.tx.signature) throw new Error('Failed to sign transaction');
      return {
        signature: bs58.encode(parsed.tx.signature),
        publicKey,
      };
    }

    parsed.tx.sign([account.keyPair]);
    const signerIndex = getVersionedSignerIndex(parsed.message, account.keyPair.publicKey);
    const signature = parsed.tx.signatures[signerIndex];
    if (!signature) throw new Error('Failed to sign transaction');
    return {
      signature: bs58.encode(signature),
      publicKey,
    };
  }

  if (request.method === 'signAllTransactions') {
    const encodedMessages = request.params?.messages ?? [];
    if (!encodedMessages.length) throw new Error('Missing messages');

    const signatures = encodedMessages.map((encodedMessage) => {
      const parsed = buildTransactionFromEncodedMessage(encodedMessage);

      if (parsed.type === 'legacy') {
        parsed.tx.partialSign(account.keyPair);
        if (!parsed.tx.signature) throw new Error('Failed to sign one of the transactions');
        return bs58.encode(parsed.tx.signature);
      }

      parsed.tx.sign([account.keyPair]);
      const signerIndex = getVersionedSignerIndex(parsed.message, account.keyPair.publicKey);
      const signature = parsed.tx.signatures[signerIndex];
      if (!signature) {
        throw new Error('Failed to sign one of the transactions');
      }
      return bs58.encode(signature);
    });

    return {
      signatures,
      publicKey,
    };
  }

  const encodedMessage = request.params?.message ?? '';
  if (!encodedMessage) throw new Error('Missing message');

  const parsed = buildTransactionFromEncodedMessage(encodedMessage);
  await fetchAndMergeNetworkConfigs();
  const connection = await account.getConnection();
  const options = request.params?.options as Record<string, unknown> | undefined;

  if (parsed.type === 'legacy') {
    parsed.tx.partialSign(account.keyPair);
    const signature = await connection.sendRawTransaction(
      parsed.tx.serialize(),
      options as never,
    );
    return { signature };
  }

  parsed.tx.sign([account.keyPair]);
  const signature = await connection.sendTransaction(parsed.tx, options as never);
  return { signature };
}

export function serializeSignedTransactionFromApproval(
  encodedMessage: string,
  publicKey: string,
  signature: string,
): Uint8Array {
  const parsed = buildTransactionFromEncodedMessage(encodedMessage);
  const signerPublicKey = new PublicKey(publicKey);
  const signatureBytes = bs58.decode(signature);

  if (parsed.type === 'legacy') {
    parsed.tx.addSignature(signerPublicKey, Buffer.from(signatureBytes));
    return parsed.tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
  }

  const signerIndex = getVersionedSignerIndex(parsed.message, signerPublicKey);
  parsed.tx.signatures[signerIndex] = signatureBytes;
  return parsed.tx.serialize();
}

export function serializeSignedTransactionsFromApproval(
  encodedMessages: string[],
  publicKey: string,
  signatures: string[],
): Uint8Array[] {
  if (encodedMessages.length !== signatures.length) {
    throw new Error('Mismatched messages and signatures');
  }

  return encodedMessages.map((encodedMessage, index) =>
    serializeSignedTransactionFromApproval(encodedMessage, publicKey, signatures[index]),
  );
}
