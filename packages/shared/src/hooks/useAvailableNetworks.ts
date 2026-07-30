/**
 * Hook for getting available networks filtered by developer mode.
 *
 * This hook provides:
 * - Network lists filtered by the developerNetworks user setting
 * - Networks grouped by blockchain (solana, bitcoin, ethereum)
 * - A flat list of all available networks
 *
 * @module hooks/useAvailableNetworks
 */

import { useMemo, useState, useEffect } from 'react';
import { useUserConfig, type UseUserConfigParams } from './useUserConfig';
import { SOLANA_NETWORKS } from '../blockchain/solana/networks';
import { BITCOIN_NETWORKS } from '../blockchain/bitcoin/networks';
import { ETHEREUM_NETWORKS } from '../blockchain/ethereum/networks';
import type {
  AnyNetwork,
  BitcoinNetwork,
  EthereumNetwork,
  NetworkCatalogEntry,
  NetworksByBlockchain,
  SolanaNetwork,
} from '../types/blockchain';
import { MAINNET_NETWORK_IDS, sortNetworks } from '../utils/network';
import { getNetworks } from '../api/services/network';

/**
 * Return type for the useAvailableNetworks hook.
 */
export interface UseAvailableNetworksResult {
  /** Networks grouped by blockchain */
  networks: NetworksByBlockchain;
  /** Flat list of all available networks */
  allNetworks: AnyNetwork[];
  /** Whether developer networks are currently enabled */
  developerNetworks: boolean;
  /** Whether the configuration is still loading */
  isLoading: boolean;
  /** Whether backend network configs have been fetched and merged (or failed gracefully) */
  networksReady: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Desired network order for each blockchain.
 * Mainnet networks are shown first, followed by dev/test networks.
 */
const NETWORK_ORDER = {
  solana: ['solana-mainnet', 'solana-devnet'],
  bitcoin: ['bitcoin-mainnet', 'bitcoin-testnet'],
  ethereum: ['ethereum-mainnet', 'ethereum-sepolia'],
};

// ============================================================================
// Standalone merge function
// ============================================================================

/**
 * Fetches network configs from the backend API and merges them into the
 * global SOLANA_NETWORKS, ETHEREUM_NETWORKS, and BITCOIN_NETWORKS objects.
 *
 * This can be called imperatively (e.g. before a derivation scan) or from
 * the useAvailableNetworks hook.  The underlying getNetworks() call is
 * promise-cached, so multiple calls are cheap.
 *
 * @returns true if the merge succeeded, false if it fell back to defaults
 */
export async function fetchAndMergeNetworkConfigs(): Promise<boolean> {
  try {
    const apiNetworks = await getNetworks();
    for (const net of apiNetworks) {
      const { id, blockchain, config: cfg } = net;
      if (!cfg) continue;

      const chain = blockchain?.toLowerCase();
      if (chain === 'solana' && SOLANA_NETWORKS[id]) {
        if ('nodeUrl' in cfg && cfg.nodeUrl) {
          SOLANA_NETWORKS[id].config.nodeUrl = cfg.nodeUrl as string;
        }
        if ('wsUrl' in cfg && cfg.wsUrl) {
          SOLANA_NETWORKS[id].config.wsUrl = cfg.wsUrl as string;
        }
      } else if (chain === 'ethereum' && ETHEREUM_NETWORKS[id]) {
        if ('rpcUrl' in cfg && cfg.rpcUrl) {
          ETHEREUM_NETWORKS[id].config.rpcUrl = cfg.rpcUrl as string;
        }
      } else if (chain === 'bitcoin' && BITCOIN_NETWORKS[id]) {
        if ('apiUrl' in cfg && cfg.apiUrl) {
          BITCOIN_NETWORKS[id].config.apiUrl = cfg.apiUrl as string;
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

const filterVisibleNetworks = <T extends { id: string }>(
  networks: T[],
  developerNetworks: boolean,
  mainnetIds: string[],
  order: string[]
): T[] => {
  const visible = developerNetworks
    ? networks
    : networks.filter((network) => mainnetIds.includes(network.id));

  return sortNetworks(visible, order);
};

const mergeSolanaNetwork = (net: NetworkCatalogEntry): SolanaNetwork | null => {
  const local = SOLANA_NETWORKS[net.id];
  if (!local) return null;

  return {
    ...local,
    id: net.id as SolanaNetwork['id'],
    networkId: net.id as SolanaNetwork['networkId'],
    name: net.name || local.name,
    config: {
      ...local.config,
      ...(net.config || {}),
    },
  };
};

const mergeBitcoinNetwork = (net: NetworkCatalogEntry): BitcoinNetwork | null => {
  const local = BITCOIN_NETWORKS[net.id];
  if (!local) return null;

  return {
    ...local,
    id: net.id as BitcoinNetwork['id'],
    networkId: net.id as BitcoinNetwork['networkId'],
    name: net.name || local.name,
    environment: net.environment as BitcoinNetwork['environment'],
    config: {
      ...local.config,
      ...(net.config || {}),
    },
  };
};

const mergeEthereumNetwork = (net: NetworkCatalogEntry): EthereumNetwork | null => {
  const local = ETHEREUM_NETWORKS[net.id];
  if (!local) return null;

  return {
    ...local,
    id: net.id as EthereumNetwork['id'],
    networkId: net.id as EthereumNetwork['networkId'],
    name: net.name || local.name,
    environment: net.environment as EthereumNetwork['environment'],
    config: {
      ...local.config,
      ...(net.config || {}),
    },
  };
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Parameters for useAvailableNetworks.
 * Extends UseUserConfigParams with an optional developerNetworks override.
 * When provided, the override takes precedence over the internal useUserConfig value,
 * allowing callers that already have a useUserConfig instance to avoid stale reads.
 */
export interface UseAvailableNetworksParams extends UseUserConfigParams {
  /** Override developerNetworks value (bypasses internal useUserConfig read) */
  developerNetworks?: boolean;
}

/**
 * Hook for getting available networks filtered by developer mode.
 *
 * When developerNetworks is FALSE (default), only mainnet networks are returned.
 * When developerNetworks is TRUE, all networks (mainnet + testnet + devnet) are returned.
 *
 * @param params - Hook parameters including the active blockchain account
 * @returns Available networks and related state
 */
export function useAvailableNetworks(
  params: UseAvailableNetworksParams
): UseAvailableNetworksResult {
  const { developerNetworks: configDeveloperNetworks, isLoading } = useUserConfig(params);
  const developerNetworks = params.developerNetworks ?? configDeveloperNetworks;
  const [apiMerged, setApiMerged] = useState(false);
  const [apiNetworks, setApiNetworks] = useState<NetworkCatalogEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAndMergeNetworkConfigs()
      .then(async (success) => {
        if (success) {
          const networks = await getNetworks();
          if (!cancelled) {
            setApiNetworks(networks);
          }
        }
        if (!cancelled) {
          setApiMerged(true);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const networks = useMemo<NetworksByBlockchain>(() => {
    const enabledApiNetworks = apiNetworks.filter((network) => network.enabled);

    if (apiNetworks.length > 0) {
      return {
        solana: filterVisibleNetworks(
          enabledApiNetworks
            .filter((network) => network.blockchain === 'solana')
            .map(mergeSolanaNetwork)
            .filter((network): network is SolanaNetwork => !!network),
          developerNetworks,
          MAINNET_NETWORK_IDS.solana,
          NETWORK_ORDER.solana
        ),
        bitcoin: filterVisibleNetworks(
          enabledApiNetworks
            .filter((network) => network.blockchain === 'bitcoin')
            .map(mergeBitcoinNetwork)
            .filter((network): network is BitcoinNetwork => !!network),
          developerNetworks,
          MAINNET_NETWORK_IDS.bitcoin,
          NETWORK_ORDER.bitcoin
        ),
        ethereum: filterVisibleNetworks(
          enabledApiNetworks
            .filter((network) => network.blockchain === 'ethereum')
            .map(mergeEthereumNetwork)
            .filter((network): network is EthereumNetwork => !!network),
          developerNetworks,
          MAINNET_NETWORK_IDS.ethereum,
          NETWORK_ORDER.ethereum
        ),
      };
    }

    return {
      solana: [],
      bitcoin: [],
      ethereum: [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiMerged is an intentional cache-invalidation signal after fetchAndMergeNetworkConfigs completes
  }, [developerNetworks, apiMerged, apiNetworks]);

  const allNetworks = useMemo<AnyNetwork[]>(() => {
    return [
      ...networks.solana,
      ...networks.bitcoin,
      ...networks.ethereum,
    ];
  }, [networks]);

  return {
    networks,
    allNetworks,
    developerNetworks,
    isLoading,
    networksReady: apiMerged,
  };
}
