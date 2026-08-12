/**
 * @vitest-environment jsdom
 * Tests for useUserConfig hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserConfig } from './useUserConfig';
import type { ActiveBlockchainAccount } from '../types/account';
import * as storage from '../storage';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../storage', () => ({
  getStorage: vi.fn(),
  STORAGE_KEYS: {
    SETTINGS: 'salmon_settings',
    LANGUAGE: 'salmon_language',
    CONTACTS: 'salmon_contacts',
  },
}));

// ============================================================================
// Test Data
// ============================================================================

const mockActiveAccount: ActiveBlockchainAccount = {
  network: {
    environment: 'solana-mainnet',
    blockchain: 'solana',
  },
};

const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

// ============================================================================
// Tests
// ============================================================================

describe('useUserConfig Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (storage.getStorage as any).mockReturnValue(mockStorage);
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default config when no stored data', async () => {
      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userConfig).toBeDefined();
      expect(result.current.userConfig?.explorers).toBeDefined();
      expect(result.current.userConfig?.developerNetworks).toBe(false);
    });

    it('should load existing config from storage', async () => {
      const existingConfig = {
        explorers: {
          SOLANA: 'solscan',
          BITCOIN: 'blockstream',
        },
        developerNetworks: true,
      };

      mockStorage.getItem.mockResolvedValue(existingConfig);

      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userConfig).toEqual(existingConfig);
      expect(result.current.developerNetworks).toBe(true);
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should fall back to defaults
      expect(result.current.userConfig).toBeDefined();
      expect(result.current.developerNetworks).toBe(false);
    });
  });

  describe('Explorer Management', () => {
    it('should provide list of available explorers for current network', async () => {
      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.explorers).toBeDefined();
      expect(Array.isArray(result.current.explorers)).toBe(true);
    });

    it('should change explorer and persist to storage', async () => {
      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.changeExplorer('solscan');
      });

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'salmon_settings',
        expect.objectContaining({
          explorers: expect.objectContaining({
            SOLANA: 'solscan',
          }),
        })
      );
    });

    it('should update local state after changing explorer', async () => {
      mockStorage.getItem.mockResolvedValue({
        explorers: {
          SOLANA: 'solana-explorer',
        },
        developerNetworks: false,
      });

      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.changeExplorer('solscan');
      });

      expect(result.current.userConfig?.explorers.SOLANA).toBe('solscan');
    });

    it('should handle explorer change errors', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('Storage error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.changeExplorer('solscan');
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Developer Networks Toggle', () => {
    it('should toggle developer networks on', async () => {
      mockStorage.getItem.mockResolvedValue({
        explorers: {},
        developerNetworks: false,
      });

      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.developerNetworks).toBe(false);

      await act(async () => {
        await result.current.toggleDeveloperNetworks();
      });

      expect(result.current.developerNetworks).toBe(true);
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'salmon_settings',
        expect.objectContaining({
          developerNetworks: true,
        })
      );
    });

    it('should toggle developer networks off', async () => {
      mockStorage.getItem.mockResolvedValue({
        explorers: {},
        developerNetworks: true,
      });

      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.developerNetworks).toBe(true);

      await act(async () => {
        await result.current.toggleDeveloperNetworks();
      });

      expect(result.current.developerNetworks).toBe(false);
    });

    it('should handle toggle errors', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('Storage error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleDeveloperNetworks();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Network Changes', () => {
    it('should update explorers when blockchain changes', async () => {
      const { result, rerender } = renderHook(
        ({ activeBlockchainAccount }) => useUserConfig({ activeBlockchainAccount }),
        { initialProps: { activeBlockchainAccount: mockActiveAccount } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newAccount: ActiveBlockchainAccount = {
        network: {
          environment: 'solana-devnet',
          blockchain: 'solana',
        },
      };

      rerender({ activeBlockchainAccount: newAccount });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockStorage.getItem).toHaveBeenCalled();
    });

    it('should reload config when environment changes', async () => {
      const { result, rerender } = renderHook(
        ({ activeBlockchainAccount }) => useUserConfig({ activeBlockchainAccount }),
        { initialProps: { activeBlockchainAccount: mockActiveAccount } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockStorage.getItem.mock.calls.length;

      const newAccount: ActiveBlockchainAccount = {
        network: {
          environment: 'testnet',
          blockchain: 'solana',
        },
      };

      rerender({ activeBlockchainAccount: newAccount });

      await waitFor(() => {
        expect(mockStorage.getItem.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe('Config Initialization', () => {
    it('should initialize missing explorers field', async () => {
      mockStorage.getItem.mockResolvedValue({
        developerNetworks: true,
      });

      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userConfig?.explorers).toBeDefined();
      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    it('should initialize missing developerNetworks field', async () => {
      mockStorage.getItem.mockResolvedValue({
        explorers: { SOLANA: 'solana-explorer' },
      });

      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userConfig?.developerNetworks).toBeDefined();
      expect(typeof result.current.userConfig?.developerNetworks).toBe('boolean');
    });
  });

  describe('Loading State', () => {
    it('should set isLoading to true during initialization', () => {
      mockStorage.getItem.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 100))
      );

      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('should set isLoading to false after initialization', async () => {
      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set isLoading to false even on error', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() =>
        useUserConfig({ activeBlockchainAccount: mockActiveAccount })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
