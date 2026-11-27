/**
 * The unlock screen's contract — what both platforms need from their app to
 * check a password and, failing everything, wipe the wallet. The DOM's
 * `LockScreen` and mobile's `LockContent` add their own: session-key caching
 * and biometrics respectively.
 */
export interface LockScreenPropsBase {
  /** Checks the password. Resolves true when the wallet is unlocked. */
  onUnlock: (password: string) => Promise<boolean>;
  /** Wipes the wallet after the two-step confirmation. */
  onRemoveAllAccounts: () => Promise<void>;
}

/**
 * The reset behind "Forgot my password": a warning, then the last word, and
 * only the last word erases. The lock screens open it, and so does the dialog
 * a refused save shows, which is why it is one component per platform.
 */
export interface ResetConfirmPropsBase {
  visible: boolean;
  /** Called when the user backs out at either step, and after the reset ran. */
  onClose: () => void;
  /** Erases every wallet. Runs only after both confirmations. */
  onReset: () => Promise<void>;
}

/**
 * The copy of the reset's two sheets and of the refusal that leads to it,
 * written once for both platforms. The refusal's test ids are part of it, so
 * an end-to-end flow selects the same buttons on each.
 */
export function resetSheetsCopy(t: (key: string) => string) {
  const danger = (title: string, message: string, confirmText: string, cancelText: string) => ({
    title: t(title),
    message: t(message),
    confirmText: t(confirmText),
    cancelText: t(cancelText),
    isDanger: true,
  });
  return {
    warn: danger(
      'lock.reset_wallet_title',
      'lock.reset_wallet_message',
      'lock.reset_button',
      'lock.cancel'
    ),
    last: danger('lock.confirm_title', 'lock.confirm_message', 'lock.delete_button', 'lock.cancel'),
    refused: {
      ...danger(
        'lock.vault_refused_title',
        'lock.vault_refused_message',
        'lock.reset_salmon',
        'actions.close'
      ),
      confirmTestID: 'vault-refused-reset-button',
      cancelTestID: 'vault-refused-close-button',
    },
  };
}
