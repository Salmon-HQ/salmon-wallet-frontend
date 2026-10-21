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
  'wallet_created',
  'wallet_recovered',
  // Activation
  'first_send_completed',
  // Recurring use
  'send_completed',
  'nft_viewed',
  'nft_sent',
  // Feature adoption
  'network_switched',
  'wallet_switched',
  'address_book_used',
  // App use
  'app_opened',
  // Powerups
  'powerup_installed',
  'powerup_uninstalled',
  'swap_completed',
  'first_swap_completed',
  'memo_sent',
  'payment_request_created',
  'payment_request_paid',
  // dApps (never with anything that identifies the dApp)
  'dapp_connected',
  'dapp_message_signed',
  'dapp_transaction_signed',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/**
 * The 9 events the v1 consent text described. An install that consented under
 * that text sends only these until it accepts the v2 text (FR-021).
 */
export const V1_EVENTS: readonly AnalyticsEventName[] = ANALYTICS_EVENTS.slice(0, 9);

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
 * The Powerups registry's ids, written out rather than derived: the list must
 * stay closed and identical on the backend, and a build with Powerups compiled
 * out would derive an empty one. `events.test.ts` checks the registry against it.
 */
export const POWERUP_IDS = ['swap', 'payments', 'memo', 'skr'] as const;

/**
 * The only prop keys any event may carry. Values are further constrained by
 * `PROP_ENUMS` and the guardrail in `./schema`.
 */
export const ALLOWED_PROP_KEYS = ['chain', 'from_chain', 'to_chain', 'success', 'powerup'] as const;

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
  powerup: POWERUP_IDS,
  // Every caller passes a boolean, which skips the string checks entirely. The
  // empty list is for the other case: a string reaching `success` is a mistake
  // or a smuggled value, and there is no spelling of it that is right.
  success: [],
};
