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

export interface MerchantDetails {
  /** The merchant's own name for itself: a claim, shown beside the domain. */
  label: string;
  icon: string;
  /** `icon` when it is `https:`; `null` draws the placeholder. */
  iconToRender: string | null;
  /** The link's host: what the user can actually check. */
  domain: string;
}

export interface MerchantTransactionResponse {
  /** Base64 wire transaction; untrusted until `prepareMerchantTransaction` checked it. */
  transaction: string;
  message?: string;
}

export interface MerchantRequestOptions {
  signal?: AbortSignal;
}

const ICON_PATH = /\.(svg|png|webp)$/i;

// The standard asks that the request not identify the wallet or the user:
// no cookies, no referrer, no wallet-added header beyond what JSON needs.
const TRANSPORT: RequestInit = {
  credentials: 'omit',
  referrerPolicy: 'no-referrer',
  cache: 'no-store',
  redirect: 'error',
};

async function requestJson(link: TransactionRequestLink, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(link.url, { ...TRANSPORT, ...init });
  } catch {
    // A network error and a CORS refusal look the same from inside a page.
    throw new TransactionRequestError('unreachable');
  }
  if (!response.ok) throw new TransactionRequestError('merchantError');
  try {
    return await response.json();
  } catch {
    throw new TransactionRequestError('unreadable');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function iconUrl(icon: string): URL | null {
  try {
    const url = new URL(icon);
    return (url.protocol === 'https:' || url.protocol === 'http:') && ICON_PATH.test(url.pathname)
      ? url
      : null;
  } catch {
    return null;
  }
}

/** GET: the merchant's label and icon, shown while the payment is prepared. */
export async function fetchMerchantDetails(
  link: TransactionRequestLink,
  { signal }: MerchantRequestOptions = {}
): Promise<MerchantDetails> {
  const body = await requestJson(link, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!isRecord(body) || typeof body.label !== 'string' || !body.label.trim()) {
    throw new TransactionRequestError('unreadable');
  }
  const icon = typeof body.icon === 'string' ? iconUrl(body.icon) : null;
  if (!icon) throw new TransactionRequestError('malformedIcon');
  return {
    label: body.label.trim(),
    icon: body.icon as string,
    iconToRender: icon.protocol === 'https:' ? (body.icon as string) : null,
    domain: link.host,
  };
}

/** POST `{"account"}`: the transaction the merchant built for that address. */
export async function fetchMerchantTransaction(
  link: TransactionRequestLink,
  account: string,
  { signal }: MerchantRequestOptions = {}
): Promise<MerchantTransactionResponse> {
  const body = await requestJson(link, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ account }),
    signal,
  });
  if (!isRecord(body) || typeof body.transaction !== 'string' || !body.transaction) {
    throw new TransactionRequestError('unreadable');
  }
  // Every other field, `redirect` included, is ignored: following it would
  // open a page the merchant chose from inside the wallet.
  return typeof body.message === 'string' && body.message
    ? { transaction: body.transaction, message: body.message }
    : { transaction: body.transaction };
}
