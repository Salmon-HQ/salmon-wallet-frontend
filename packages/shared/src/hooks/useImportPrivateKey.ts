/**
 * useImportPrivateKey — shared logic for the "import a wallet with its private
 * key" step (extension, web and mobile).
 *
 * Keeps the key in component state and nowhere else: it is never logged, never
 * put in an analytics payload, and never carried inside an error message. The
 * only thing that leaves this hook before the user confirms is the address the
 * key controls, which is public by definition and is what lets them check they
 * are importing the wallet they meant to.
 */
import { useCallback, useMemo, useState } from 'react';

import { parseSolanaPrivateKey, type PrivateKeyErrorReason } from '../crypto/private-key';
import type { Account } from '../types/account';
import { collectSolanaAddresses } from '../utils/account';

/** Networks a private key can be imported on. Solana only, for now. */
const IMPORT_NETWORK_ID = 'solana-mainnet';

export interface UseImportPrivateKeyParams {
  /** Existing accounts, used to reject importing an address already held. */
  accounts: Account[];
}

export interface UseImportPrivateKeyResult {
  /**
   * Raw field value. Render it through the platform `PasswordInput`, which
   * masks by default and owns the show/hide toggle.
   */
  value: string;
  setValue: (next: string) => void;
  /** i18n key for the current error, or null. Never contains key material. */
  error: PrivateKeyErrorReason | 'wallet.import.errors.duplicate' | null;
  /** Address the entered key controls, once it validates. */
  address: string | null;
  /** The canonical base58 key to hand to the import factory. */
  privateKey: string | null;
  /** True while the entered key is being validated. */
  validating: boolean;
  /** True when the input is non-empty (so the CTA can be disabled sooner). */
  hasInput: boolean;
  /**
   * Validates the current input and resolves its address.
   * @returns true when the key is valid and not already imported.
   */
  validate: () => Promise<boolean>;
  /** Clears the field, the resolved address and any error. */
  reset: () => void;
  /** Network the import targets. */
  networkId: string;
}

export function useImportPrivateKey({
  accounts,
}: UseImportPrivateKeyParams): UseImportPrivateKeyResult {
  const [value, setValueState] = useState('');
  const [error, setError] = useState<UseImportPrivateKeyResult['error']>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const existingAddresses = useMemo(() => collectSolanaAddresses(accounts), [accounts]);

  const setValue = useCallback((next: string) => {
    setValueState(next);
    // Editing invalidates whatever the previous key resolved to; keeping the
    // old address on screen would let the user confirm an import for a wallet
    // they are no longer looking at.
    setError(null);
    setAddress(null);
    setPrivateKey(null);
  }, []);

  const validate = useCallback(async () => {
    setValidating(true);
    try {
      const result = await parseSolanaPrivateKey(value);
      if (!result.ok) {
        setError(result.reason);
        setAddress(null);
        setPrivateKey(null);
        return false;
      }

      // Importing an address the wallet already derives would show the same
      // balance twice and make "which one do I send from" unanswerable.
      if (existingAddresses.has(result.address)) {
        setError('wallet.import.errors.duplicate');
        setAddress(null);
        setPrivateKey(null);
        return false;
      }

      setError(null);
      setAddress(result.address);
      setPrivateKey(result.privateKey);
      return true;
    } finally {
      setValidating(false);
    }
  }, [value, existingAddresses]);

  const reset = useCallback(() => {
    setValueState('');
    setError(null);
    setAddress(null);
    setPrivateKey(null);
  }, []);

  return {
    value,
    setValue,
    error,
    address,
    privateKey,
    validating,
    hasInput: value.trim().length > 0,
    validate,
    reset,
    networkId: IMPORT_NETWORK_ID,
  };
}
