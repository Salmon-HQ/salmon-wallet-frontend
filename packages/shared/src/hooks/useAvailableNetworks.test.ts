/**
 * Tests for useAvailableNetworks hook
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fetchAndMergeNetworkConfigs, useAvailableNetworks } from './useAvailableNetworks';
import { SOLANA_NETWORKS } from '../blockchain/solana/networks';
import { BITCOIN_NETWORKS } from '../blockchain/bitcoin/networks';
import * as useUserConfigModule from './useUserConfig';
import * as networkService from '../api/services/network';
import type { ActiveBlockchainAccount } from '../types/account';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('./useUserConfig', () => ({
  useUserConfig: vi.fn(),
}));

vi.mock('../api/services/network', () => ({
  getNetworks: vi.fn(),
}));

vi.mock('../blockchain/solana/networks', () => ({
  SOLANA_NETWORKS: {
    'solana-mainnet': {
      id: 'solana-mainnet',
      name: 'Mainnet Beta',
      config: {
        nodeUrl: 'https://api.mainnet-beta.solana.com',
        commitment: 'confirmed',
      },
    },
    'solana-devnet': {
      id: 'solana-devnet',
      name: 'Devnet',
      config: {
        nodeUrl: 'https://api.devnet.solana.com',
        commitment: 'confirmed',
      },
    },
  },
}));

vi.mock('../blockchain/bitcoin/networks', () => ({
  BITCOIN_NETWORKS: {
    'bitcoin-mainnet': {
      id: 'bitcoin-mainnet',
      name: 'Bitcoin Mainnet',
      networkId: 'bitcoin-mainnet',
      environment: 'mainnet',
      config: {
        network: {},
      },
    },
    'bitcoin-testnet': {
      id: 'bitcoin-testnet',
      name: 'Bitcoin Testnet',
      networkId: 'bitcoin-testnet',
      environment: 'testnet',
      config: {
        network: {},
      },
    },
  },
}));

vi.mock('../blockchain/ethereum/networks', () => ({
  ETHEREUM_NETWORKS: {
    'ethereum-mainnet': {
      id: 'ethereum-mainnet',
      name: 'Ethereum Mainnet',
      networkId: 'ethereum-mainnet',
      environment: 'mainnet',
      config: {
        rpcUrl: 'https://eth.llamarpc.com',
        chainId: 1,
      },
    },
    'ethereum-sepolia': {
      id: 'ethereum-sepolia',
      name: 'Sepolia Testnet',
      networkId: 'ethereum-sepolia',
      environment: 'sepolia',
      config: {
        rpcUrl: 'https://rpc.sepolia.org',
        chainId: 11155111,
      },
    },
  },
}));

vi.mock('../config/blockchains', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/blockchains')>();
  return {
    ...actual,
    isBlockchainEnabled: () => true,
  };
});

// ============================================================================
// Test Data
// ============================================================================

const mockActiveAccount: ActiveBlockchainAccount = {
  network: {
    environment: 'solana-mainnet',
    blockchain: 'solana',
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('useAvailableNetworks Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(networkService.getNetworks).mockResolvedValue([
      {
        id: 'solana-mainnet',
        name: 'Solana',
        blockchain: 'solana',
        environment: 'mainnet',
        config: { nodeUrl: 'https://rpc.solana.example' },
        enabled: true,
        sections: {} as never,
      },
      {
        id: 'solana-devnet',
        name: 'Solana Devnet',
        blockchain: 'solana',
        environment: 'devnet',
        config: { nodeUrl: 'https://rpc.solana-devnet.example' },
        enabled: true,
        sections: {} as never,
      },
      {
        id: 'bitcoin-mainnet',
        name: 'Bitcoin',
        blockchain: 'bitcoin',
        environment: 'mainnet',
        config: { apiUrl: 'https://btc.example' },
        enabled: true,
        sections: {} as never,
      },
      {
        id: 'bitcoin-testnet',
        name: 'Bitcoin Testnet',
        blockchain: 'bitcoin',
        environment: 'testnet',
        config: { apiUrl: 'https://btc-testnet.example' },
        enabled: true,
        sections: {} as never,
      },
      {
        id: 'ethereum-mainnet',
        name: 'Ethereum',
        blockchain: 'ethereum',
        environment: 'mainnet',
        config: { rpcUrl: 'https://eth.example', chainId: 1 },
        enabled: true,
        sections: {} as never,
      },
      {
        id: 'ethereum-sepolia',
        name: 'Ethereum Sepolia',
        blockchain: 'ethereum',
        environment: 'sepolia',
        config: { rpcUrl: 'https://eth-sepolia.example', chainId: 11155111 },
        enabled: true,
        sections: {} as never,
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('When developerNetworks is FALSE', () => {
    beforeEach(() => {
      vi.mocked(useUserConfigModule.useUserConfig).mockReturnValue({
        developerNetworks: false,
        isLoading: false,
        userConfig: {
          explorers: {
            SOLANA: 'SOLSCAN',
            BITCOIN: 'BLOCKCYPHER',
            ETHEREUM: 'ETHERSCAN',
          },
          developerNetworks: false,
        },
        explorer: undefined,
        explorers: [],
        changeExplorer: vi.fn(),
        toggleDeveloperNetworks: vi.fn(),
        showUnverifiedTokens: false,
        setShowUnverifiedTokens: vi.fn(),
        excludedFromTotal: [],
        setIncludedInTotal: vi.fn(),
        derivedScannedAccountIds: [],
        markDerivedScanned: vi.fn(),
      });
    });

    it('should return only mainnet networks for Solana (solana-mainnet)', () => {
      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      return waitFor(() => {
        expect(result.current.networks.solana).toHaveLength(1);
        expect(result.current.networks.solana[0].id).toBe('solana-mainnet');
      });
    });

    it('hands out the endpoint it validated, never the backend’s raw one', () => {
      vi.mocked(networkService.getNetworks).mockResolvedValue([
        {
          id: 'solana-mainnet',
          name: 'Solana',
          blockchain: 'solana',
          environment: 'mainnet',
          config: { nodeUrl: 'http://rpc.example' },
          enabled: true,
          sections: {} as never,
        },
      ]);
      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      return waitFor(() => {
        expect(result.current.networks.solana).toHaveLength(1);
        expect(result.current.networks.solana[0].config.nodeUrl).toBe(
          SOLANA_NETWORKS['solana-mainnet'].config.nodeUrl
        );
        expect(result.current.networks.solana[0].config.nodeUrl).not.toBe('http://rpc.example');
      });
    });

    it('keeps offering the devnet the session is standing on', () => {
      const { result } = renderHook(() =>
        useAvailableNetworks({
          activeBlockchainAccount: mockActiveAccount,
          activeNetworkId: 'solana-devnet',
        })
      );

      return waitFor(() => {
        const networkIds = result.current.networks.solana.map((n) => n.id);
        expect(networkIds).toEqual(['solana-mainnet', 'solana-devnet']);
      });
    });

    it('never offers a network the wallet does not hold', () => {
      const { result } = renderHook(() =>
        useAvailableNetworks({
          activeBlockchainAccount: mockActiveAccount,
          heldNetworkIds: ['bitcoin-mainnet'],
        })
      );

      return waitFor(() => {
        expect(result.current.networks.solana).toHaveLength(0);
        expect(result.current.networks.bitcoin.map((n) => n.id)).toEqual(['bitcoin-mainnet']);
      });
    });

    it('should NOT return devnet or testnet for Solana', () => {
      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      return waitFor(() => {
        const networkIds = result.current.networks.solana.map((n) => n.id);
        expect(networkIds).not.toContain('solana-devnet');
        expect(networkIds).not.toContain('testnet');
      });
    });

    it('should return only mainnet networks for Bitcoin (mainnet)', () => {
      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      return waitFor(() => {
        expect(result.current.networks.bitcoin).toHaveLength(1);
        expect(result.current.networks.bitcoin[0].environment).toBe('mainnet');
      });
    });

    it('should NOT return regtest for Bitcoin', () => {
      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      return waitFor(() => {
        const environments = result.current.networks.bitcoin.map((n) => n.environment);
        expect(environments).not.toContain('regtest');
      });
    });

    it('should return only mainnet networks for Ethereum (mainnet)', () => {
      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      return waitFor(() => {
        expect(result.current.networks.ethereum).toHaveLength(1);
        expect(result.current.networks.ethereum[0].environment).toBe('mainnet');
      });
    });

    it('should NOT return sepolia for Ethereum', () => {
      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      return waitFor(() => {
        const environments = result.current.networks.ethereum.map((n) => n.environment);
        expect(environments).not.toContain('sepolia');
      });
    });
  });

  describe('When developerNetworks is TRUE', () => {
    beforeEach(() => {
      vi.mocked(useUserConfigModule.useUserConfig).mockReturnValue({
        developerNetworks: true,
        isLoading: false,
        userConfig: {
          explorers: {
            SOLANA: 'SOLSCAN',
            BITCOIN: 'BLOCKCYPHER',
            ETHEREUM: 'ETHERSCAN',
          },
          developerNetworks: true,
        },
        explorer: undefined,
        explorers: [],
        changeExplorer: vi.fn(),
        toggleDeveloperNetworks: vi.fn(),
        showUnverifiedTokens: false,
        setShowUnverifiedTokens: vi.fn(),
        excludedFromTotal: [],
        setIncludedInTotal: vi.fn(),
        derivedScannedAccountIds: [],
        markDerivedScanned: vi.fn(),
      });
    });

    it('should return all Solana networks (solana-mainnet, solana-devnet)', () => {
      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      return waitFor(() => {
        expect(result.current.networks.solana).toHaveLength(2);
        const networkIds = result.current.networks.solana.map((n) => n.id);
        expect(networkIds).toContain('solana-mainnet');
        expect(networkIds).toContain('solana-devnet');
      });
    });

    it('should return all Bitcoin networks (mainnet, testnet)', () => {
      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      return waitFor(() => {
        expect(result.current.networks.bitcoin).toHaveLength(2);
        const environments = result.current.networks.bitcoin.map((n) => n.environment);
        expect(environments).toContain('mainnet');
        expect(environments).toContain('testnet');
      });
    });

    it('should return all Ethereum networks (mainnet, sepolia)', () => {
      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      return waitFor(() => {
        expect(result.current.networks.ethereum).toHaveLength(2);
        const environments = result.current.networks.ethereum.map((n) => n.environment);
        expect(environments).toContain('mainnet');
        expect(environments).toContain('sepolia');
      });
    });
  });

  describe('allNetworks array', () => {
    it('should contain flat list of all available networks when developerNetworks is TRUE', () => {
      vi.mocked(useUserConfigModule.useUserConfig).mockReturnValue({
        developerNetworks: true,
        isLoading: false,
        userConfig: {
          explorers: {
            SOLANA: 'SOLSCAN',
            BITCOIN: 'BLOCKCYPHER',
            ETHEREUM: 'ETHERSCAN',
          },
          developerNetworks: true,
        },
        explorer: undefined,
        explorers: [],
        changeExplorer: vi.fn(),
        toggleDeveloperNetworks: vi.fn(),
        showUnverifiedTokens: false,
        setShowUnverifiedTokens: vi.fn(),
        excludedFromTotal: [],
        setIncludedInTotal: vi.fn(),
        derivedScannedAccountIds: [],
        markDerivedScanned: vi.fn(),
      });

      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      return waitFor(() => {
        const expectedCount =
          result.current.networks.solana.length +
          result.current.networks.bitcoin.length +
          result.current.networks.ethereum.length;

        expect(result.current.allNetworks).toHaveLength(expectedCount);
        expect(result.current.allNetworks.length).toBe(6); // 2 + 2 + 2
      });
    });

    it('should contain flat list of only mainnet networks when developerNetworks is FALSE', () => {
      vi.mocked(useUserConfigModule.useUserConfig).mockReturnValue({
        developerNetworks: false,
        isLoading: false,
        userConfig: {
          explorers: {
            SOLANA: 'SOLSCAN',
            BITCOIN: 'BLOCKCYPHER',
            ETHEREUM: 'ETHERSCAN',
          },
          developerNetworks: false,
        },
        explorer: undefined,
        explorers: [],
        changeExplorer: vi.fn(),
        toggleDeveloperNetworks: vi.fn(),
        showUnverifiedTokens: false,
        setShowUnverifiedTokens: vi.fn(),
        excludedFromTotal: [],
        setIncludedInTotal: vi.fn(),
        derivedScannedAccountIds: [],
        markDerivedScanned: vi.fn(),
      });

      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      return waitFor(() => {
        const expectedCount =
          result.current.networks.solana.length +
          result.current.networks.bitcoin.length +
          result.current.networks.ethereum.length;

        expect(result.current.allNetworks).toHaveLength(expectedCount);
        expect(result.current.allNetworks.length).toBe(3); // 1 + 1 + 1
      });
    });
  });

  describe('Loading State', () => {
    it('should return isLoading from useUserConfig', () => {
      vi.mocked(useUserConfigModule.useUserConfig).mockReturnValue({
        developerNetworks: false,
        isLoading: true,
        userConfig: null,
        explorer: undefined,
        explorers: [],
        changeExplorer: vi.fn(),
        toggleDeveloperNetworks: vi.fn(),
        showUnverifiedTokens: false,
        setShowUnverifiedTokens: vi.fn(),
        excludedFromTotal: [],
        setIncludedInTotal: vi.fn(),
        derivedScannedAccountIds: [],
        markDerivedScanned: vi.fn(),
      });

      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('should return isLoading as false when config is loaded', () => {
      vi.mocked(useUserConfigModule.useUserConfig).mockReturnValue({
        developerNetworks: false,
        isLoading: false,
        userConfig: {
          explorers: {
            SOLANA: 'SOLSCAN',
            BITCOIN: 'BLOCKCYPHER',
            ETHEREUM: 'ETHERSCAN',
          },
          developerNetworks: false,
        },
        explorer: undefined,
        explorers: [],
        changeExplorer: vi.fn(),
        toggleDeveloperNetworks: vi.fn(),
        showUnverifiedTokens: false,
        setShowUnverifiedTokens: vi.fn(),
        excludedFromTotal: [],
        setIncludedInTotal: vi.fn(),
        derivedScannedAccountIds: [],
        markDerivedScanned: vi.fn(),
      });

      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('developerNetworks return value', () => {
    it('should return developerNetworks as false when disabled', () => {
      vi.mocked(useUserConfigModule.useUserConfig).mockReturnValue({
        developerNetworks: false,
        isLoading: false,
        userConfig: {
          explorers: {
            SOLANA: 'SOLSCAN',
            BITCOIN: 'BLOCKCYPHER',
            ETHEREUM: 'ETHERSCAN',
          },
          developerNetworks: false,
        },
        explorer: undefined,
        explorers: [],
        changeExplorer: vi.fn(),
        toggleDeveloperNetworks: vi.fn(),
        showUnverifiedTokens: false,
        setShowUnverifiedTokens: vi.fn(),
        excludedFromTotal: [],
        setIncludedInTotal: vi.fn(),
        derivedScannedAccountIds: [],
        markDerivedScanned: vi.fn(),
      });

      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      expect(result.current.developerNetworks).toBe(false);
    });

    it('should return developerNetworks as true when enabled', () => {
      vi.mocked(useUserConfigModule.useUserConfig).mockReturnValue({
        developerNetworks: true,
        isLoading: false,
        userConfig: {
          explorers: {
            SOLANA: 'SOLSCAN',
            BITCOIN: 'BLOCKCYPHER',
            ETHEREUM: 'ETHERSCAN',
          },
          developerNetworks: true,
        },
        explorer: undefined,
        explorers: [],
        changeExplorer: vi.fn(),
        toggleDeveloperNetworks: vi.fn(),
        showUnverifiedTokens: false,
        setShowUnverifiedTokens: vi.fn(),
        excludedFromTotal: [],
        setIncludedInTotal: vi.fn(),
        derivedScannedAccountIds: [],
        markDerivedScanned: vi.fn(),
      });

      const { result } = renderHook(() =>
        useAvailableNetworks({ activeBlockchainAccount: mockActiveAccount })
      );

      expect(result.current.developerNetworks).toBe(true);
    });
  });
});

/**
 * `nodeUrl` becomes the wallet's entire view of the chain: createSolanaRpc,
 * simulation, blockhash, sendTransaction, confirmation. Written through
 * unchecked, whoever answers /v1/networks repoints all of it.
 */
