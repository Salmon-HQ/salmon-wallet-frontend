/**
 * The recipient step's three groups and the address-book lookup, memoised
 * once for both platforms over `recipientOptions`.
 */
import { useCallback, useMemo } from 'react';

import { recipientOptions, type RecipientOptions } from '../utils/recipientOptions';
import type { Transaction } from '../types/transaction';
import type { SendContact, SendOwnWallet, SendRecipient } from '../types/ui/send-sheet';

export interface UseRecipientOptionsParams {
  transactions: readonly Pick<Transaction, 'type' | 'outputs'>[];
  senderAddress: string;
  contacts: readonly Pick<SendContact, 'name' | 'address'>[];
  ownWallets: readonly SendOwnWallet[];
}

export interface UseRecipientOptionsResult extends RecipientOptions {
  /** Contact name by address, for naming the recipient the user typed. */
  contactsByAddress: Record<string, string>;
  /**
   * The recipient the flow continues with: the typed address trimmed, the
   * resolved one when a domain resolved, and the address book's name for it.
   */
  recipientFor: (address: string, resolvedAddress: string | null | undefined) => SendRecipient;
}

export function useRecipientOptions({
  transactions,
  senderAddress,
  contacts,
  ownWallets,
}: UseRecipientOptionsParams): UseRecipientOptionsResult {
  const contactsByAddress = useMemo(
    () => Object.fromEntries(contacts.map((contact) => [contact.address, contact.name])),
    [contacts]
  );
  const groups = useMemo(
    () => recipientOptions({ transactions, senderAddress, contacts, ownWallets }),
    [transactions, senderAddress, contacts, ownWallets]
  );
  const recipientFor = useCallback(
    (address: string, resolvedAddress: string | null | undefined): SendRecipient => {
      const trimmed = address.trim();
      return {
        address: trimmed,
        resolvedAddress: resolvedAddress || undefined,
        name: contactsByAddress[resolvedAddress || trimmed] ?? contactsByAddress[trimmed],
      };
    },
    [contactsByAddress]
  );
  return { ...groups, contactsByAddress, recipientFor };
}
