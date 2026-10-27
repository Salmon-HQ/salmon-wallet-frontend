import { getStorageItem, setStorageItem, removeStorageItem, STORAGE_KEYS } from '../storage';
import { lock, unlock, type LockedVault } from '../crypto/encryption';
import { SOLANA_NETWORKS } from '../blockchain/solana';
import { BITCOIN_NETWORKS } from '../blockchain/bitcoin';
import { ETHEREUM_NETWORKS } from '../blockchain/ethereum';
import type { SolanaNetwork, BitcoinNetwork, EthereumNetwork } from '../types/blockchain';
import { getPathIndex, mainnetReceiveAddresses } from './account';
import type { AnyNetwork } from '../types/blockchain';
import type {
  NetworkPathIndexes,
  StoredAccount,
  Account,
  RestoreAccountOptions,
} from '../types/account';
import type { TrustedApp, TrustedApps } from '../types/trusted-app';
import type { TokenInfo, CustomTokens } from '../types/token';

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Inverts an object's key-value pairs, grouping keys by their values.
 * Used for grouping addresses by mnemonic during migration.
 */
function invertBy<T extends Record<string, string>>(obj: T): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!result[value]) {
      result[value] = [];
    }
    result[value].push(key);
  }
  return result;
}

/**
 * Gets available networks configuration for all supported blockchains.
 * Returns Solana, Bitcoin, and Ethereum networks.
 */
async function getNetworks(): Promise<AnyNetwork[]> {
  const solanaNetworks = Object.values(SOLANA_NETWORKS).map((network) => ({
    ...network,
    blockchain: 'SOLANA',
    environment: network.id,
  })) as unknown as SolanaNetwork[];

  const bitcoinNetworks = Object.values(BITCOIN_NETWORKS).map((network) => ({
    ...network,
    blockchain: 'BITCOIN',
  })) as unknown as BitcoinNetwork[];

  const ethereumNetworks = Object.values(ETHEREUM_NETWORKS).map((network) => ({
    ...network,
    blockchain: 'ETHEREUM',
  })) as unknown as EthereumNetwork[];

  return [...solanaNetworks, ...bitcoinNetworks, ...ethereumNetworks];
}

// ============================================================================
// Types
// ============================================================================

/**
 * Extended LockedVault with isEncrypted flag (duplicated from useAccounts
 * to avoid coupling the migration module to hook internals).
 */
interface EncryptedMnemonics extends LockedVault {
  isEncrypted: true;
}

type StoredMnemonics = Record<string, string> | EncryptedMnemonics;

interface LegacyWallets {
  passwordRequired?: boolean;
  wallets: Array<{
    address: string;
    path: string;
    chain: string;
    mnemonic?: string;
  }>;
  mnemonics?: StoredMnemonics;
  lastNumber?: number;
  config?: Record<
    string,
    {
      name?: string;
      avatar?: string;
      trustedApps?: Record<string, TrustedApp>;
      tokens?: Record<string, TokenInfo>;
    }
  >;
}

/** Dependencies injected by the caller so the migration stays decoupled. */
export interface MigrationDeps {
  restoreAccount: (options: RestoreAccountOptions) => Promise<Account>;
  formatAccountForStorage: (account: Account) => StoredAccount;
}

export type MigrationResult =
  | { status: 'no-migration' }
  | { status: 'needs-password' }
  /** An unprotected v2 record: it migrates only under a newly chosen password. */
  | { status: 'needs-new-password'; addresses: string[] }
  | {
      status: 'migrated';
      accounts: Account[];
      counter: number;
      accountId: string | undefined;
      networkId: string | undefined;
      pathIndex: number | undefined;
      trustedApps: TrustedApps;
      tokens: CustomTokens;
      requiredLock: boolean;
    };

/** The seeds an unprotected record holds in the clear, keyed by the address it claims. */
function cleartextMnemonics(storedWallets: LegacyWallets): Record<string, string> {
  if (storedWallets.mnemonics) return storedWallets.mnemonics as Record<string, string>;
  return Object.fromEntries(
    storedWallets.wallets.flatMap(({ address, mnemonic }) =>
      mnemonic ? [[address, mnemonic]] : []
    )
  );
}

/**
 * Removes an unprotected record whose migration wrote the vault but stopped
 * before removing it: only once the vault opens and holds every seed the record
 * carries, so no seed exists only in the record when it goes. Otherwise it stays.
 */
