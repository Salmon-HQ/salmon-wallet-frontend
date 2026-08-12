/**
 * Anonymity guardrail.
 *
 * `validateEvent` is the choke point every event passes through on the client
 * (and again, independently, on the backend). It enforces the allow-list from
 * `./events` and rejects anything that could deanonymise a user: addresses,
 * token mints, raw numbers, or oversized free-form strings.
 */

import { isAnalyticsEvent, isAllowedPropKey, PROP_ENUMS, type AnalyticsEventName } from './events';
import type { AnalyticsProps, AnalyticsPropValue } from './types';

/** Max length for any string prop value. Long strings smell like dumped data. */
export const MAX_PROP_STRING_LENGTH = 32;

/** Base58 string in the 32–44 char range — i.e. a Solana address or mint. */
const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** 0x-prefixed 40-hex — i.e. an EVM address. */
const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/**
 * Whether a string looks like a wallet address or token mint. Conservative on
 * purpose: a false positive drops one harmless prop, a false negative leaks an
 * identifier.
 */
export function isAddressLike(value: string): boolean {
  return BASE58_ADDRESS.test(value) || HEX_ADDRESS.test(value);
}

/** Raised when an event violates the guardrail. */
export class AnalyticsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyticsValidationError';
  }
}

/** Validates a single prop value against the guardrail. Throws on violation. */
function assertValidPropValue(key: string, value: AnalyticsPropValue): void {
  if (typeof value === 'boolean') return;

  if (typeof value !== 'string') {
    throw new AnalyticsValidationError(
      `prop "${key}" must be a string or boolean, got ${typeof value}`
    );
  }

  // Address check first: a 32–44 char base58 string is an address, and should
  // be reported as one rather than as a generic "too long" value.
  if (isAddressLike(value)) {
    throw new AnalyticsValidationError(`prop "${key}" looks like an address/mint`);
  }

  if (value.length > MAX_PROP_STRING_LENGTH) {
    throw new AnalyticsValidationError(`prop "${key}" exceeds ${MAX_PROP_STRING_LENGTH} chars`);
  }

  const allowedValues = PROP_ENUMS[key as keyof typeof PROP_ENUMS];
  if (allowedValues && !allowedValues.includes(value)) {
    throw new AnalyticsValidationError(
      `prop "${key}" value "${value}" is not one of: ${allowedValues.join(', ')}`
    );
  }
}

/** Result of a successful validation: the event name and its cleaned props. */
export interface ValidatedEvent {
  event: AnalyticsEventName;
  props: AnalyticsProps;
}

/**
 * Validates an event name + props against the catalog and guardrail.
 *
 * @throws {AnalyticsValidationError} when the name is unknown, a key is not
 *   allow-listed, or a value fails the guardrail.
 */
export function validateEvent(name: string, props: AnalyticsProps = {}): ValidatedEvent {
  if (!isAnalyticsEvent(name)) {
    throw new AnalyticsValidationError(`unknown event "${name}"`);
  }

  const cleaned: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    if (!isAllowedPropKey(key)) {
      throw new AnalyticsValidationError(`prop key "${key}" is not allow-listed`);
    }
    assertValidPropValue(key, value);
    cleaned[key] = value;
  }

  return { event: name, props: cleaned };
}

/** Non-throwing variant. Returns null instead of raising. */
export function safeValidateEvent(name: string, props: AnalyticsProps = {}): ValidatedEvent | null {
  try {
    return validateEvent(name, props);
  } catch {
    return null;
  }
}
