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
import { isReactNative } from '../../utils/platform';

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
  | 'accountChanged'
  /** The wallet's own RPC failed (the active network, not the merchant). */
  | 'networkUnavailable'
  /** A fault in the wallet itself: neither the merchant nor the network. */
  | 'unexpected';

/**
 * Each refusal's copy, spelled out so the i18n check sees every key in use
 * (a template string would hide them).
 */
export const SOLANA_PAY_ERROR_KEY: Record<TransactionRequestRefusal, string> = {
  watchOnly: 'solanaPay.errors.watchOnly',
  malformedLink: 'solanaPay.errors.malformedLink',
  unreachable: 'solanaPay.errors.unreachable',
  merchantError: 'solanaPay.errors.merchantError',
  unreadable: 'solanaPay.errors.unreadable',
  malformedIcon: 'solanaPay.errors.malformedIcon',
  malformedTransaction: 'solanaPay.errors.malformedTransaction',
  invalidSignature: 'solanaPay.errors.invalidSignature',
  notForThisAccount: 'solanaPay.errors.notForThisAccount',
  alreadySigned: 'solanaPay.errors.alreadySigned',
  missingSignature: 'solanaPay.errors.missingSignature',
  staleOrWrongNetwork: 'solanaPay.errors.staleOrWrongNetwork',
  expired: 'solanaPay.errors.expired',
  accountChanged: 'solanaPay.errors.accountChanged',
  networkUnavailable: 'solanaPay.errors.networkUnavailable',
  unexpected: 'solanaPay.errors.unexpected',
};

