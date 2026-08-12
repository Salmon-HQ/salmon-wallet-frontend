/**
 * Address validation utilities.
 *
 * Extracted from useAddressValidation.ts.
 *
 * @module utils/validation
 */

import type { ValidationResult, ValidationState } from '../types/validation';

/**
 * Validation result code to message mapping.
 */
/**
 * Validation result code to translation-key mapping. Render sites resolve
 * these through t() so every platform shows localized copy.
 */
export const VALIDATION_MESSAGES: Record<string, string> = {
  // Shared
  network_error: 'send.validation.network_error',
  // Solana
  invalid: 'send.validation.invalid',
  invalid_domain: 'send.validation.invalid_domain',
  same_address: 'send.validation.same_address',
  no_info: 'send.validation.no_info',
  off_curve_no_funds: 'send.validation.off_curve_no_funds',
  off_curve_has_funds: 'send.validation.off_curve_has_funds',
  // Ethereum
  no_funds: 'send.validation.no_funds',
};

/**
 * Maps ValidationResult to ValidationState.
 */
export function getValidationState(
  result: ValidationResult | null,
  isValidating: boolean
): ValidationState {
  if (isValidating) return 'loading';
  if (!result) return 'idle';

  switch (result.type) {
    case 'SUCCESS':
      return 'valid';
    case 'WARNING':
      return 'warning';
    case 'ERROR':
      return 'invalid';
    default:
      return 'idle';
  }
}

/**
 * Gets the message type for styling.
 */
export function getMessageType(result: ValidationResult | null): 'error' | 'warning' | null {
  if (!result) return null;
  if (result.type === 'ERROR') return 'error';
  if (result.type === 'WARNING') return 'warning';
  return null;
}
