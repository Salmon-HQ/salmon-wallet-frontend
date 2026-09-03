/**
 * The three groups the Send flow's recipient step offers, on both platforms:
 * the people this wallet has actually paid, the address book, and the user's
 * other wallets.
 *
 * A recent is the counterparty of a past send — the same field the activity
 * row reads (`transactionCounterparty`), so the two surfaces agree on who a
 * transfer went to.
 */
import type { Transaction } from '../types/transaction';
import type { SendContact, SendOwnWallet } from '../types/ui/send-sheet';
import { getShortAddress } from './address';

export interface RecipientOption {
  key: string;
  name: string;
  address: string;
}

export interface RecipientOptions {
  recents: RecipientOption[];
  contactRows: RecipientOption[];
  walletRows: RecipientOption[];
}

/** How many past counterparties the step lists. */
export const MAX_RECENTS = 3;

export function recipientOptions({
  transactions,
  senderAddress,
  contacts,
  ownWallets,
}: {
  transactions: readonly Pick<Transaction, 'type' | 'outputs'>[];
  senderAddress: string;
  contacts: readonly Pick<SendContact, 'name' | 'address'>[];
  ownWallets: readonly SendOwnWallet[];
}): RecipientOptions {
  const contactsByAddress = Object.fromEntries(contacts.map((c) => [c.address, c.name]));

  const recents: RecipientOption[] = [];
  const seen = new Set<string>();
  for (const tx of transactions) {
    if (tx.type !== 'send') continue;
    const destination = tx.outputs[0]?.destination;
    if (!destination || destination === senderAddress || seen.has(destination)) continue;
    seen.add(destination);
    recents.push({
      key: `recent-${destination}`,
      name: contactsByAddress[destination] ?? getShortAddress(destination) ?? destination,
      address: destination,
    });
    if (recents.length === MAX_RECENTS) break;
  }

  return {
    recents,
    contactRows: contacts.map((c) => ({
      key: `contact-${c.address}`,
      name: c.name,
      address: c.address,
    })),
    walletRows: ownWallets.map((w) => ({
      key: `wallet-${w.address}`,
      name: w.accountName,
      address: w.address,
    })),
  };
}
