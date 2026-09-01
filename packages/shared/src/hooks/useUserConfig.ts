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
  toggleDeveloperNetworks: () => Promise<void>;
  /** Wallet ids the user has taken out of the aggregated balance total */
  excludedFromTotal: string[];
  /** Includes or excludes one wallet from the aggregated balance total */
  setIncludedInTotal: (walletId: string, included: boolean) => Promise<void>;
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
  const [excludedFromTotal, setExcludedFromTotal] = useState<string[]>([]);
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
        setExcludedFromTotal(config.excludedFromTotal ?? []);
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
   */
  const toggleDeveloperNetworks = useCallback(async (): Promise<void> => {
    if (!userConfig) return;

    const newValue = !developerNetworks;
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
  }, [userConfig, developerNetworks]);

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

  return {
    userConfig,
    explorer,
    explorers: availableExplorers,
    changeExplorer,
    developerNetworks,
    toggleDeveloperNetworks,
    excludedFromTotal,
    setIncludedInTotal,
    isLoading,
  };
}