/** A refusal, with the merchant's own words when its error answer carried some. */
export class TransactionRequestError extends Error {
  constructor(
    readonly reason: TransactionRequestRefusal,
    readonly merchantMessage?: string
  ) {
    super(SOLANA_PAY_ERROR_KEY[reason]);
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
 * local network, so literal addresses, `localhost`, `.local` (mDNS) and
 * single-label names (resolved on the local network) are refused, with or
 * without the trailing dot of a fully qualified name. A public name that
 * resolves to a private address is not covered.
 */
function isLocalHost(hostname: string): boolean {
  const name = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
  return (
    name.startsWith('[') ||
    IPV4.test(name) ||
    !name.includes('.') ||
    name === 'localhost' ||
    name.endsWith('.localhost') ||
    name.endsWith('.local')
  );
}

/** Absolute HTTPS to a public name: what a merchant address must be, before and after redirects. */
function isPublicHttps(url: URL): boolean {
  return url.protocol === 'https:' && !isLocalHost(url.hostname);
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
  if (!isPublicHttps(parsed)) return malformed;
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
const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 64 * 1024;
const MERCHANT_MESSAGE_CHARS = 80;
const LABEL_CHARS = 64;
const MESSAGE_CHARS = 256;

/**
 * Control characters (Cc) and the Unicode bidi controls: a right-to-left
 * override inside a merchant's text can make it read as something else.
 */
const UNSAFE_CHARACTERS =
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  /[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Merchant text as the wallet shows it: plain, trimmed, at most `max` characters. */
function merchantText(text: string, max: number): string {
  return [...text.replace(UNSAFE_CHARACTERS, '').trim()].slice(0, max).join('').trim();
}

let merchantFetch: typeof fetch | null = null;

/**
 * The platform's fetch for merchant requests, when the global one does not
 * honour `redirect: 'error'` (React Native's follows every redirect; mobile
 * hands in `expo/fetch`). `null` goes back to the global fetch.
 */
export function setMerchantFetch(fetchImpl: typeof fetch | null): void {
  merchantFetch = fetchImpl;
}

/**
 * The standard asks that the request not identify the wallet or the user:
 * no cookies, no referrer, no wallet-added header beyond what JSON needs.
 * React Native's fetch turns `cache: 'no-store'` on a GET into an added
 * `_=<time>` query parameter, so there the GET goes without it and the
 * merchant gets its address exactly as the link gave it.
 */
function transport(method: 'GET' | 'POST'): RequestInit {
  const init: RequestInit = {
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    redirect: 'error',
  };
  if (!(method === 'GET' && isReactNative())) init.cache = 'no-store';
  return init;
}

/**
 * Where `redirect: 'error'` is not honoured (React Native follows redirects),
 * the answer must still come from the link's own host, by the link's rules.
 * An answer that does not say where it came from is not trusted: browsers
 * and React Native's XHR both report the final address, so an empty one means
 * the platform cannot vouch for it.
 */
function cameFromLink(response: Response, link: TransactionRequestLink): boolean {
  try {
    const url = new URL(response.url);
    return isPublicHttps(url) && url.hostname === link.host;
  } catch {
    return false;
  }
}

/** The body as text, refused past 64 KiB whether or not the server announced it. */
async function readCapped(response: Response): Promise<string> {
  if (Number(response.headers.get('Content-Length') ?? 0) > MAX_BODY_BYTES) {
    throw new TransactionRequestError('unreadable');
  }
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    // ponytail: without a stream (React Native) the body is read whole before
    // it can be measured; the announced size and the 10 s timeout bound it.
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      throw new TransactionRequestError('unreadable');
    }
    return text;
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      void reader.cancel().catch(() => undefined);
      throw new TransactionRequestError('unreadable');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** The merchant's own words from an error answer, cut to what the review shows. */
function merchantWords(text: string): string | undefined {
  try {
    const body: unknown = JSON.parse(text);
    if (isRecord(body) && typeof body.message === 'string') {
      return merchantText(body.message, MERCHANT_MESSAGE_CHARS) || undefined;
    }
  } catch {
    // Not JSON: the merchant said nothing the wallet can show.
  }
  return undefined;
}

async function requestJson(
  link: TransactionRequestLink,
  method: 'GET' | 'POST',
  init: RequestInit,
  callerSignal?: AbortSignal
): Promise<unknown> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  callerSignal?.addEventListener('abort', onAbort);
  const timer = setTimeout(onAbort, TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await (merchantFetch ?? fetch)(link.url, {
        ...transport(method),
        ...init,
        method,
        signal: controller.signal,
      });
    } catch {
      // A network error and a CORS refusal look the same from inside a page.
      throw new TransactionRequestError('unreachable');
    }
    if (!cameFromLink(response, link)) throw new TransactionRequestError('unreachable');

    let text = '';
    try {
      text = await readCapped(response);
    } catch {
      if (controller.signal.aborted) throw new TransactionRequestError('unreachable');
      // An error answer too large to read still says the merchant failed.
      if (response.ok) throw new TransactionRequestError('unreadable');
    }
    if (!response.ok) throw new TransactionRequestError('merchantError', merchantWords(text));
    try {
      return JSON.parse(text);
    } catch {
      throw new TransactionRequestError('unreadable');
    }
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', onAbort);
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
  const body = await requestJson(link, 'GET', { headers: { Accept: 'application/json' } }, signal);
  const label =
    isRecord(body) && typeof body.label === 'string' ? merchantText(body.label, LABEL_CHARS) : '';
  if (!isRecord(body) || !label) throw new TransactionRequestError('unreadable');
  const icon = typeof body.icon === 'string' ? iconUrl(body.icon) : null;
  if (!icon) throw new TransactionRequestError('malformedIcon');
  return {
    label,
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
  const body = await requestJson(
    link,
    'POST',
    {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ account }),
    },
    signal
  );
  if (!isRecord(body) || typeof body.transaction !== 'string' || !body.transaction) {
    throw new TransactionRequestError('unreadable');
  }
  // Every other field, `redirect` included, is ignored: following it would
  // open a page the merchant chose from inside the wallet.
  const message = typeof body.message === 'string' ? merchantText(body.message, MESSAGE_CHARS) : '';
  return message ? { transaction: body.transaction, message } : { transaction: body.transaction };
}
