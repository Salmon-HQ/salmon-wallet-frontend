/**
 * useAddressValidation Hook
 * Handles address validation with debounce for the InputAddress component.
 *
 * Platform-agnostic hook that can be used by both React Native (ui)
 * and React DOM (ui-extension) InputAddress components.
 *
 * Delegates validation to the account's `validateDestinationAccount()` method,
 * so chain dispatch and connection management are handled by the account instance.
 *
 * @param address - The address string to validate
 * @param account - The active blockchain account (owns its own connection/provider)
 * @param options - Configuration options
 * @returns Validation state and results
 *
 * @example
 * ```tsx
 * const {
 *   validationState,
 *   isValid,
 *   message,
 *   messageType,
 * } = useAddressValidation(address, activeBlockchainAccount, {
 *   debounceMs: 500,
 *   onValidation: (result) => console.log('Validated:', result),
 * });
 * ```
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { BlockchainAccount } from '../types/blockchain';
import type { ValidationResult, ValidationState, ValidationCallbackResult } from '../types/validation';
import { VALIDATION_MESSAGES, getValidationState, getMessageType } from '../utils/validation';

/**
 * Return type for useAddressValidation hook
 */
export interface UseAddressValidationResult {
  /** Current validation state */
  validationState: ValidationState;
  /** Full validation result */
  validationResult: ValidationResult | null;
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Whether the address is valid */
  isValid: boolean;
  /** Resolved public key (for domains) */
  resolvedAddress: string | null;
  /** Whether the input is a domain */
  isDomain: boolean;
  /** Error/warning message for display */
  message: string | null;
  /** Message type (error or warning) */
  messageType: 'error' | 'warning' | null;
}

/**
 * Options for useAddressValidation hook
 */
export interface UseAddressValidationParams {
  /** Debounce delay in milliseconds (default: 500) */
  debounceMs?: number;
  /** Callback when validation completes */
  onValidation?: (result: ValidationCallbackResult) => void;
}

// Default debounce delay in milliseconds
const DEFAULT_DEBOUNCE_MS = 500;

export function useAddressValidation(
  address: string,
  account: BlockchainAccount | undefined,
  options: UseAddressValidationParams = {}
): UseAddressValidationResult {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    onValidation,
  } = options;

  // State
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isDomain, setIsDomain] = useState(false);

  // Refs for cleanup and debounce
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Helper to process validation result
  const handleResult = useCallback(
    (result: ValidationResult) => {
      setValidationResult(result);
      setIsValidating(false);

      // Handle domain resolution
      const isAddressDomain = result.addressType === 'DOMAIN';
      setIsDomain(isAddressDomain);
      setResolvedAddress(result.resolvedAddress || null);

      // Call onValidation callback
      if (onValidation) {
        const callbackResult: ValidationCallbackResult = {
          isValid: result.type === 'SUCCESS' || result.type === 'WARNING',
          state: getValidationState(result, false),
          result,
          resolvedAddress: result.resolvedAddress,
          isDomain: isAddressDomain,
        };
        onValidation(callbackResult);
      }
    },
    [onValidation]
  );

  // Reset validation state
  const reset = useCallback(() => {
    setValidationResult(null);
    setResolvedAddress(null);
    setIsDomain(false);
    setIsValidating(false);
  }, []);

  // Validate address function — delegates to account.validateDestinationAccount()
  const validateAddress = useCallback(
    async (addressToValidate: string) => {
      if (!account) { reset(); return; }

      // Create new abort controller for this validation
      abortControllerRef.current = new AbortController();

      setIsValidating(true);
      setValidationResult(null);

      try {
        const result = await account.validateDestinationAccount(addressToValidate);

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        handleResult(result);
      } catch (error) {
        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        console.error('Address validation error:', error);
        setIsValidating(false);

        const errorResult: ValidationResult = {
          type: 'ERROR',
          code: 'network_error',
        };
        setValidationResult(errorResult);
        setResolvedAddress(null);
        setIsDomain(false);

        if (onValidation) {
          onValidation({
            isValid: false,
            state: 'invalid',
            result: errorResult,
          });
        }
      }
    },
    [account, onValidation, handleResult, reset]
  );

  // Effect to handle address changes with debounce
  useEffect(() => {
    // Cleanup previous validation
    cleanup();

    // Reset state if address is empty
    if (!address || address.trim() === '') {
      setValidationResult(null);
      setResolvedAddress(null);
      setIsDomain(false);
      setIsValidating(false);

      if (onValidation) {
        onValidation({
          isValid: false,
          state: 'idle',
          result: null,
        });
      }
      return;
    }

    // Set up debounced validation
    debounceTimerRef.current = setTimeout(() => {
      validateAddress(address);
    }, debounceMs);

    // Cleanup on unmount or address change
    return cleanup;
  }, [address, debounceMs, validateAddress, cleanup, onValidation]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Computed values
  const validationState = useMemo(
    () => getValidationState(validationResult, isValidating),
    [validationResult, isValidating]
  );

  const isValid = useMemo(
    () => validationResult?.type === 'SUCCESS' || validationResult?.type === 'WARNING',
    [validationResult]
  );

  const message = useMemo(() => {
    if (!validationResult || validationResult.type === 'SUCCESS') {
      return null;
    }
    return VALIDATION_MESSAGES[validationResult.code] || 'send.validation.unknown';
  }, [validationResult]);

  const messageType = useMemo(
    () => getMessageType(validationResult),
    [validationResult]
  );

  return {
    validationState,
    validationResult,
    isValidating,
    isValid,
    resolvedAddress,
    isDomain,
    message,
    messageType,
  };
}

