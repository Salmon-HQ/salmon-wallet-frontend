/**
 * The Solana Pay transaction request (spec 043, contracts/transaction-request.md):
 * a `solana:` link that names a merchant's HTTPS address instead of a
 * recipient. The wallet asks that server for its label and icon, posts the
 * user's address, and gets back a transaction the merchant built.
 *
 * Everything the merchant answers is untrusted. This module only reads the
 * link and talks to the server; the transaction itself is checked in
 * `transaction-request-checks.ts`.
 */

/** Why a transaction request stops; each has its own `solanaPay.errors.<reason>` copy. */
export type TransactionRequestRefusal =
  | 'watchOnly'
  | 'malformedLink'
  | 'unreachable'
  | 'merchantError'
  | 'unreadable'
  | 'malformedIcon'
  | 'malformedTransaction'
  | 'invalidSignature'
  | 'notForThisAccount'
  | 'alreadySigned'
  | 'missingSignature'
  | 'staleOrWrongNetwork'
  | 'expired'
  | 'accountChanged';

/** A refusal, with the merchant's own words when its error answer carried some. */
export class TransactionRequestError extends Error {
  constructor(
    readonly reason: TransactionRequestRefusal,
    readonly merchantMessage?: string
  ) {
    super(`solanaPay.errors.${reason}`);
    this.name = 'TransactionRequestError';
  }
}

export interface TransactionRequestLink {
  /** The merchant's absolute HTTPS address, query string included. */
  url: string;
  /** Its host, punycode for international names: what the user can check. */
  host: string;
}

export type TransactionRequestLinkResult =
  { ok: true; link: TransactionRequestLink } | { ok: false; reason: 'malformedLink' };

const SCHEME = /^solana:(.*)$/i;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * A QR must not make the wallet post the user's address to a device on the
 * local network, so literal addresses and `localhost` are refused. A public
 * name that resolves to a private address is not covered.
 */
function isLocalHost(hostname: string): boolean {
  return (
    hostname.startsWith('[') ||
    IPV4.test(hostname) ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost')
  );
}

/**
 * Reads `solana:<link>`. The link is URL-decoded exactly once (the standard
 * encodes it when it carries a query string), must be absolute HTTPS, and
 * keeps its query string for both requests.
 */
export function parseTransactionRequestLink(raw: string): TransactionRequestLinkResult {
  const malformed = { ok: false, reason: 'malformedLink' } as const;
  const match = SCHEME.exec(raw.trim());
  if (!match) return malformed;

  let parsed: URL;
  try {
    parsed = new URL(decodeURIComponent(match[1]));
  } catch {
    return malformed;
  }
  if (parsed.protocol !== 'https:' || isLocalHost(parsed.hostname)) return malformed;
  return { ok: true, link: { url: parsed.href, host: parsed.hostname } };
}
