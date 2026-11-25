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
import { normalizeTokenListPreference, type TokenListPreference } from '../utils/tokenListFold';

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
  /** How many tokens Home shows and from what value; every token when never chosen */
  tokenListPreference: TokenListPreference;
  /** Stores the token list preference */
  setTokenListPreference: (next: TokenListPreference) => Promise<void>;
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

const hasDefaults = (config: UserConfig | null): config is UserConfig =>
  !!config?.explorers && config.developerNetworks !== undefined;

const withDefaults = (config: UserConfig | null): UserConfig => ({
  ...config,
  explorers: config?.explorers ?? { ...DEFAULT_EXPLORERS },
  developerNetworks: config?.developerNetworks ?? false,
});

let writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Several instances of this hook are live at once, each with its own copy of
 * the record. Writing that copy back whole would erase whatever another
 * instance stored since it loaded, so every write re-reads the stored record
 * and merges only its own fields, one write at a time.
 */
function persistPatch(
  patch: Partial<UserConfig> | ((stored: UserConfig) => Partial<UserConfig>)
): Promise<UserConfig> {
  const write = writeQueue.then(async () => {
    const storage = getStorage();
    const stored = withDefaults(await storage.getItem<UserConfig>(USER_CONFIG_KEY));
    const merged = { ...stored, ...(typeof patch === 'function' ? patch(stored) : patch) };
    await storage.setItem(USER_CONFIG_KEY, merged);
    return merged;
  });
  writeQueue = write.catch(() => undefined);
  return write;
}

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

  const applyConfig = useCallback(
    (config: UserConfig) => {
      setUserConfig(config);
      const networkExplorers = EXPLORERS[blockchain]?.[environment];
      setExplorer(
        networkExplorers?.[config.explorers[blockchain] || DEFAULT_EXPLORERS[blockchain]]
      );
      setDeveloperNetworks(config.developerNetworks);
      setShowUnverifiedTokensState(config.showUnverifiedTokens ?? false);
      setExcludedFromTotal(config.excludedFromTotal ?? []);
      setDerivedScannedAccountIds(config.derivedScannedAccountIds ?? []);
    },
    [blockchain, environment]
  );

  // Load configuration on mount and when blockchain/environment changes
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);

      try {
        const stored = await getStorage().getItem<UserConfig>(USER_CONFIG_KEY);
        const config = hasDefaults(stored) ? stored : await persistPatch({});

        applyConfig(config);

        const networkExplorers = EXPLORERS[blockchain]?.[environment];
        setAvailableExplorers(networkExplorers ? toArray(networkExplorers) : []);
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
  }, [blockchain, environment, toArray, applyConfig]);

  /**
   * Changes the selected explorer for the current blockchain.
   */
  const changeExplorer = useCallback(
    async (explorerKey: string): Promise<void> => {
      if (!userConfig) return;

      try {
        applyConfig(
          await persistPatch((stored) => ({
            explorers: { ...stored.explorers, [blockchain]: explorerKey },
          }))
        );
      } catch (error) {
        console.error('Failed to save explorer preference:', error);
      }
    },
    [userConfig, blockchain, applyConfig]
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

      try {
        applyConfig(await persistPatch({ developerNetworks: newValue }));
      } catch (error) {
        console.error('Failed to save developer networks preference:', error);
      }
    },
    [userConfig, developerNetworks, applyConfig]
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

      try {
        applyConfig(await persistPatch({ showUnverifiedTokens: show }));
      } catch (error) {
        console.error('Failed to save unverified tokens preference:', error);
      }
    },
    [userConfig, showUnverifiedTokens, applyConfig]
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

      if (!included && excludedFromTotal.includes(walletId)) return;

      try {
        applyConfig(
          await persistPatch((stored) => {
            const rest = (stored.excludedFromTotal ?? []).filter((id) => id !== walletId);
            return { excludedFromTotal: included ? rest : [...rest, walletId] };
          })
        );
      } catch (error) {
        console.error('Failed to save wallet total preference:', error);
      }
    },
    [userConfig, excludedFromTotal, applyConfig]
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

      try {
        applyConfig(
          await persistPatch((stored) => ({
            derivedScannedAccountIds: [
              ...(stored.derivedScannedAccountIds ?? []).filter((id) => id !== walletId),
              walletId,
            ],
          }))
        );
      } catch (error) {
        console.error('Failed to save derived-scan state:', error);
      }
    },
    [userConfig, derivedScannedAccountIds, applyConfig]
  );

  const tokenListPreference = useMemo(
    () => normalizeTokenListPreference(userConfig?.tokenList),
    [userConfig]
  );

  const setTokenListPreference = useCallback(
    async (next: TokenListPreference): Promise<void> => {
      if (!userConfig) return;

      try {
        applyConfig(await persistPatch({ tokenList: next }));
      } catch (error) {
        console.error('Failed to save token list preference:', error);
      }
    },
    [userConfig, applyConfig]
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
    tokenListPreference,
    setTokenListPreference,
    isLoading,
  };
}
