/**
 * The Solana Pay transfer request — the one message that crosses between a
 * wallet that asks and a wallet that pays (spec 033, contracts/transfer-request-uri.md).
 *
 *   solana:<recipient>?amount=&spl-token=&reference=*&label=&message=&memo=
 *
 * Written by the Payments Powerup, read by core Send, and interoperable with
 * every wallet that scans the standard. Parsed by hand: the grammar is one
 * path and seven query keys, and the request must be refused with the part
 * that could not be read named, which a generic URL parser cannot say.
 */
import { isAddress } from '@solana/kit';

export interface TransferRequest {
  /** Base58 address of the account being paid. */
  recipient: string;
  /** Decimal amount in user units; absent means the payer is asked. */
  amount?: string;
  /** Base58 mint; absent means native SOL. */
  splToken?: string;
  /** Base58 32-byte keys the transfer must carry as read-only metas, in order. */
  references: readonly string[];
  label?: string;
  message?: string;
  memo?: string;
}

export type TransferRequestParseReason =
  | 'notSolanaPay'
  | 'transactionRequest'
  | 'recipient'
  | 'amount'
  | 'splToken'
  | 'reference'
  | 'memoTooLong';

export type TransferRequestParseResult =
  { ok: true; request: TransferRequest } | { ok: false; reason: TransferRequestParseReason };

/** The memo program accepts more, but a memo is a label, not a document. */
export const TRANSFER_REQUEST_MEMO_MAX_BYTES = 256;

const SCHEME = /^solana:(.*)$/i;
/** Leading zero required, no exponent, no sign; decimals unbounded here (the token bounds them at pay time). */
const AMOUNT = /^(0|[1-9]\d*)(\.\d+)?$/;

/** True when the payload is addressed to the standard at all. */
export function isTransferRequestUri(raw: string): boolean {
  return SCHEME.test(raw.trim());
}

function decode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function parseTransferRequest(raw: string): TransferRequestParseResult {
  const match = SCHEME.exec(raw.trim());
  if (!match) return { ok: false, reason: 'notSolanaPay' };

  const queryAt = match[1].indexOf('?');
  const rawPath = queryAt === -1 ? match[1] : match[1].slice(0, queryAt);
  const rawQuery = queryAt === -1 ? '' : match[1].slice(queryAt + 1);

  const recipient = decode(rawPath);
  if (recipient === null) return { ok: false, reason: 'recipient' };
  // SPEC 1.1: a transaction request is `solana:<https link>`; v1 pays transfer requests only.
  if (/^https?:\/\//i.test(recipient)) return { ok: false, reason: 'transactionRequest' };
  if (!isAddress(recipient)) return { ok: false, reason: 'recipient' };

  const request: TransferRequest = { recipient, references: [] };
  const references: string[] = [];

  for (const pair of rawQuery ? rawQuery.split('&') : []) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const value = decode(eq === -1 ? '' : pair.slice(eq + 1));
    if (value === null) return { ok: false, reason: 'notSolanaPay' };

    switch (key) {
      case 'amount':
        if (!AMOUNT.test(value)) return { ok: false, reason: 'amount' };
        request.amount = value;
        break;
      case 'spl-token':
        if (!isAddress(value)) return { ok: false, reason: 'splToken' };
        request.splToken = value;
        break;
      case 'reference':
        // A reference is any base58 32-byte value; `isAddress` checks exactly that.
        if (!isAddress(value)) return { ok: false, reason: 'reference' };
        references.push(value);
        break;
      case 'label':
        request.label = value.trim() || undefined;
        break;
      case 'message':
        request.message = value.trim() || undefined;
        break;
      case 'memo':
        if (utf8Bytes(value) > TRANSFER_REQUEST_MEMO_MAX_BYTES) {
          return { ok: false, reason: 'memoTooLong' };
        }
        request.memo = value;
        break;
      default:
        // Unknown keys are ignored, as the standard asks.
        break;
    }
  }

  return { ok: true, request: { ...request, references } };
}

/** The inverse of `parseTransferRequest` for the fields present; key order is the standard's. */
export function encodeTransferRequest(request: TransferRequest): string {
  const params: string[] = [];
  const push = (key: string, value: string | undefined) => {
    if (value !== undefined && value !== '') {
      params.push(`${key}=${encodeURIComponent(value)}`);
    }
  };
  push('amount', request.amount);
  push('spl-token', request.splToken);
  for (const reference of request.references) push('reference', reference);
  push('label', request.label);
  push('message', request.message);
  push('memo', request.memo);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return `solana:${request.recipient}${query}`;
}
