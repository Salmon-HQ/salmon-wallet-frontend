/**
 * WalletInitErrorScreen — the blocking gate shown when wallet initialization
 * failed and no accounts could be loaded. Rendered INSTEAD of the navigator
 * on both platforms, so a user with broken storage is never routed into
 * onboarding (which risks overwriting an existing vault).
 */
export interface WalletInitErrorScreenPropsBase {
  /** Re-runs wallet initialization. The gate stays up until it succeeds. */
  onRetry: () => Promise<void> | void;
}
