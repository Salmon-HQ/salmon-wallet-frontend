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
