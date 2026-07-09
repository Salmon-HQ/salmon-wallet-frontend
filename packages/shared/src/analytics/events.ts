/**
 * Anonymous usage-analytics event catalog.
 *
 * This is the single source of truth for what the wallet is allowed to emit.
 * Anonymity is enforced by an allow-list, not a deny-list: an event may only
 * carry keys from {@link ALLOWED_PROP_KEYS}, and every value must pass the
 * guardrail in `./schema`. Anything not listed here is rejected on both the
 * client and the backend.
 *
 * The backend (`salmon-api`) mirrors this catalog in
 * `src/analytics/event-schema.js`. Keep the two in sync — a change here must be
 * reflected there, and vice versa.
 */

/**
 * Behavioural funnel events. Names are stable identifiers; renaming one breaks
 * historical continuity, so treat them as an append-only contract.
 */
export const ANALYTICS_EVENTS = [
  // Onboarding
  'onboarding_started',
  'wallet_created',
  'wallet_recovered',
  'biometric_enabled',
  // Activation
  'first_receive_viewed',
  'first_send_completed',
  'first_swap_completed',
  // Recurring use
  'send_completed',
  'swap_completed',
  'nft_viewed',
  'nft_sent',
  // Feature adoption
  'settings_opened',
  'network_switched',
  'wallet_switched',
  'address_book_used',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

const EVENT_SET: ReadonlySet<string> = new Set(ANALYTICS_EVENTS);

/** Whether a raw string is a known, allowed event name. */
export function isAnalyticsEvent(name: string): name is AnalyticsEventName {
  return EVENT_SET.has(name);
}

/**
 * Supported blockchain families. `chain`, `from_chain` and `to_chain` props may
 * only hold one of these — never an address or a token mint.
 */
export const CHAINS = ['solana', 'bitcoin', 'ethereum'] as const;
export type Chain = (typeof CHAINS)[number];

/**
 * Coarse magnitude buckets. When a size genuinely matters for a funnel it is
 * reported as one of these ranges (USD-ish, unit-agnostic) — never the exact
 * amount, and never how much money a user holds.
 */
export const AMOUNT_BUCKETS = ['0-10', '10-100', '100-1k', '1k-10k', '10k+'] as const;
export type AmountBucket = (typeof AMOUNT_BUCKETS)[number];

/**
 * The only prop keys any event may carry. Values are further constrained by
 * `PROP_ENUMS` and the guardrail in `./schema`.
 */
export const ALLOWED_PROP_KEYS = [
  'chain',
  'from_chain',
  'to_chain',
  'success',
  'amount_bucket',
] as const;

export type AllowedPropKey = (typeof ALLOWED_PROP_KEYS)[number];

const ALLOWED_PROP_KEY_SET: ReadonlySet<string> = new Set(ALLOWED_PROP_KEYS);

/** Whether a raw string is an allowed prop key. */
export function isAllowedPropKey(key: string): key is AllowedPropKey {
  return ALLOWED_PROP_KEY_SET.has(key);
}

/**
 * Closed value sets for string-typed props. A key present here must hold one of
 * the listed values; a key absent here (e.g. none currently) accepts any string
 * that survives the address/length guardrail.
 */
export const PROP_ENUMS: Partial<Record<AllowedPropKey, readonly string[]>> = {
  chain: CHAINS,
  from_chain: CHAINS,
  to_chain: CHAINS,
  amount_bucket: AMOUNT_BUCKETS,
};

/**
 * Maps a raw numeric magnitude to a coarse bucket. Callers should bucket at the
 * edge and pass the string, so raw numbers never enter an event.
 */
export function toAmountBucket(value: number): AmountBucket {
  if (!Number.isFinite(value) || value < 10) return '0-10';
  if (value < 100) return '10-100';
  if (value < 1_000) return '100-1k';
  if (value < 10_000) return '1k-10k';
  return '10k+';
}
