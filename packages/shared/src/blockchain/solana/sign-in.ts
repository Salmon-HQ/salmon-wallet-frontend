/**
 * Native Sign-In-With-Solana (SIWS) primitive for the Wallet Standard
 * `solana:signIn` feature (https://github.com/phantom/sign-in-with-solana).
 *
 * Security core: the WALLET constructs the SIWS message. The `domain` line is
 * always derived from the real requesting origin (the connection the request
 * arrived on), never from dApp-supplied text. A dApp that claims a different
 * domain in its input is flagged (`domainMismatch`) and refused at signing time
 * — domain spoofing is prevented by construction, replacing the old heuristic
 * that parsed dApp-supplied SIWS text out of raw `signMessage` bytes.
 *
 * Per Wallet Standard PR#93, `useOffchainMessage: { messageVersion: 1 }` asks
 * the wallet to sign the constructed SIWS text wrapped in an OCMS v1 envelope
 * (see `./offchain-message.ts`) instead of signing the raw UTF-8 bytes.
 */
import { signBytes } from '@solana/kit';
import { address } from '@solana/addresses';
import { signOffchainMessage } from './offchain-message';
import type { SolanaAccount } from './SolanaAccount';

/**
 * JSON-safe mirror of the Wallet Standard `SolanaSignInInput` (v1.1.0, incl.
 * the PR#93 `useOffchainMessage` extension). All fields are optional strings,
 * so the shape crosses the postMessage/bridge boundary unchanged.
 */
export interface SolanaSignInInputFields {
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
  /** PR#93: sign the SIWS message wrapped in an OCMS v1 envelope. */
  useOffchainMessage?: { messageVersion: 1 };
}

/** SIWS fields as resolved by the wallet — `domain` and `address` are always present. */
export interface ResolvedSiwsFields extends Omit<
  SolanaSignInInputFields,
  'domain' | 'address' | 'useOffchainMessage'
> {
  domain: string;
  address: string;
}

export interface PreparedSignInMessage {
  /** Resolved fields actually used in the message (domain bound to the real origin). */
  fields: ResolvedSiwsFields;
  /** The exact SIWS message text that will be signed. */
  message: string;
  /** True when the dApp claimed a domain different from the real origin host. */
  domainMismatch: boolean;
  /** The dApp-claimed domain, when it mismatched. */
  requestedDomain?: string;
  /** True when the dApp requested an address other than the active account's. */
  addressMismatch: boolean;
}

/** Thrown when a dApp's claimed SIWS domain does not match the real requesting origin. */
export class SiwsDomainMismatchError extends Error {
  constructor(requestedDomain: string, realDomain: string) {
    super(
      `This app asked to sign in for "${requestedDomain}" but the request came from ` +
        `"${realDomain}". Signing was refused to prevent domain spoofing.`
    );
    this.name = 'SiwsDomainMismatchError';
    Object.setPrototypeOf(this, SiwsDomainMismatchError.prototype);
  }
}

/** Extracts the SIWS `domain` (host) from the real requesting origin. Throws on invalid origins. */
export function getSiwsDomain(origin: string): string {
  const host = new URL(origin).host;
  if (!host) throw new Error('Invalid origin: missing host');
  return host;
}

/**
 * Builds the canonical SIWS message text (ABNF derived from EIP-4361), matching
 * `createSignInMessageText` from `@solana/wallet-standard-util` byte-for-byte so
 * backends using `verifySignIn` can reconstruct and verify it.
 */
export function buildSiwsMessageText(fields: ResolvedSiwsFields): string {
  let message = `${fields.domain} wants you to sign in with your Solana account:\n`;
  message += `${fields.address}`;

  if (fields.statement) message += `\n\n${fields.statement}`;

  const lines: string[] = [];
  if (fields.uri) lines.push(`URI: ${fields.uri}`);
  if (fields.version) lines.push(`Version: ${fields.version}`);
  if (fields.chainId) lines.push(`Chain ID: ${fields.chainId}`);
  if (fields.nonce) lines.push(`Nonce: ${fields.nonce}`);
  if (fields.issuedAt) lines.push(`Issued At: ${fields.issuedAt}`);
  if (fields.expirationTime) lines.push(`Expiration Time: ${fields.expirationTime}`);
  if (fields.notBefore) lines.push(`Not Before: ${fields.notBefore}`);
  if (fields.requestId) lines.push(`Request ID: ${fields.requestId}`);
  // Gated on presence, not length: @solana/wallet-standard-util's
  // createSignInMessageText emits a bare `Resources:` line for a truthy empty
  // array too, so an explicit `resources: []` must match that, not silently
  // drop the header.
  if (fields.resources) {
    lines.push('Resources:');
    for (const resource of fields.resources) lines.push(`- ${resource}`);
  }
  if (lines.length) message += `\n\n${lines.join('\n')}`;

  return message;
}

