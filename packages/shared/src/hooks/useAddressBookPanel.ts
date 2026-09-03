/**
 * The address-book panels' logic — the same on both platforms and for both
 * panels: seed the form (empty for Add, from the contact for Edit) and commit
 * it through the caller's save. The panels keep only their words and the
 * `AddressForm` they hand the fields to.
 */
import { useCallback } from 'react';

import type { AddressInput } from '../types/address';
import type { AddressBookItem } from '../types/settings';
import { useAddressBookForm, type UseAddressBookFormResult } from './useAddressBookForm';

export interface UseAddressBookPanelResult {
  form: UseAddressBookFormResult;
  /** Commits the form when it can be saved; a no-op otherwise. */
  save: () => Promise<void>;
}

/** Add: an empty form on the active network. */
export function useAddressAddPanel({
  networkId,
  onSave,
}: {
  networkId: string;
  onSave: (input: AddressInput) => Promise<void> | void;
}): UseAddressBookPanelResult {
  const form = useAddressBookForm({ networkId });
  const save = useCallback(async () => {
    if (!form.canSave) return;
    await onSave(form.buildInput());
  }, [form, onSave]);
  return { form, save };
}

/** Edit: the form seeded from the contact, saved against its original address. */
export function useAddressEditPanel({
  contact,
  onSave,
}: {
  contact: AddressBookItem;
  onSave: (originalAddress: string, input: AddressInput) => Promise<void> | void;
}): UseAddressBookPanelResult {
  const form = useAddressBookForm({
    label: contact.name,
    address: contact.domain || contact.address,
    networkId: contact.networkId,
    resolvedAddress: contact.address,
    isDomain: !!contact.domain,
  });
  const save = useCallback(async () => {
    if (!form.canSave) return;
    await onSave(contact.address, form.buildInput());
  }, [form, onSave, contact.address]);
  return { form, save };
}