describe('fetchAndMergeNetworkConfigs endpoint validation', () => {
  const MAINNET = 'solana-mainnet';

  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/plain,x'],
    ['file:', 'file:///etc/passwd'],
    ['not a url', 'definitely not a url'],
    ['empty', ''],
  ])('keeps the compiled default when the backend sends a %s nodeUrl', async (_label, nodeUrl) => {
    const before = SOLANA_NETWORKS[MAINNET].config.nodeUrl;
    vi.mocked(networkService.getNetworks).mockResolvedValue([
      { id: MAINNET, blockchain: 'solana', config: { nodeUrl } },
    ] as any);

    await fetchAndMergeNetworkConfigs();

    expect(SOLANA_NETWORKS[MAINNET].config.nodeUrl).toBe(before);
  });

  describe('the Solana RPC hosts a production build accepts', () => {
    const DEFAULT = 'https://api.mainnet-beta.solana.com';
    const merge = async (nodeUrl: string) => {
      SOLANA_NETWORKS[MAINNET].config.nodeUrl = DEFAULT;
      vi.mocked(networkService.getNetworks).mockResolvedValue([
        { id: MAINNET, blockchain: 'solana', config: { nodeUrl } },
      ] as any);
      await fetchAndMergeNetworkConfigs();
      return SOLANA_NETWORKS[MAINNET].config.nodeUrl;
    };
    afterEach(() => {
      vi.unstubAllEnvs();
      SOLANA_NETWORKS[MAINNET].config.nodeUrl = DEFAULT;
    });

    it.each([
      'https://salmon-mainnet-1.mainnet.rpcpool.com/token',
      'https://api.mainnet-beta.solana.com',
      'https://api.devnet.solana.com',
    ])('accepts %s', async (nodeUrl) => {
      expect(await merge(nodeUrl)).toBe(new URL(nodeUrl).href);
    });

    it.each([
      'https://rpc.example/x',
      'https://evilrpcpool.com',
      'https://rpcpool.com.example',
      'https://user@evil.example/?h=x.rpcpool.com',
    ])('ignores %s and keeps the compiled default', async (nodeUrl) => {
      expect(await merge(nodeUrl)).toBe(DEFAULT);
    });

    // WHATWG reads the backslash as a path separator (host api.mainnet-beta…),
    // iOS Foundation as part of the userinfo (host evil.example). Storing the
    // normalized URL makes the host that was checked the host that is opened.
    it('stores the normalized URL, never the string as sent', async () => {
      expect(await merge('https://api.mainnet-beta.solana.com\\@evil.example/')).toBe(
        'https://api.mainnet-beta.solana.com/@evil.example/'
      );
    });

    it('ignores a URL that carries credentials', async () => {
      expect(await merge('https://user:pass@api.mainnet-beta.solana.com/')).toBe(DEFAULT);
      expect(await merge('https://evil@api.mainnet-beta.solana.com/')).toBe(DEFAULT);
    });

    it('treats a build that declares no environment as production', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(await merge('https://rpc.example/x')).toBe(DEFAULT);
    });

    it('lets a staging or local build use any https host', async () => {
      for (const env of ['staging', 'local']) {
        vi.stubEnv('VITE_SALMON_ENV', env);
        expect(await merge('https://rpc.example/x')).toBe('https://rpc.example/x');
      }
    });
  });

  // The RPC answers the simulations that gate signing; over plain http anyone
  // on the path can answer them instead.
  it('keeps the compiled default when the backend sends a plain http or ws endpoint', async () => {
    const before = { ...SOLANA_NETWORKS[MAINNET].config };
    vi.mocked(networkService.getNetworks).mockResolvedValue([
      {
        id: MAINNET,
        blockchain: 'solana',
        config: { nodeUrl: 'http://rpc.example/x', wsUrl: 'ws://rpc.example/x' },
      },
    ] as any);

    await fetchAndMergeNetworkConfigs();

    expect(SOLANA_NETWORKS[MAINNET].config.nodeUrl).toBe(before.nodeUrl);
    expect(SOLANA_NETWORKS[MAINNET].config.wsUrl).toBe(before.wsUrl);
  });

  it('stores the websocket and Bitcoin endpoints normalized too', async () => {
    vi.mocked(networkService.getNetworks).mockResolvedValue([
      {
        id: MAINNET,
        blockchain: 'solana',
        config: {
          nodeUrl: 'https://api.mainnet-beta.solana.com',
          wsUrl: 'wss://api.mainnet-beta.solana.com\\@evil.example/',
        },
      },
      {
        id: 'bitcoin-mainnet',
        blockchain: 'bitcoin',
        config: { apiUrl: 'https://mempool.space\\@evil.example/api' },
      },
    ] as any);

    await fetchAndMergeNetworkConfigs();

    expect(SOLANA_NETWORKS[MAINNET].config.wsUrl).toBe(
      'wss://api.mainnet-beta.solana.com/@evil.example/'
    );
    expect(BITCOIN_NETWORKS['bitcoin-mainnet'].config.apiUrl).toBe(
      'https://mempool.space/@evil.example/api'
    );
    delete SOLANA_NETWORKS[MAINNET].config.wsUrl;
  });

  describe('a validator on this machine', () => {
    const local = { nodeUrl: 'http://localhost:8899', wsUrl: 'ws://127.0.0.1:8900' };
    afterEach(() => {
      vi.unstubAllEnvs();
      SOLANA_NETWORKS[MAINNET].config.nodeUrl = 'https://api.mainnet-beta.solana.com';
      delete SOLANA_NETWORKS[MAINNET].config.wsUrl;
    });

    it('is accepted over plain http in a build that declares itself local', async () => {
      vi.stubEnv('VITE_SALMON_ENV', 'local');
      vi.mocked(networkService.getNetworks).mockResolvedValue([
        { id: MAINNET, blockchain: 'solana', config: local },
      ] as any);

      await fetchAndMergeNetworkConfigs();

      expect(SOLANA_NETWORKS[MAINNET].config).toMatchObject({
        nodeUrl: 'http://localhost:8899/',
        wsUrl: 'ws://127.0.0.1:8900/',
      });
    });

    it('is accepted on the IPv6 loopback too', async () => {
      vi.stubEnv('VITE_SALMON_ENV', 'local');
      vi.mocked(networkService.getNetworks).mockResolvedValue([
        { id: MAINNET, blockchain: 'solana', config: { nodeUrl: 'http://[::1]:8899' } },
      ] as any);

      await fetchAndMergeNetworkConfigs();

      expect(SOLANA_NETWORKS[MAINNET].config.nodeUrl).toBe('http://[::1]:8899/');
    });

    it('is refused when the build only runs in development without declaring itself local', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.mocked(networkService.getNetworks).mockResolvedValue([
        { id: MAINNET, blockchain: 'solana', config: local },
      ] as any);

      await fetchAndMergeNetworkConfigs();

      expect(SOLANA_NETWORKS[MAINNET].config.nodeUrl).toBe('https://api.mainnet-beta.solana.com');
    });

    it.each(['production', 'staging'])('is refused in a %s build', async (env) => {
      vi.stubEnv('VITE_SALMON_ENV', env);
      vi.mocked(networkService.getNetworks).mockResolvedValue([
        { id: MAINNET, blockchain: 'solana', config: local },
      ] as any);

      await fetchAndMergeNetworkConfigs();

      expect(SOLANA_NETWORKS[MAINNET].config.nodeUrl).toBe('https://api.mainnet-beta.solana.com');
      expect(SOLANA_NETWORKS[MAINNET].config.wsUrl).toBeUndefined();
    });
  });
});
