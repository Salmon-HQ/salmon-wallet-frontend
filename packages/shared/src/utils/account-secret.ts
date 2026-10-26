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
    return sealAccountSecret({ kind: 'mnemonic', mnemonic: stored ?? '' });
  }
  return sealAccountSecret(stored);
}

/**
 * A copy of the secret whose mnemonic or private key stays readable but is
 * not enumerable, so JSON.stringify, inspect and spread of an account (which
 * lives in app state for the whole unlocked session) never carry it.
 */
export function sealAccountSecret(secret: AccountSecret): AccountSecret {
  const sealed = { ...secret };
  if (sealed.kind === 'mnemonic') Object.defineProperty(sealed, 'mnemonic', { enumerable: false });
  if (sealed.kind === 'privateKey') {
    Object.defineProperty(sealed, 'privateKey', { enumerable: false });
  }
  return sealed;
}

/**
 * Writes a secret back into vault form, preserving the legacy string shape for
 * mnemonics (see the module note). The vault is encrypted as JSON, so a private
 * key is copied out of its sealed field explicitly.
 */
export function toStoredSecret(secret: AccountSecret): StoredSecret {
  if (secret.kind === 'mnemonic') return secret.mnemonic;
  if (secret.kind === 'privateKey') {
    return { kind: 'privateKey', privateKey: secret.privateKey, networkId: secret.networkId };
  }
  return secret;
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

/** True when the wallet's key lives in Seed Vault (spec 037). */
export function isSeedVaultAccount(account: Account | null | undefined): boolean {
  return account?.secret?.kind === 'seedVault';
}

/**
 * The Seed Vault access to give up when `removed` leaves the wallet list, or
 * null. Access is per seed, and several wallets can share one: it is given up
 * only with the last of them.
 */
export function seedVaultAccessToRelease(removed: Account, remaining: Account[]): string | null {
  if (removed.secret.kind !== 'seedVault') return null;
  const { authToken } = removed.secret;
  const shared = remaining.some(
    ({ secret }) => secret.kind === 'seedVault' && secret.authToken === authToken
  );
  return shared ? null : authToken;
}
