/**
 * Serialization for the per-account secret vault.
 *
 * The vault predates private-key import: it has always been
 * `Record<accountId, mnemonicString>`, encrypted as one blob. Rather than
 * migrate every existing wallet to a new shape, a mnemonic keeps serialising
 * to the bare string it already is and only an imported key writes an object.
 * A vault that has never seen an import is therefore byte-identical to what
 * previous versions wrote, and reading tolerates both.
 *
 * @module utils/account-secret
 */

import type { Account, AccountSecret } from '../types/account';

/** A secret as it sits inside the encrypted vault. */
export type StoredSecret = string | AccountSecret;

/** The decrypted vault: account id to secret. */
export type SecretVault = Record<string, StoredSecret>;

/**
 * Reads a vault entry into the in-memory secret model.
 *
 * A bare string is a mnemonic — that is the only thing the vault held before
 * imports existed, so an untagged value can be nothing else.
 */
export function toAccountSecret(stored: StoredSecret | undefined): AccountSecret {
  if (typeof stored === 'string' || stored == null) {
    return { kind: 'mnemonic', mnemonic: stored ?? '' };
  }
  return stored;
}

/**
 * Writes a secret back into vault form, preserving the legacy string shape for
 * mnemonics (see the module note).
 */
export function toStoredSecret(secret: AccountSecret): StoredSecret {
  return secret.kind === 'mnemonic' ? secret.mnemonic : secret;
}

/** Builds the full vault payload from the in-memory accounts. */
export function buildSecretVault(accounts: Account[]): SecretVault {
  return accounts.reduce<SecretVault>((vault, { id, secret }) => {
    vault[id] = toStoredSecret(secret);
    return vault;
  }, {});
}

/**
 * The mnemonic backing an account, or null when it was imported from a private
 * key and has none.
 *
 * Every "show me the seed phrase" surface goes through this: returning null
 * (instead of an empty string) forces those callers to decide what to render
 * for an imported account rather than silently showing a blank backup.
 */
export function getAccountMnemonic(account: Account | null | undefined): string | null {
  if (!account) return null;
  return account.secret.kind === 'mnemonic' ? account.secret.mnemonic : null;
}

/** True when the account was imported from a private key. */
export function isImportedAccount(account: Account | null | undefined): boolean {
  return account?.secret.kind === 'privateKey';
}

/**
 * True when the account is watch-only: an address the wallet follows without
 * holding its key.
 *
 * Note for anyone tempted to save a row: a watch-only account must still write
 * its tagged entry into the vault. `toAccountSecret` reads a missing entry as a
 * mnemonic (see above), so an account with no row comes back as a mnemonic
 * account with an empty phrase and takes the derivation branch on every unlock.
 */
export function isWatchOnlyAccount(account: Account | null | undefined): boolean {
  return account?.secret.kind === 'watchOnly';
}
