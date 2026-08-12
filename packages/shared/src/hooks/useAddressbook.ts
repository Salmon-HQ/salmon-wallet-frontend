/**
 * Address book hook for managing saved contacts.
 *
 * Provides CRUD operations for address book entries with
 * persistent storage and network resolution.
 *
 * @module hooks/useAddressbook
 */

import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from '../analytics';
import { getStorage, STORAGE_KEYS } from '../storage';
import type { StoredAddress, Address, AddressInput, NetworkAdapter } from '../types/address';

// ============================================================================
// Types
// ============================================================================

export interface UseAddressbookParams {
  networkAdapter: NetworkAdapter;
}

export interface UseAddressbookState {
  contacts: Address[];
  isLoading: boolean;
  error: string | null;
  isError: boolean;
}

export interface UseAddressbookActions {
  addContact: (input: AddressInput) => Promise<void>;
  editContact: (originalAddress: string, input: AddressInput) => Promise<void>;
  removeContact: (address: string) => Promise<void>;
  /** Re-runs the initial load from storage (retry UI hook). */
  reload: () => void;
}

export type UseAddressbookResult = [UseAddressbookState, UseAddressbookActions];

/** Which stage of an address-book write failed. */
export type AddressbookErrorKind = 'persist' | 'resolve';

/**
 * Classified failure thrown by address-book writes.
 *
 * - `persist`: storage write failed — nothing was saved, state is unchanged.
 * - `resolve`: the contacts were saved, but resolving them for display failed —
 *   the persisted list is intact and will render after a reload.
 */
export class AddressbookError extends Error {
  readonly kind: AddressbookErrorKind;
  readonly cause: unknown;

  constructor(kind: AddressbookErrorKind, cause: unknown) {
    super(
      kind === 'persist' ? 'Failed to save address book' : 'Failed to resolve address book contacts'
    );
    this.name = 'AddressbookError';
    this.kind = kind;
    this.cause = cause;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Resolves StoredAddress[] to Address[] using the network adapter.
 * Entries whose networkId cannot be resolved are silently skipped.
 */
async function resolveContacts(
  stored: StoredAddress[],
  networkAdapter: NetworkAdapter
): Promise<Address[]> {
  const resolved: Address[] = [];
  for (const entry of stored) {
    const network = await networkAdapter.getNetwork(entry.networkId);
    if (network) {
      resolved.push({
        address: entry.address,
        name: entry.name,
        domain: entry.domain,
        network,
      });
    }
  }
  return resolved;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAddressbook({ networkAdapter }: UseAddressbookParams): UseAddressbookResult {
  const [storedContacts, setStoredContacts] = useState<StoredAddress[]>([]);
  const [contacts, setContacts] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadToken, setLoadToken] = useState(0);

  // Load contacts from storage on mount (and on reload())
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const storage = getStorage();
        const stored = await storage.getItem<StoredAddress[]>(STORAGE_KEYS.CONTACTS);
        const list = stored || [];

        if (!cancelled) {
          setStoredContacts(list);
          const resolved = await resolveContacts(list, networkAdapter);
          if (!cancelled) {
            setContacts(resolved);
          }
        }
      } catch (err) {
        console.error('Failed to load address book:', err);
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load address book');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [networkAdapter, loadToken]);

  /** Re-runs the load effect so a failed load can be retried from the UI. */
  const reload = useCallback(() => {
    setError(null);
    setLoadToken((token) => token + 1);
  }, []);

  /**
   * Persists a new stored list and resolves it to Address[].
   *
   * Throws an {@link AddressbookError} classifying which stage failed. State is
   * updated to reflect the persisted contacts as soon as the storage write
   * succeeds, so a later resolve failure never leaves state behind storage.
   */
  const persistAndResolve = useCallback(
    async (newStored: StoredAddress[]) => {
      const storage = getStorage();
      try {
        await storage.setItem(STORAGE_KEYS.CONTACTS, newStored);
      } catch (err) {
        console.error('Failed to persist address book:', err);
        throw new AddressbookError('persist', err);
      }
      // Storage write succeeded — state must reflect the persisted list even
      // if resolution below fails.
      setStoredContacts(newStored);
      try {
        const resolved = await resolveContacts(newStored, networkAdapter);
        setContacts(resolved);
      } catch (err) {
        console.error('Failed to resolve address book contacts:', err);
        throw new AddressbookError('resolve', err);
      }
    },
    [networkAdapter]
  );

  const addContact = useCallback(
    async (input: AddressInput) => {
      const entry: StoredAddress = {
        address: input.address,
        name: input.name,
        networkId: input.networkId,
        domain: input.domain,
      };
      const newStored = [...storedContacts, entry];
      await persistAndResolve(newStored);
      // Anonymous feature-adoption event: a contact was saved. No address, name
      // or network — just that the address book was used.
      trackEvent('address_book_used');
    },
    [storedContacts, persistAndResolve]
  );

  const editContact = useCallback(
    async (originalAddress: string, input: AddressInput) => {
      const entry: StoredAddress = {
        address: input.address,
        name: input.name,
        networkId: input.networkId,
        domain: input.domain,
      };
      const newStored = [...storedContacts.filter((c) => c.address !== originalAddress), entry];
      await persistAndResolve(newStored);
    },
    [storedContacts, persistAndResolve]
  );

  const removeContact = useCallback(
    async (address: string) => {
      const newStored = storedContacts.filter((c) => c.address !== address);
      await persistAndResolve(newStored);
    },
    [storedContacts, persistAndResolve]
  );

  return [
    { contacts, isLoading, error, isError: error !== null },
    { addContact, editContact, removeContact, reload },
  ];
}
