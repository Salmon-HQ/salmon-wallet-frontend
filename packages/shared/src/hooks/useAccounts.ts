/**
 * useAccounts hook for managing wallet accounts across the application.
 *
 * This hook provides comprehensive account management functionality including:
 * - Loading and persisting accounts from/to storage
 * - Password-based encryption/decryption of mnemonics
 * - Account switching and network management
 * - Trusted apps and custom token management
 *
 * @module hooks/useAccounts
 */

import { useCallback, useEffect, useState } from 'react';
import mapValues from 'lodash-es/mapValues';

import { updateLastActivity } from '../storage';
import { type DerivedKeyCache } from '../crypto/encryption';
import { useAccountsLoader } from './useAccountsLoader';
import { useAccountsConnection } from './useAccountsConnection';
import { useAccountsMutations } from './useAccountsMutations';
import { useAccountsNetworkPreferences } from './useAccountsNetworkPreferences';
import { useAccountsSelection } from './useAccountsSelection';
import { useAccountsSecurity } from './useAccountsSecurity';
import { generateAccountId, createBlockchainAccountForNetwork } from '../utils';
import { getRandomAvatar } from '../utils/avatar';
import type { BlockchainAccount } from '../types/blockchain';
import type {
  NetworksAccounts,
  StoredAccount,
  Account,
  EditAccountParams,
  RestoreAccountOptions,
} from '../types/account';
import type { TrustedApp, TrustedApps } from '../types/trusted-app';
import type { TokenInfo, CustomTokens, TokenToImport } from '../types/token';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * State returned by useAccounts hook.
 */
export interface UseAccountsState {
  /** Whether the hook has completed initialization */
  ready: boolean;
  /** Whether accounts are locked (password required) */
  locked: boolean;
  /** Whether password protection is enabled */
  requiredLock: boolean;
  /** Counter for generating unique account IDs */
  counter: number;
  /** All loaded accounts */
  accounts: Account[];
  /** Currently selected account ID */
  accountId: string | null;
  /** Currently selected network ID */
  networkId: string | null;
  /** Currently selected path index */
  pathIndex: number;
  /** The currently active account */
  activeAccount: Account | undefined;
  /** The currently active blockchain account (can be Solana, Bitcoin, or Ethereum) */
  activeBlockchainAccount: BlockchainAccount | undefined;
  /** Trusted apps for the current network */
  activeTrustedApps: Record<string, TrustedApp>;
  /** Custom tokens for the current network */
  activeTokens: Record<string, TokenInfo>;
  /** Whether a network switch is in progress (shows skeletons) */
  switchingNetwork: boolean;
  /** Last error from an account operation, null when no error */
  error: string | null;
  /** Whether an error is present (derived from error !== null) */
  isError: boolean;
}

/**
 * Actions returned by useAccounts hook.
 */
