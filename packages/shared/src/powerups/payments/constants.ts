import type { ExpiryKey } from './types';

export const PAYMENTS_ID = 'payments';

const HOUR_MS = 60 * 60 * 1000;

/** How long a request stays open, in the order the chips offer them. 24 h is preselected. */
export const EXPIRY_OPTIONS: readonly { key: ExpiryKey; ms: number; labelKey: string }[] = [
  { key: 'h1', ms: HOUR_MS, labelKey: 'payments.form.expiryOptions.h1' },
  { key: 'h24', ms: 24 * HOUR_MS, labelKey: 'payments.form.expiryOptions.h24' },
  { key: 'd7', ms: 7 * 24 * HOUR_MS, labelKey: 'payments.form.expiryOptions.d7' },
];

export const DEFAULT_EXPIRY: ExpiryKey = 'h24';

/** One light RPC read per tick while a pending request is on screen (research §R5). */
export const PAYMENTS_STATUS_POLL_MS = 5_000;

/** The countdown row recomputes on this clock; minutes are its resolution. */
export const PAYMENTS_COUNTDOWN_TICK_MS = 30_000;

/** A note is a label on a QR, not a document; it becomes the memo-bound `message`. */
export const PAYMENTS_NOTE_MAX_LENGTH = 80;
