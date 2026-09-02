/**
 * Tests for useAvailableNetworks hook
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAvailableNetworks } from './useAvailableNetworks';
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