export interface UseAccountsActions {
  /** Check if a password is valid */
  checkPassword: (password: string) => Promise<boolean>;
  /** Change the wallet password (re-encrypts all stored mnemonics) */
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  /** Lock accounts (require password to unlock) */
  lockAccounts: () => Promise<void>;
  /** Unlock accounts with password */
  unlockAccounts: (password: string) => Promise<boolean>;
  /** Unlock accounts with a cached derived key (for biometric unlock) */
  unlockWithCachedKey: (keyCache: DerivedKeyCache) => Promise<boolean>;
  /** Change the active account */
  changeAccount: (targetId: string) => Promise<void>;
  /** Clear the network switching flag */
  clearSwitchingNetwork: () => void;
  /** Change the active network */
  changeNetwork: (targetId: string) => Promise<void>;
  /** Switch to a different network (alias for changeNetwork) */
  switchNetwork: (networkId: string) => Promise<void>;
  /** Get the current network ID */
  getNetworkId: () => string | null;
  /** Change the active path index */
  changePathIndex: (targetIndex: number) => Promise<void>;
  /** Add a new account */
  addAccount: (account: Account, password?: string) => Promise<void>;
  /** Edit an existing account */
  editAccount: (targetId: string, params: EditAccountParams) => Promise<void>;
  /** Remove an account */
  removeAccount: (targetId: string, password?: string) => Promise<void>;
  /** Remove all accounts */
  removeAllAccounts: () => Promise<void>;
  /** Add a trusted app */
  addTrustedApp: (domain: string, app?: TrustedApp, targetNetworkId?: string) => Promise<void>;
  /** Remove a trusted app */
  removeTrustedApp: (domain: string) => Promise<void>;
  /** Import custom tokens */
  importTokens: (targetNetworkId: string, tokenList?: TokenToImport[]) => Promise<void>;
  /** Clear the current error */
  resetError: () => void;
  /**
   * Re-run wallet initialization after a failed startup. The init error is
   * only cleared when the retry succeeds, so gates stay up while retrying.
   */
  retryInit: () => Promise<void>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the default path index for an account on a given network.
 */
function getDefaultPathIndex(account: Account, networkId: string): number {
  return account.networksAccounts[networkId]?.findIndex(Boolean) ?? 0;
}

/**
 * Formats an account for storage (removes non-serializable data).
 */
function formatAccountForStorage(account: Account): StoredAccount {
  const { id, name, avatar, networksAccounts } = account;

  const getPathIndexes = (networkAccounts: (BlockchainAccount | null)[]): (number | null)[] => {
    return Object.keys(networkAccounts).map((index) => {
      return networkAccounts[Number(index)] ? parseInt(index, 10) : null;
    });
  };

  return {
    id,
    name,
    avatar,
    pathIndexes: mapValues(networksAccounts, getPathIndexes),
  };
}

/**
 * Creates a new account with the given options.
 * Supports creating accounts for Solana, Bitcoin, and Ethereum networks.
 */
async function restoreAccount(options: RestoreAccountOptions): Promise<Account> {
  const { name, avatar, mnemonic, pathIndexes = {} } = options;

  const id = generateAccountId();
  // Default to Solana mainnet if no path indexes provided
  const defaultPathIndexes =
    Object.keys(pathIndexes).length > 0 ? pathIndexes : { 'solana-mainnet': [0] };

  const networksEntries = await Promise.all(
    Object.entries(defaultPathIndexes).map(async ([networkId, indexes]) => {
      const resolvedAccounts = await Promise.all(
        indexes.map(async (index) => {
          if (index === null) {
            return { index: null as null, account: null };
          }

          const account = await createBlockchainAccountForNetwork(networkId, mnemonic, index);

          return { index, account };
        })
      );

      const networkAccounts: NetworksAccounts[string] = [];

      resolvedAccounts.forEach(({ index, account }) => {
        if (index === null) {
          networkAccounts.push(null);
          return;
        }

        if (!account) {
          while (networkAccounts.length <= index) {
            networkAccounts.push(null);
          }
          return;
        }

        while (networkAccounts.length <= index) {
          networkAccounts.push(null);
        }
        networkAccounts[index] = account;
      });

      return [networkId, networkAccounts] as const;
    })
  );

  const networksAccounts = Object.fromEntries(networksEntries) as NetworksAccounts;

  return {
    id,
    name: name ?? `Account ${id.slice(-4)}`,
    avatar: avatar ?? getRandomAvatar(),
    mnemonic,
    pathIndexes: defaultPathIndexes,
    networksAccounts,
  };
}

/**
 * Creates multiple accounts from stored data.
 */
async function restoreManyAccounts(
  data: Array<StoredAccount & { mnemonic: string }>
): Promise<Account[]> {
  return Promise.all(
    data.map(async (item) => {
      const account = await restoreAccount({
        mnemonic: item.mnemonic,
        pathIndexes: item.pathIndexes,
      });

      // Override with stored values
      account.id = item.id;
      account.name = item.name;
      account.avatar = item.avatar;

      return account;
    })
  );
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing wallet accounts.
 *
 * Provides complete account lifecycle management including:
 * - Account creation, editing, and deletion
 * - Network and account switching
 * - Password-based encryption
 * - Trusted apps and custom tokens
 *
 * @returns A tuple of [state, actions]
 *
 * @example
 * ```tsx
 * function WalletComponent() {
 *   const [state, actions] = useAccounts();
 *
 *   if (!state.ready) return <Loading />;
 *   if (state.locked) return <UnlockScreen onUnlock={actions.unlockAccounts} />;
 *
 *   return (
 *     <div>
 *       <p>Active: {state.activeAccount?.name}</p>
 *       <p>Address: {state.activeBlockchainAccount?.getReceiveAddress()}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAccounts(): [UseAccountsState, UseAccountsActions] {
  const [ready, setReady] = useState(false);
  const [_loaded, setLoaded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [requiredLock, setRequiredLock] = useState(false);
  const [counter, setCounter] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [pathIndex, setPathIndex] = useState(0);
  const [trustedApps, setTrustedApps] = useState<TrustedApps>({});
  const [tokens, setTokens] = useState<CustomTokens>({});
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Update activity timestamp on mount
  // --------------------------------------------------------------------------

  useEffect(() => {
    updateLastActivity();
  }, []);

  // --------------------------------------------------------------------------
  // Account Loading
  // --------------------------------------------------------------------------

  const { loadMetadata, loadAccounts } = useAccountsLoader({
    setLoaded,
    setCounter,
    setAccounts,
    setAccountId,
    setNetworkId,
    setPathIndex,
    setTrustedApps,
    setTokens,
    restoreManyAccounts,
  });

  const {
    checkPassword,
    changePassword,
    lockAccounts,
    unlockAccounts,
    unlockWithCachedKey,
    initAccounts,
  } = useAccountsSecurity({
    setLocked,
    setRequiredLock,
    setReady,
    setLoaded,
    setError,
    loadMetadata,
    loadAccounts,
    restoreAccount,
    formatAccountForStorage,
  });

  useEffect(() => {
    initAccounts();
  }, [initAccounts]);

  // --------------------------------------------------------------------------
  // Computed Values
  // --------------------------------------------------------------------------

  const {
    activeAccount,
    activeBlockchainAccount,
    changeAccount,
    clearSwitchingNetwork,
    changeNetwork,
    switchNetwork,
    getNetworkId,
    changePathIndex,
  } = useAccountsSelection({
    accounts,
    accountId,
    setAccountId,
    networkId,
    setNetworkId,
    pathIndex,
    setPathIndex,
    setSwitchingNetwork,
    getDefaultPathIndex,
  });

  const { activeTrustedApps, activeTokens, addTrustedApp, removeTrustedApp, importTokens } =
    useAccountsNetworkPreferences({
      networkId,
      trustedApps,
      setTrustedApps,
      tokens,
      setTokens,
    });

  useAccountsConnection({
    activeBlockchainAccount,
    networkId,
  });

  const { addAccount, editAccount, removeAccount, removeAllAccounts } = useAccountsMutations({
    counter,
    setCounter,
    accounts,
    setAccounts,
    accountId,
    setAccountId,
    networkId,
    setNetworkId,
    setPathIndex,
    setLocked,
    setRequiredLock,
    setTrustedApps,
    setTokens,
    formatAccountForStorage,
    getDefaultPathIndex,
  });

  const resetError = useCallback(() => setError(null), []);

  // --------------------------------------------------------------------------
  // Return State and Actions
  // --------------------------------------------------------------------------

  const state: UseAccountsState = {
    ready,
    locked,
    requiredLock,
    counter,
    accounts,
    accountId,
    networkId,
    pathIndex,
    activeAccount,
    activeBlockchainAccount,
    activeTrustedApps,
    activeTokens,
    switchingNetwork,
    error,
    isError: error !== null,
  };

  const actions: UseAccountsActions = {
    checkPassword,
    changePassword,
    lockAccounts,
    unlockAccounts,
    unlockWithCachedKey,
    changeAccount,
    clearSwitchingNetwork,
    changeNetwork,
    switchNetwork,
    getNetworkId,
    changePathIndex,
    addAccount,
    editAccount,
    removeAccount,
    removeAllAccounts,
    addTrustedApp,
    removeTrustedApp,
    importTokens,
    resetError,
    retryInit: initAccounts,
  };

  return [state, actions];
}