async function removeMigratedRecord(
  storedWallets: LegacyWallets,
  vault: unknown,
  password: string
): Promise<void> {
  try {
    const secrets = Object.values(
      await unlock<Record<string, unknown>>(vault as LockedVault, password)
    );
    const seeds = Object.values(cleartextMnemonics(storedWallets));
    if (seeds.length === 0 || !seeds.every((seed) => secrets.includes(seed))) return;
  } catch {
    return;
  }
  await removeStorageItem(STORAGE_KEYS.WALLETS);
  await removeStorageItem(STORAGE_KEYS.ACTIVE);
  await removeStorageItem(STORAGE_KEYS.ENDPOINTS);
}

// ============================================================================
// Migration Function
// ============================================================================

/**
 * Migrates legacy v2 wallet data to v3 format.
 *
 * Reads legacy storage, converts wallets to the new account model, writes
 * migrated data to storage, and removes legacy keys. Returns a result that
 * the hook can use to set React state.
 *
 * All storage I/O happens inside this function so it can be tested
 * independently of React.
 */
export async function migrateLegacyWallets(
  deps: MigrationDeps,
  password?: string,
  /**
   * `newPassword`: the password was just chosen and confirmed on the
   * create-password screen, not typed at the lock screen. Only such a password
   * may protect a record that had none.
   */
  options: { newPassword?: boolean } = {}
): Promise<MigrationResult> {
  const storedWallets = await getStorageItem<LegacyWallets>(STORAGE_KEYS.WALLETS);
  if (!storedWallets) return { status: 'no-migration' };

  // A wallet that already has its vault is past migrating: the legacy record
  // beside it is never written over the vault.
  const vault = await getStorageItem<unknown>(STORAGE_KEYS.MNEMONICS);
  if (vault) {
    if (password && !storedWallets.passwordRequired) {
      await removeMigratedRecord(storedWallets, vault, password);
    }
    return { status: 'no-migration' };
  }

  // v2 let an owner keep seed phrases with no password. Such a record is never
  // encrypted under whatever is typed at the lock screen: it waits for a
  // password chosen and confirmed for it, and until then names the addresses
  // its seeds derive (never the ones it claims) so the owner can tell whether
  // the wallet is theirs.
  const preview = !storedWallets.passwordRequired && !(password && options.newPassword);

  if (!preview && !password) {
    return { status: 'needs-password' };
  }

  if (!storedWallets.passwordRequired) {
    // Unprotected: the record holds its mnemonics in the clear, beside the
    // wallets in the oldest format.
    storedWallets.mnemonics = cleartextMnemonics(storedWallets);
  } else if (!('mnemonics' in storedWallets) || !storedWallets.mnemonics) {
    // Migrate from old format where mnemonic was in wallet
    const decryptedWallets = await unlock<typeof storedWallets.wallets>(
      storedWallets.wallets as unknown as LockedVault,
      password as string
    );
    storedWallets.wallets = decryptedWallets;
    storedWallets.mnemonics = storedWallets.wallets.reduce(
      (m, wallet) => {
        if (wallet.mnemonic) {
          m[wallet.address] = wallet.mnemonic;
          delete wallet.mnemonic;
        }
        return m;
      },
      {} as Record<string, string>
    );
  } else {
    // New format with separate mnemonics
    storedWallets.mnemonics = await unlock<Record<string, string>>(
      storedWallets.mnemonics as unknown as LockedVault,
      password as string
    );
  }

  const storedIndex = await getStorageItem<number>(STORAGE_KEYS.ACTIVE);
  const activeWallet = storedWallets.wallets[storedIndex ?? 0];
  const storedEndpoints = await getStorageItem<Record<string, string>>(STORAGE_KEYS.ENDPOINTS);

  const newCounter = storedWallets.lastNumber ?? 0;
  const newAccounts: Account[] = [];
  let newMnemonics: Record<string, string> = {};
  let newAccountId: string | undefined;
  let newNetworkId: string | undefined;
  let newPathIndex: number | undefined;
  const newTrustedApps: TrustedApps = {};
  const newTokens: CustomTokens = {};

  const networks = await getNetworks();
  const mnemonicsObj = storedWallets.mnemonics as Record<string, string>;
  const grouped = invertBy(mnemonicsObj);

  for (const [mnemonic, addresses] of Object.entries(grouped)) {
    let name: string | undefined;
    let avatar: string | undefined;
    const pathIndexes: NetworkPathIndexes = {};

    for (const address of addresses) {
      const config = storedWallets.config?.[address];

      if (!name && config?.name) name = config.name;
      if (!avatar && config?.avatar) avatar = config.avatar;

      const wallet = storedWallets.wallets.find((w) => w.address === address);
      if (!wallet) continue;

      const { path, chain } = wallet;
      const network = networks.find(
        (n) =>
          (n as unknown as { blockchain: string }).blockchain?.toUpperCase() === chain.toUpperCase()
      );

      if (!network) continue;

      const index = getPathIndex(path);
      if (index === undefined) continue;

      if (!pathIndexes[network.id]) {
        pathIndexes[network.id] = [];
      }
      pathIndexes[network.id].push(index);

      // Migrate trusted apps
      if (config?.trustedApps) {
        if (newTrustedApps[network.id]) {
          Object.assign(newTrustedApps[network.id], config.trustedApps);
        } else {
          newTrustedApps[network.id] = { ...config.trustedApps };
        }
      }

      // Migrate tokens
      if (config?.tokens) {
        if (newTokens[network.id]) {
          Object.assign(newTokens[network.id], config.tokens);
        } else {
          newTokens[network.id] = { ...config.tokens };
        }
      }
    }

    const account = await deps.restoreAccount({
      name,
      avatar,
      // V2 only ever stored mnemonics — private-key import did not exist there.
      secret: { kind: 'mnemonic', mnemonic },
      pathIndexes,
    });

    newAccounts.push(account);
    newMnemonics[account.id] = mnemonic;

    // Find current account based on active wallet
    const current = Object.values(account.networksAccounts)
      .flat()
      .find((blockchainAccount) => {
        if (!blockchainAccount) return false;
        const { path, network } = blockchainAccount;
        const address = blockchainAccount.getReceiveAddress();
        return (
          path === activeWallet?.path &&
          address === activeWallet?.address &&
          network.id ===
            storedEndpoints?.[
              (network as unknown as { blockchain: string }).blockchain?.toUpperCase()
            ]
        );
      });

    if (current) {
      newAccountId = account.id;
      newNetworkId = current.network.id;
      newPathIndex = getPathIndex(current.path);
    }
  }

  // Set defaults if not found
  if (!newAccountId || !newNetworkId || newPathIndex === undefined) {
    const firstAccount = newAccounts[0];
    if (firstAccount) {
      newAccountId = firstAccount.id;
      const availableNetworks = Object.keys(firstAccount.pathIndexes);
      newNetworkId = availableNetworks.includes('solana-mainnet')
        ? 'solana-mainnet'
        : availableNetworks[0];
      newPathIndex =
        firstAccount.pathIndexes[newNetworkId]?.find((n): n is number => typeof n === 'number') ??
        0;
    }
  }

  if (preview) {
    const addresses = mainnetReceiveAddresses(newAccounts);
    if (addresses.length === 0) {
      throw new Error('The unprotected wallet has no seed to derive an address from');
    }
    return { status: 'needs-new-password', addresses };
  }

  // One write, always encrypted: under the password the record opened with, or
  // the one just chosen for a record that had none.
  const lockedMnemonics = await lock(newMnemonics, password as string);
  await setStorageItem(STORAGE_KEYS.MNEMONICS, { ...lockedMnemonics, isEncrypted: true });

  // Save migrated data
  await setStorageItem(STORAGE_KEYS.COUNTER, newCounter);
  await setStorageItem(STORAGE_KEYS.ACCOUNTS, newAccounts.map(deps.formatAccountForStorage));
  await setStorageItem(STORAGE_KEYS.ACCOUNT_ID, newAccountId);
  await setStorageItem(STORAGE_KEYS.NETWORK_ID, newNetworkId);
  await setStorageItem(STORAGE_KEYS.PATH_INDEX, newPathIndex);
  await setStorageItem(STORAGE_KEYS.TRUSTED_APPS, newTrustedApps);
  await setStorageItem(STORAGE_KEYS.CUSTOM_TOKENS, newTokens);

  // Remove legacy storage
  await removeStorageItem(STORAGE_KEYS.WALLETS);
  await removeStorageItem(STORAGE_KEYS.ACTIVE);
  await removeStorageItem(STORAGE_KEYS.ENDPOINTS);

  return {
    status: 'migrated',
    accounts: newAccounts,
    counter: newCounter,
    accountId: newAccountId,
    networkId: newNetworkId,
    pathIndex: newPathIndex,
    trustedApps: newTrustedApps,
    tokens: newTokens,
    requiredLock: true,
  };
}
