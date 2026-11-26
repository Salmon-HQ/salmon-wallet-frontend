/**
 * Whether a wallet about to be saved holds a secret a stored wallet already
 * holds, decided on the stored list and the opened vault alone. Memory can miss
 * a wallet another window added, and the network catalog is never asked: the
 * check runs inside the vault write lock.
 *
 * @module utils/stored-clash
 */
import bs58 from 'bs58';
import { createKeyPairSignerFromBytes } from '@solana/kit';
import { generateKeyPair, getSolanaDerivationPath } from '../blockchain/solana/factory';
import { getBlockchainFromNetworkId } from '../config/blockchains';
import { clearSeedCache, normalizeMnemonic } from '../crypto/mnemonic';
import { DuplicateAccountError } from '../hooks/useAccountsMutationHelpers';
import type { Account, AccountSecret, NetworkPathIndexes, StoredAccount } from '../types/account';
import { toAccountSecret, type SecretVault } from './account-secret';

interface StoredWallet {
  entry: StoredAccount;
  secret: AccountSecret;
}

/** Every position a wallet holds, on the networks `on` accepts. */
function heldPositions(pathIndexes: NetworkPathIndexes, on = (_networkId: string) => true) {
  return new Set(
    Object.entries(pathIndexes)
      .filter(([networkId]) => on(networkId))
      .flatMap(([, slots]) => (slots ?? []).filter((slot): slot is number => slot !== null))
  );
}

const isSolana = (networkId: string) => getBlockchainFromNetworkId(networkId) === 'solana';

const keyAddress = async (privateKey: string) =>
  (await createKeyPairSignerFromBytes(bs58.decode(privateKey))).address;

/** Whether the stored wallet holds the address; what cannot be derived is skipped. */
async function holdsAddress({ entry, secret }: StoredWallet, address: string): Promise<boolean> {
  if (secret.kind === 'watchOnly' || secret.kind === 'seedVault') return secret.address === address;
  const derivations =
    secret.kind === 'privateKey'
      ? [() => keyAddress(secret.privateKey)]
      : [...heldPositions(entry.pathIndexes, isSolana)].map(
          (i) => async () =>
            (await generateKeyPair(secret.mnemonic, getSolanaDerivationPath(i))).signer.address
        );
  for (const derive of derivations) {
    try {
      if ((await derive()) === address) return true;
    } catch {
      // An invalid phrase or key holds no address to compare.
    }
  }
  return false;
}

/**
 * Throws `DuplicateAccountError` when a stored wallet other than the account's
 * own id holds its secret: a phrase wallet with the same phrase holding its
 * starting position, or, for a private key or a watched address, any wallet
 * holding its address. A Seed Vault account is never refused; it returns the
 * stored Seed Vault wallets with its address, which it replaces.
 */
export async function findStoredClash(
  account: Account,
  list: StoredAccount[],
  secrets: SecretVault
): Promise<{ replace: string[] }> {
  const stored: StoredWallet[] = list
    .filter(({ id }) => id !== account.id && secrets[id] !== undefined)
    .map((entry) => ({ entry, secret: toAccountSecret(secrets[entry.id]) }));
  const { secret } = account;

  if (secret.kind === 'seedVault') {
    const replace = stored.filter(
      (wallet) => wallet.secret.kind === 'seedVault' && wallet.secret.address === secret.address
    );
    return { replace: replace.map(({ entry }) => entry.id) };
  }

  if (secret.kind === 'mnemonic') {
    const start = Math.min(...heldPositions(account.pathIndexes));
    const phrase = normalizeMnemonic(secret.mnemonic);
    const clash = stored.some(
      (wallet) =>
        wallet.secret.kind === 'mnemonic' &&
        normalizeMnemonic(wallet.secret.mnemonic) === phrase &&
        heldPositions(wallet.entry.pathIndexes).has(start)
    );
    if (clash) throw new DuplicateAccountError();
    return { replace: [] };
  }

  const address =
    secret.kind === 'watchOnly' ? secret.address : await keyAddress(secret.privateKey);
  try {
    for (const wallet of stored) {
      if (await holdsAddress(wallet, address)) throw new DuplicateAccountError();
    }
  } finally {
    clearSeedCache();
  }
  return { replace: [] };
}
