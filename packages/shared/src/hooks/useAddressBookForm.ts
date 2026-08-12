/**
 * Shared form logic for address book Add / Edit screens.
 *
 * Manages label, address, validation state, and input building
 * so each platform only handles rendering.
 *
 * @module hooks/useAddressBookForm
 */

import { useState, useCallback, useMemo } from 'react';
import type { AddressInput } from '../types/address';
import type { ValidationCallbackResult } from '../types/validation';

// ============================================================================
// Types
// ============================================================================

export interface AddressBookFormInitial {
  label?: string;
  address?: string;
  networkId: string;
  /** If editing, the resolved address (not the domain). */
  resolvedAddress?: string | null;
  isDomain?: boolean;
}

export interface UseAddressBookFormResult {
  /** Current label value */
  label: string;
  setLabel: (v: string) => void;
  /** Current raw address/domain value (what the user sees in the input) */
  address: string;
  setAddress: (v: string) => void;
  /** Whether the address has been validated */
  isAddressValid: boolean;
  /** Resolved on-chain address (may differ from `address` when a domain is entered) */
  resolvedAddress: string | null;
  /** Whether the current input is a domain */
  isDomain: boolean;
  /** Whether the form can be submitted */
  canSave: boolean;
  /** Pass this to InputAddress `onValidation` */
  handleValidation: (result: ValidationCallbackResult) => void;
  /** Build the AddressInput payload from current form state */
  buildInput: () => AddressInput;
}

// ============================================================================
// Hook
// ============================================================================

export function useAddressBookForm(initial: AddressBookFormInitial): UseAddressBookFormResult {
  const [label, setLabel] = useState(initial.label ?? '');
  const [address, setAddress] = useState(initial.address ?? '');
  const [isAddressValid, setIsAddressValid] = useState(!!initial.resolvedAddress);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(
    initial.resolvedAddress ?? null
  );
  const [isDomain, setIsDomain] = useState(initial.isDomain ?? false);

  const handleValidation = useCallback((result: ValidationCallbackResult) => {
    setIsAddressValid(result.isValid);
    setResolvedAddress(result.resolvedAddress || null);
    setIsDomain(result.isDomain || false);
  }, []);

  const canSave = useMemo(() => label.trim().length > 0 && isAddressValid, [label, isAddressValid]);

  const buildInput = useCallback(
    (): AddressInput => ({
      address: resolvedAddress || address,
      name: label.trim(),
      networkId: initial.networkId,
      domain: isDomain ? address : undefined,
    }),
    [resolvedAddress, address, label, initial.networkId, isDomain]
  );

  return {
    label,
    setLabel,
    address,
    setAddress,
    isAddressValid,
    resolvedAddress,
    isDomain,
    canSave,
    handleValidation,
    buildInput,
  };
}
