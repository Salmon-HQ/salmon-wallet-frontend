/**
 * User configuration hook for managing wallet preferences.
 *
 * This hook provides functionality for:
 * - Managing blockchain explorer preferences
 * - Toggling developer networks visibility
 * - Persisting user configuration to storage
 *
 * @module hooks/useUserConfig
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getStorage, STORAGE_KEYS } from '../storage';
import {
  EXPLORERS,
  DEFAULT_EXPLORERS,
  type Blockchain,
  type Explorer,
  type ExplorerWithKey,
} from '../config/explorers';
import type { UserConfig, ActiveBlockchainAccount } from '../types/account';
import { getMainnetSibling } from '../utils/network';

// ============================================================================
// Types
// ============================================================================

/**
 * Parameters for the useUserConfig hook.
 */
export interface UseUserConfigParams {
  /** The currently active blockchain account */
  activeBlockchainAccount: ActiveBlockchainAccount;
}

/**
 * What `toggleDeveloperNetworks` needs to know to leave the session somewhere
 * reachable when the flag goes off.
 *
 * The seam is here rather than in the accounts layer because this hook already
 * owns the flag and the accounts layer does not read user config at all:
 * handing it the active network and the switch it already exports is two
 * optional arguments, while the reverse would make every accounts consumer
 * load the settings store.
 */
export interface ToggleDeveloperNetworksOptions {
  /** The network the session is standing on. */
  activeNetworkId?: string | null;
  /** The accounts layer's `changeNetwork`, awaited before the flag is cleared. */
  changeNetwork?: (networkId: string) => Promise<void>;
}

/**
 * Return type for the useUserConfig hook.
 */
export interface UseUserConfigResult {
  /** The complete user configuration object, or null if not loaded */
  userConfig: UserConfig | null;
  /** The currently selected explorer for the active blockchain/network */
  explorer: Explorer | undefined;
  /** List of available explorers for the active blockchain/network */
  explorers: ExplorerWithKey[];
  /** Changes the selected explorer for the current blockchain */
  changeExplorer: (explorerKey: string) => Promise<void>;
  /** Whether developer networks are enabled */
  developerNetworks: boolean;
  /** Toggles the developer networks setting */
  toggleDeveloperNetworks: (options?: ToggleDeveloperNetworksOptions) => Promise<void>;
  /** Whether unverified (spam-flagged) tokens are shown */
  showUnverifiedTokens: boolean;
  /** Shows or hides unverified tokens */
  setShowUnverifiedTokens: (show: boolean) => Promise<void>;
  /** Wallet ids the user has taken out of the aggregated balance total */
  excludedFromTotal: string[];
  /** Includes or excludes one wallet from the aggregated balance total */
  setIncludedInTotal: (walletId: string, included: boolean) => Promise<void>;
  /** Wallet ids whose derived accounts have already been scanned and imported */
  derivedScannedAccountIds: string[];
  /** Records that one wallet's derived-account scan finished */
  markDerivedScanned: (walletId: string) => Promise<void>;
  /** Whether the configuration is still loading */
  isLoading: boolean;
}

// ============================================================================
// Storage Key
// ============================================================================

/**
 * Storage key for user configuration.
 * Using the existing STORAGE_KEYS.SETTINGS key for user preferences.
 */