/**
 * Resolves a dApp's `SolanaSignInInput` into the exact SIWS message the wallet
 * will sign. `domain` is always the real origin's host and `address` is always
 * the wallet's active account — dApp-supplied values are compared, never used.
 * Both the approval UI and `approveSolanaSignIn` call this, so the screen shows
 * exactly what gets signed.
 *
 * Throws on structurally invalid input (bad origin, multi-line statement, or a
 * field value containing a line break, which could forge extra message lines).
 */
export function prepareSignInMessage(
  input: SolanaSignInInputFields,
  origin: string,
  walletAddress: string
): PreparedSignInMessage {
  const domain = getSiwsDomain(origin);

  const singleLineFields: [string, string | undefined][] = [
    ['statement', input.statement],
    ['uri', input.uri],
    ['version', input.version],
    ['chainId', input.chainId],
    ['nonce', input.nonce],
    ['issuedAt', input.issuedAt],
    ['expirationTime', input.expirationTime],
    ['notBefore', input.notBefore],
    ['requestId', input.requestId],
    ...(input.resources ?? []).map((resource, index): [string, string] => [
      `resources[${index}]`,
      resource,
    ]),
  ];
  for (const [name, value] of singleLineFields) {
    if (value !== undefined && /[\r\n]/.test(value)) {
      throw new Error(`Invalid sign-in input: "${name}" must not contain line breaks`);
    }
  }

  const fields: ResolvedSiwsFields = {
    domain,
    address: walletAddress,
    statement: input.statement,
    uri: input.uri,
    version: input.version,
    chainId: input.chainId,
    nonce: input.nonce,
    issuedAt: input.issuedAt,
    expirationTime: input.expirationTime,
    notBefore: input.notBefore,
    requestId: input.requestId,
    resources: input.resources,
  };

  const domainMismatch = input.domain !== undefined && input.domain !== domain;
  const addressMismatch = input.address !== undefined && input.address !== walletAddress;

  return {
    fields,
    message: buildSiwsMessageText(fields),
    domainMismatch,
    requestedDomain: domainMismatch ? input.domain : undefined,
    addressMismatch,
  };
}

export interface SignedSignInMessage {
  /** The SIWS message text that was signed (before any OCMS envelope). */
  message: string;
  /** The exact bytes that were signed: raw UTF-8, or the OCMS v1 envelope. */
  signedMessage: Uint8Array;
  /** Raw 64-byte ed25519 signature over `signedMessage`. */
  signature: Uint8Array;
  /** Present when the OCMS-envelope path (PR#93 `useOffchainMessage`) was used. */
  signedMessageFormat?: { kind: 'offchainMessage'; messageVersion: 1 };
}

/**
 * Builds and signs the SIWS message for `input` from `origin` with `account`.
 * Refuses to sign on domain or address mismatch — the flags that
 * `prepareSignInMessage` surfaces for the approval UI are hard errors here.
 */
export async function signSiwsMessage(
  account: SolanaAccount,
  input: SolanaSignInInputFields,
  origin: string
): Promise<SignedSignInMessage> {
  const walletAddress = account.getReceiveAddress();
  const prepared = prepareSignInMessage(input, origin, walletAddress);

  if (prepared.domainMismatch) {
    throw new SiwsDomainMismatchError(prepared.requestedDomain ?? '', prepared.fields.domain);
  }
  if (prepared.addressMismatch) {
    throw new Error(
      `This app asked to sign in with address "${input.address}", which is not the active account.`
    );
  }

  const messageBytes = new TextEncoder().encode(prepared.message);

  if (input.useOffchainMessage) {
    if (input.useOffchainMessage.messageVersion !== 1) {
      throw new Error('Unsupported off-chain message version');
    }
    const { signature, buffer } = await signOffchainMessage(account, messageBytes, [
      address(walletAddress),
    ]);
    return {
      message: prepared.message,
      signedMessage: buffer,
      signature,
      signedMessageFormat: { kind: 'offchainMessage', messageVersion: 1 },
    };
  }

  const signature = await signBytes(account.signer.keyPair.privateKey, messageBytes);
  return { message: prepared.message, signedMessage: messageBytes, signature };
}
