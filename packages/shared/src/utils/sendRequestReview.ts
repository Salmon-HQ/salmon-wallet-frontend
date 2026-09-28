/**
 * What the review shows about a payment request, decided once for both twins
 * (spec 033 US3): the requester's own words above what the request fixed, and
 * whether the account can cover it — the wallet never substitutes a token.
 */
import type { SendRequest } from '../types/ui/send-sheet';

export interface SendRequestReviewRow {
  key: 'requestedBy' | 'for' | 'memo';
  /** Translation key for the row's label. */
  labelKey: string;
  value: string;
  testID: string;
}

/** The rows a request adds above the amount; none without one. */
export function sendRequestReviewRows(request: SendRequest | null): SendRequestReviewRow[] {
  if (!request) return [];
  const rows: SendRequestReviewRow[] = [];
  if (request.request.label !== undefined) {
    rows.push({
      key: 'requestedBy',
      labelKey: 'send.request.requestedBy',
      value: request.request.label,
      testID: 'send-review-requested-by',
    });
  }
  if (request.request.message !== undefined) {
    rows.push({
      key: 'for',
      labelKey: 'send.request.for',
      value: request.request.message,
      testID: 'send-review-for',
    });
  }
  // The memo is the one request field that is signed: it goes on chain as an
  // SPL Memo instruction attributed to the payer, while the label and the
  // message above it never leave the device. Showing the two that are not
  // signed and hiding the one that is had it exactly backwards.
  if (request.request.memo !== undefined) {
    rows.push({
      key: 'memo',
      labelKey: 'send.request.memo',
      value: request.request.memo,
      testID: 'send-review-memo',
    });
  }
  return rows;
}

/** A request fixed the amount and the balance does not reach it. */
export function isSendRequestUnderfunded(
  request: SendRequest | null,
  amount: string,
  liveBalance: number | undefined
): boolean {
  return request?.locked.amount === true && (liveBalance ?? 0) < parseFloat(amount);
}
