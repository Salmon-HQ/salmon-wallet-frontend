/**
 * Pure helpers over a payment request: amounts, expiry, the URI it becomes,
 * and the facts the sheet shows. Both twins render what these return.
 */
import { encodeTransferRequest } from '../../blockchain/solana/transfer-request';
import type { TransferRequestSettlementQuery } from '../../blockchain/solana/transfer-request-settlement';
import type { PaymentRequest, PaymentRequestState } from './types';

/** Leading digit required, dot or comma, at most six decimals (USDC). */
const AMOUNT = /^(\d+)(?:[.,](\d{1,6}))?$/;

export type AmountValidation =
  | { ok: true; atomic: string; display: string }
  | { ok: false; reason: 'invalid' | 'tooManyDecimals' | 'zero' };

/** A typed amount → atomic units, or why it cannot be one. */
export function validateAmount(input: string, decimals: number): AmountValidation {
  const trimmed = input.trim();
  if (trimmed === '') return { ok: false, reason: 'invalid' };
  if (/^\d+[.,]\d{7,}$/.test(trimmed)) return { ok: false, reason: 'tooManyDecimals' };
  const match = AMOUNT.exec(trimmed);
  if (!match) return { ok: false, reason: 'invalid' };
  const whole = match[1];
  const fraction = (match[2] ?? '').padEnd(decimals, '0');
  const atomic = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction || '0');
  if (atomic <= 0n) return { ok: false, reason: 'zero' };
  return {
    ok: true,
    atomic: atomic.toString(),
    display: formatAtomic(atomic.toString(), decimals),
  };
}

/** Atomic units → the shortest faithful decimal, at least two places. */
export function formatAtomic(atomic: string, decimals: number): string {
  const padded = atomic.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals);
  const fraction = padded.slice(padded.length - decimals).replace(/0+$/, '');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

export function requestIdFor(reference: string): string {
  return `pr_${reference.slice(0, 12)}`;
}

/** Pending, paid, or — judged now — expired. */
export function stateOf(request: PaymentRequest, now: number): PaymentRequestState {
  if (request.status === 'paid') return 'paid';
  return now > request.expiresAt ? 'expired' : 'pending';
}

/** The request as the standard writes it; `label` is the account's name now, never stored. */
export function uriFor(request: PaymentRequest, label: string): string {
  return encodeTransferRequest({
    recipient: request.recipient,
    amount: formatAtomic(request.amountAtomic, request.decimals),
    splToken: request.mint,
    references: [request.reference],
    label,
    message: request.note || undefined,
    memo: request.id,
  });
}

export function settlementQueryFor(request: PaymentRequest): TransferRequestSettlementQuery {
  return {
    reference: request.reference,
    mint: request.mint,
    recipientOwner: request.recipient,
    amountAtomic: request.amountAtomic,
  };
}

export function listKey(accountId: string, networkId: string): string {
  return `${accountId}:${networkId}`;
}

/** How long is left, in whole days / hours / minutes, never negative. */
export function remaining(
  expiresAt: number,
  now: number
): { days: number; hours: number; minutes: number } {
  const left = Math.max(0, expiresAt - now);
  const minutesTotal = Math.floor(left / 60_000);
  const days = Math.floor(minutesTotal / (24 * 60));
  const hours = Math.floor((minutesTotal - days * 24 * 60) / 60);
  const minutes = minutesTotal - days * 24 * 60 - hours * 60;
  return { days, hours, minutes };
}
