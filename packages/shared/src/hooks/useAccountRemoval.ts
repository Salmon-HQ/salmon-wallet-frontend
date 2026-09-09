/**
 * Removing a wallet re-encrypts the vault that is left, and re-encrypting
 * needs key material: either the derived key cached at unlock (it expires
 * after a few minutes of inactivity) or the password. Settings used to ask
 * for neither, so a removal attempted on a cold session failed with a
 * generic error and only worked again after a relaunch.
 *
 * This hook is the one place that decides: it says up front whether the
 * confirmation has to ask for the password, and when the cache lapses
 * between that answer and the write it flips the answer so the open
 * confirmation grows the password field instead of dead-ending.
 *
 * The vault, the key and the password check stay where they are — this hook
 * only routes them.
 */
import { useCallback, useEffect, useState } from 'react';

import { useAccountsContext } from '../contexts/AccountsContext';
import { EncryptionMaterialMissingError, isVaultKeyCached } from '../crypto/encrypt-mnemonics';
import type { Account } from '../types/account';

export interface UseAccountRemovalResult {
  /** Whether the confirmation must ask for the password before removing. */
  requiresPassword: boolean;
  /** Verifies a password for the confirmation gate. */
  validatePassword: (password: string) => Promise<boolean>;
  /**
   * Removes a wallet. Rethrows `EncryptionMaterialMissingError` when the key
   * cache lapsed and no password was given — `requiresPassword` is already
   * `true` by then, so a still-open confirmation asks for it.
   */
  remove: (targetId: string, password?: string) => Promise<void>;
}

export function useAccountRemoval(): UseAccountRemovalResult {
  const [, accountActions] = useAccountsContext();
  const [requiresPassword, setRequiresPassword] = useState(false);

  useEffect(() => {
    let active = true;
    void isVaultKeyCached().then((cached) => {
      if (active) setRequiresPassword(!cached);
    });
    return () => {
      active = false;
    };
  }, []);

  const remove = useCallback(
    async (targetId: string, password?: string): Promise<void> => {
      try {
        await accountActions.removeAccount(targetId, password);
      } catch (err) {
        if (err instanceof EncryptionMaterialMissingError) setRequiresPassword(true);
        throw err;
      }
    },
    [accountActions]
  );

  return { requiresPassword, validatePassword: accountActions.checkPassword, remove };
}

export interface AccountDeleteConfirm {
  /** The account the confirmation is asking about, if any. */
  accountToDelete: Account | null;
  /** Opens (or dismisses, with `null`) the confirmation. */
  setAccountToDelete: (account: Account | null) => void;
  /** Runs the removal the confirmation collected an answer for. */
  confirm: (password?: string) => Promise<void>;
}

/**
 * The state of `AccountsPanel`'s delete confirmation — which account is being
 * asked about, and what confirming it does. Both twins render it; neither
 * owns it.
 */
export function useAccountDeleteConfirm(
  onDeleteAccount: (accountId: string, password?: string) => void
): AccountDeleteConfirm {
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const confirm = useCallback(
    async (password?: string) => {
      if (!accountToDelete) return;
      await onDeleteAccount(accountToDelete.id, password);
    },
    [accountToDelete, onDeleteAccount]
  );

  return { accountToDelete, setAccountToDelete, confirm };
}
