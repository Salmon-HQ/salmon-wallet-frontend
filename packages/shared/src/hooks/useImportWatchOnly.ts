/**
 * useImportWatchOnly — shared logic for the "watch an address" step
 * (extension, web and mobile).
 *
 * The mirror of `useImportPrivateKey`, and simpler in one way that matters:
 * the field holds an address, which is public. It is rendered in an ordinary
 * text input rather than a masked one, and there is no warning notice to show,
 * because there is nothing here a user could leak.
 */
import { useCallback, useMemo, useState } from 'react';

import { parseSolanaPublicKey, type PublicKeyErrorReason } from '../crypto/public-key';
import type { Account } from '../types/account';
import { collectSolanaAddresses } from '../utils/account';

/** Networks an address can be watched on. Solana only, for now. */
const WATCH_ONLY_NETWORK_ID = 'solana-mainnet';

export interface UseImportWatchOnlyParams {
  /** Existing accounts, used to reject watching an address already held. */
  accounts: Account[];
}

export interface UseImportWatchOnlyResult {
  /** Raw field value. Render it in a plain text input — an address is public. */
  value: string;
  setValue: (next: string) => void;
  /** i18n key for the current error, or null. */
  error: PublicKeyErrorReason | 'wallet.watchOnly.errors.duplicate' | null;
  /** The canonical address to hand to the import factory, once it validates. */
  address: string | null;
  /** True when the input is non-empty (so the CTA can be disabled sooner). */
  hasInput: boolean;
  /**
   * Validates the current input.
   * @returns true when the address is valid and not already held.
   */
  validate: () => boolean;
  /** Clears the field, the resolved address and any error. */
  reset: () => void;
  /** Network the import targets. */
  networkId: string;
}

export function useImportWatchOnly({
  accounts,
}: UseImportWatchOnlyParams): UseImportWatchOnlyResult {
  const [value, setValueState] = useState('');
  const [error, setError] = useState<UseImportWatchOnlyResult['error']>(null);
  const [address, setAddress] = useState<string | null>(null);

  const existingAddresses = useMemo(() => collectSolanaAddresses(accounts), [accounts]);

  const setValue = useCallback((next: string) => {
    setValueState(next);
    // Editing invalidates whatever the previous input resolved to.
    setError(null);
    setAddress(null);
  }, []);

  const validate = useCallback(() => {
    const result = parseSolanaPublicKey(value);
    if (!result.ok) {
      setError(result.reason);
      setAddress(null);
      return false;
    }

    // Watching an address the wallet already holds the key to would show the
    // same balance twice, once operable and once not.
    if (existingAddresses.has(result.address)) {
      setError('wallet.watchOnly.errors.duplicate');
      setAddress(null);
      return false;
    }

    setError(null);
    setAddress(result.address);
    return true;
  }, [value, existingAddresses]);

  const reset = useCallback(() => {
    setValueState('');
    setError(null);
    setAddress(null);
  }, []);

  return {
    value,
    setValue,
    error,
    address,
    hasInput: value.trim().length > 0,
    validate,
    reset,
    networkId: WATCH_ONLY_NETWORK_ID,
  };
}