const USER_CONFIG_KEY = STORAGE_KEYS.SETTINGS;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing user configuration preferences.
 *
 * This hook handles:
 * - Loading and persisting user configuration
 * - Managing blockchain explorer preferences
 * - Toggling developer networks visibility
 *
 * @param params - Hook parameters including the active blockchain account
 * @returns User configuration state and actions
 *
 * @example
 * ```typescript
 * import { useUserConfig } from '@salmon/shared/hooks';
 *
 * function SettingsScreen() {
 *   const activeAccount = { network: { environment: 'mainnet-beta', blockchain: 'solana' } };
 *
 *   const {
 *     explorer,
 *     explorers,
 *     changeExplorer,
 *     developerNetworks,
 *     toggleDeveloperNetworks,
 *     isLoading,
 *   } = useUserConfig({ activeBlockchainAccount: activeAccount });
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <View>
 *       <Text>Current Explorer: {explorer?.name}</Text>
 *       <Picker onValueChange={changeExplorer}>
 *         {explorers.map(e => <Picker.Item key={e.key} label={e.name} value={e.key} />)}
 *       </Picker>
 *       <Switch value={developerNetworks} onValueChange={toggleDeveloperNetworks} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useUserConfig({
  activeBlockchainAccount,
}: UseUserConfigParams): UseUserConfigResult {
  // State
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [explorer, setExplorer] = useState<Explorer | undefined>();
  const [availableExplorers, setAvailableExplorers] = useState<ExplorerWithKey[]>([]);
  const [developerNetworks, setDeveloperNetworks] = useState<boolean>(false);
  const [showUnverifiedTokens, setShowUnverifiedTokensState] = useState<boolean>(false);
  const [excludedFromTotal, setExcludedFromTotal] = useState<string[]>([]);
  const [derivedScannedAccountIds, setDerivedScannedAccountIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Derived values from active account
  const environment = useMemo(
    () => activeBlockchainAccount.network.environment,
    [activeBlockchainAccount]
  );

  const blockchain = useMemo(
    () => activeBlockchainAccount.network.blockchain.toUpperCase() as Blockchain,
    [activeBlockchainAccount]
  );

  /**
   * Converts an object of explorers to an array with keys.
   */
  const toArray = useCallback((objects: Record<string, Explorer>): ExplorerWithKey[] => {
    return Object.keys(objects).map((key) => ({
      ...objects[key],
      key,
    }));
  }, []);

  // Load configuration on mount and when blockchain/environment changes
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);

      try {
        const storage = getStorage();
        let config = await storage.getItem<UserConfig>(USER_CONFIG_KEY);

        // Initialize with defaults if not present
        if (!config) {
          config = {
            explorers: { ...DEFAULT_EXPLORERS },
            developerNetworks: false,
          };
        }

        // Ensure explorers object exists with defaults
        if (!config.explorers) {
          config.explorers = { ...DEFAULT_EXPLORERS };
        }

        // Ensure developerNetworks has a value
        if (config.developerNetworks === undefined) {
          config.developerNetworks = false;
        }

        // Persist any defaults that were added
        await storage.setItem(USER_CONFIG_KEY, config);

        // Update state
        setUserConfig(config);

        // Get explorers for current blockchain/network
        const networkExplorers = EXPLORERS[blockchain]?.[environment];
        if (networkExplorers) {
          const selectedExplorerKey = config.explorers[blockchain] || DEFAULT_EXPLORERS[blockchain];
          setExplorer(networkExplorers[selectedExplorerKey]);
          setAvailableExplorers(toArray(networkExplorers));
        } else {
          setExplorer(undefined);
          setAvailableExplorers([]);
        }

        setDeveloperNetworks(config.developerNetworks);
        setShowUnverifiedTokensState(config.showUnverifiedTokens ?? false);
        setExcludedFromTotal(config.excludedFromTotal ?? []);
        setDerivedScannedAccountIds(config.derivedScannedAccountIds ?? []);
      } catch (error) {
        console.error('Failed to load user config:', error);
        // Set defaults on error
        setUserConfig({
          explorers: { ...DEFAULT_EXPLORERS },
          developerNetworks: false,
        });
        setDeveloperNetworks(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [blockchain, environment, toArray]);

  /**
   * Changes the selected explorer for the current blockchain.
   */
  const changeExplorer = useCallback(
    async (explorerKey: string): Promise<void> => {
      if (!userConfig) return;

      const updatedConfig: UserConfig = {
        ...userConfig,
        explorers: {
          ...userConfig.explorers,
          [blockchain]: explorerKey,
        },
      };

      // Update local state
      setUserConfig(updatedConfig);

      // Update explorer display
      const networkExplorers = EXPLORERS[blockchain]?.[environment];
      if (networkExplorers) {
        setExplorer(networkExplorers[explorerKey]);
      }

      // Persist to storage
      try {
        const storage = getStorage();
        await storage.setItem(USER_CONFIG_KEY, updatedConfig);
      } catch (error) {
        console.error('Failed to save explorer preference:', error);
      }
    },
    [userConfig, blockchain, environment]
  );

  /**
   * Toggles the developer networks visibility setting.
   *
   * Turning the flag off while the session stands on a devnet or testnet moves
   * it to that network's mainnet sibling *first*: the network is about to stop
   * being offered, and a session left on an unoffered page shows a carousel
   * that cannot reach the page it is on.
   */
  const toggleDeveloperNetworks = useCallback(
    async (options?: ToggleDeveloperNetworksOptions): Promise<void> => {
      if (!userConfig) return;

      const newValue = !developerNetworks;

      if (!newValue && options?.activeNetworkId && options.changeNetwork) {
        const mainnetId = getMainnetSibling(options.activeNetworkId);
        if (mainnetId) {
          await options.changeNetwork(mainnetId);
        }
      }

      const updatedConfig: UserConfig = {
        ...userConfig,
        developerNetworks: newValue,
      };

      // Update local state
      setUserConfig(updatedConfig);
      setDeveloperNetworks(newValue);

      // Persist to storage
      try {
        const storage = getStorage();
        await storage.setItem(USER_CONFIG_KEY, updatedConfig);
      } catch (error) {
        console.error('Failed to save developer networks preference:', error);
      }
    },
    [userConfig, developerNetworks]
  );

  /**
   * Shows or hides unverified (spam-flagged) tokens.
   *
   * Its own setting rather than a side effect of developer mode: a user who
   * wants to see what a scam airdropped them is not the same user who wants
   * devnet in the carousel.
   */
  const setShowUnverifiedTokens = useCallback(
    async (show: boolean): Promise<void> => {
      if (!userConfig) return;
      if (show === showUnverifiedTokens) return;

      const updatedConfig: UserConfig = { ...userConfig, showUnverifiedTokens: show };
      setUserConfig(updatedConfig);
      setShowUnverifiedTokensState(show);

      try {
        const storage = getStorage();
        await storage.setItem(USER_CONFIG_KEY, updatedConfig);
      } catch (error) {
        console.error('Failed to save unverified tokens preference:', error);
      }
    },
    [userConfig, showUnverifiedTokens]
  );

  /**
   * Includes or excludes one wallet from the aggregated balance total.
   *
   * Only exclusions are stored, so a wallet the user has never touched — and
   * every wallet created after this shipped — counts by default.
   */
  const setIncludedInTotal = useCallback(
    async (walletId: string, included: boolean): Promise<void> => {
      if (!userConfig) return;

      const next = included
        ? excludedFromTotal.filter((id) => id !== walletId)
        : excludedFromTotal.includes(walletId)
          ? excludedFromTotal
          : [...excludedFromTotal, walletId];
      if (next === excludedFromTotal) return;

      const updatedConfig: UserConfig = { ...userConfig, excludedFromTotal: next };
      setUserConfig(updatedConfig);
      setExcludedFromTotal(next);

      try {
        const storage = getStorage();
        await storage.setItem(USER_CONFIG_KEY, updatedConfig);
      } catch (error) {
        console.error('Failed to save wallet total preference:', error);
      }
    },
    [userConfig, excludedFromTotal]
  );

  /**
   * Records that one wallet's derived-account scan finished.
   *
   * Only completed scans are stored (the exceptions idiom above): a wallet
   * that is absent from the list is scanned again on the next unlock, which is
   * what a cancelled or failed scan must leave behind.
   */
  const markDerivedScanned = useCallback(
    async (walletId: string): Promise<void> => {
      if (!userConfig) return;
      if (derivedScannedAccountIds.includes(walletId)) return;

      const next = [...derivedScannedAccountIds, walletId];
      const updatedConfig: UserConfig = { ...userConfig, derivedScannedAccountIds: next };
      setUserConfig(updatedConfig);
      setDerivedScannedAccountIds(next);

      try {
        const storage = getStorage();
        await storage.setItem(USER_CONFIG_KEY, updatedConfig);
      } catch (error) {
        console.error('Failed to save derived-scan state:', error);
      }
    },
    [userConfig, derivedScannedAccountIds]
  );

  return {
    userConfig,
    explorer,
    explorers: availableExplorers,
    changeExplorer,
    developerNetworks,
    toggleDeveloperNetworks,
    showUnverifiedTokens,
    setShowUnverifiedTokens,
    excludedFromTotal,
    setIncludedInTotal,
    derivedScannedAccountIds,
    markDerivedScanned,
    isLoading,
  };
}
