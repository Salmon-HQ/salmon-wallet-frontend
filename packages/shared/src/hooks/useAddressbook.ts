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
import type {
  StoredAddress,
  Address,
  AddressInput,
  NetworkAdapter,
} from '../types/address';

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
}

export type UseAddressbookResult = [UseAddressbookState, UseAddressbookActions];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Resolves StoredAddress[] to Address[] using the network adapter.
 * Entries whose networkId cannot be resolved are silently skipped.
 */
async function resolveContacts(
  stored: StoredAddress[],
  networkAdapter: NetworkAdapter,
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

export function useAddressbook({
  networkAdapter,
}: UseAddressbookParams): UseAddressbookResult {
  const [storedContacts, setStoredContacts] = useState<StoredAddress[]>([]);
  const [contacts, setContacts] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load contacts from storage on mount
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load address book');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [networkAdapter]);

  /**
   * Persists a new stored list and resolves it to Address[].
   */
  const persistAndResolve = useCallback(
    async (newStored: StoredAddress[]) => {
      const storage = getStorage();
      await storage.setItem(STORAGE_KEYS.CONTACTS, newStored);
      setStoredContacts(newStored);
      const resolved = await resolveContacts(newStored, networkAdapter);
      setContacts(resolved);
    },
    [networkAdapter],
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
    [storedContacts, persistAndResolve],
  );

  const editContact = useCallback(
    async (originalAddress: string, input: AddressInput) => {
      const entry: StoredAddress = {
        address: input.address,
        name: input.name,
        networkId: input.networkId,
        domain: input.domain,
      };
      const newStored = [
        ...storedContacts.filter((c) => c.address !== originalAddress),
        entry,
      ];
      await persistAndResolve(newStored);
    },
    [storedContacts, persistAndResolve],
  );

  const removeContact = useCallback(
    async (address: string) => {
      const newStored = storedContacts.filter((c) => c.address !== address);
      await persistAndResolve(newStored);
    },
    [storedContacts, persistAndResolve],
  );

  return [
    { contacts, isLoading, error, isError: error !== null },
    { addContact, editContact, removeContact },
  ];
}

