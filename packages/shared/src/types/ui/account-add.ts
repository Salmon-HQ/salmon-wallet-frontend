/**
 * Step state for the Add Account flow
 */
export type AccountAddStep =
  | 'select-method'
  | 'derive-scan'
  | 'import-seed'
  | 'import-private-key'
  | 'import-watch-only'
  /** Android with Seed Vault: pick an account of an authorized seed (spec 037). */
  | 'import-seed-vault'
  | 'set-name'
  /** Vault key expired mid-flow; the password is asked for on its own screen. */
  | 'reauth'
  | 'complete';

/** One Solana account of a seed Salmon may use in Seed Vault. */
export interface SeedVaultListedAccount {
  /** Seed Vault's id for Salmon's access to the seed. */
  authToken: string;
  derivationPath: string;
  address: string;
  name: string;
  /** The seed's own wallet (Seed Vault Wallet) uses this account. */
  isUserWallet: boolean;
}

/**
 * Seed Vault as the add flow needs it. Only the Android app provides it, and
 * only on a device with Seed Vault; each call may open Seed Vault's own screen.
 */
export interface SeedVaultAccess {
  /** The accounts of every authorized seed; authorizes one first when none is. */
  listAccounts(): Promise<SeedVaultListedAccount[]>;
  /** Lets the user authorize another seed. */
  authorizeAnother(): Promise<void>;
  /** Seed Vault's own create and import screens, then authorization. */
  createSeed(): Promise<void>;
  importSeed(): Promise<void>;
}

/**
 * Props for the AccountAddPanel component (platform-agnostic)
 */
export interface AccountAddPanelPropsBase {
  /** Callback when the flow completes successfully */
  onComplete: () => void;
  /** Callback to navigate back / cancel */
  onBack: () => void;
}
