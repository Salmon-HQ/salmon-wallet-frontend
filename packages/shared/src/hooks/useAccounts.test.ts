/**
 * @vitest-environment jsdom
 * Tests for useAccounts hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccounts } from './useAccounts';
import type { Account } from '../types/account';
import * as storage from '../storage';
import * as encryption from '../crypto/encryption';
import { encryptMnemonics } from '../crypto/encrypt-mnemonics';
import { createSolanaAccount } from '../blockchain/solana';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../storage', () => ({
  getStorageItem: vi.fn(),
  setStorageItem: vi.fn(),
  removeStorageItem: vi.fn(),
  getStashItem: vi.fn(),
  setStashItem: vi.fn(),
  removeStashItem: vi.fn(),
  updateLastActivity: vi.fn(),
  STORAGE_KEYS: {
    COUNTER: 'salmon_account_counter',
    ACCOUNTS: 'salmon_accounts',
    MNEMONICS: 'salmon_mnemonics',
    ACCOUNT_ID: 'salmon_active_account_id',
    NETWORK_ID: 'salmon_active_network_id',
    PATH_INDEX: 'salmon_active_path_index',
    TRUSTED_APPS: 'salmon_trusted_apps',
    CUSTOM_TOKENS: 'salmon_custom_tokens',
    CONNECTION: 'salmon_connection',
    SETTINGS: 'salmon_settings',
    CURRENCY: 'salmon_currency',
    LANGUAGE: 'salmon_language',
    CONTACTS: 'salmon_contacts',
    WALLETS: 'salmon_wallets',
    ACTIVE: 'salmon_active',
    ENDPOINTS: 'salmon_endpoints',
  },
  STASH_KEYS: {
    PASSWORD: 'password',
    DERIVED_KEY: 'derived_key_cache',
    LAST_ACTIVITY: 'salmon_last_activity',
  },
}));

vi.mock('../crypto/encryption', () => ({
  lock: vi.fn(),
  unlock: vi.fn(),
  unlockAndGetKey: vi.fn(),
  unlockWithKey: vi.fn(),
  lockWithKey: vi.fn(),
  lockAndGetKey: vi.fn(),
  isKeyCacheValid: vi.fn(),
  refreshCachedKey: vi.fn((keyCache) => ({ ...keyCache, expiresAt: Date.now() + 300_000 })),
  DEFAULT_ITERATIONS: 210000,
  DEFAULT_DIGEST: 'sha512',
}));

vi.mock('../crypto/encrypt-mnemonics', () => ({
  encryptMnemonics: vi.fn().mockResolvedValue({
    vault: { isEncrypted: true },
    requiredLock: true,
  }),
}));

vi.mock('../blockchain/solana', () => ({
  createSolanaAccount: vi.fn(),
  SOLANA_NETWORKS: {
    'solana-mainnet': {
      id: 'solana-mainnet',
      name: 'Mainnet Beta',
      blockchain: 'SOLANA',
      environment: 'mainnet-beta',
    },
    'solana-devnet': {
      id: 'solana-devnet',
      name: 'Devnet',
      blockchain: 'SOLANA',
      environment: 'devnet',
    },
  },
}));

vi.mock('../blockchain/bitcoin', () => ({
  createBitcoinAccount: vi.fn(),
  BITCOIN_NETWORKS: {
    'bitcoin-mainnet': {
      id: 'bitcoin-mainnet',
      name: 'Bitcoin Mainnet',
      blockchain: 'BITCOIN',
      environment: 'mainnet',
    },
    'bitcoin-testnet': {
      id: 'bitcoin-testnet',
      name: 'Bitcoin Testnet',
      blockchain: 'BITCOIN',
      environment: 'testnet',
    },
  },
}));

vi.mock('../blockchain/ethereum', () => ({
  createEthereumAccount: vi.fn(),
  ETHEREUM_NETWORKS: {
    'ethereum-mainnet': {
      id: 'ethereum-mainnet',
      name: 'Ethereum Mainnet',
      blockchain: 'ETHEREUM',
      environment: 'mainnet',
    },
    'ethereum-sepolia': {
      id: 'ethereum-sepolia',
      name: 'Sepolia Testnet',
      blockchain: 'ETHEREUM',
      environment: 'sepolia',
    },
  },
}));

vi.mock('../api/services/network', () => ({
  getNetworks: vi.fn().mockResolvedValue([
    { id: 'solana-mainnet', blockchain: 'solana', enabled: true, config: {} },
    { id: 'solana-devnet', blockchain: 'solana', enabled: true, config: {} },
    { id: 'bitcoin-mainnet', blockchain: 'bitcoin', enabled: true, config: {} },
    { id: 'bitcoin-testnet', blockchain: 'bitcoin', enabled: true, config: {} },
    { id: 'ethereum-mainnet', blockchain: 'ethereum', enabled: true, config: {} },
    { id: 'ethereum-sepolia', blockchain: 'ethereum', enabled: true, config: {} },
  ]),
  isBackendNetworkEnabled: vi.fn().mockResolvedValue(true),
  getEnabledNetworkIds: vi
    .fn()
    .mockResolvedValue([
      'solana-mainnet',
      'solana-devnet',
      'bitcoin-mainnet',
      'bitcoin-testnet',
      'ethereum-mainnet',
      'ethereum-sepolia',
    ]),
}));

vi.mock('./useAvailableNetworks', () => ({
  fetchAndMergeNetworkConfigs: vi.fn().mockResolvedValue(true),
}));

vi.mock('../utils/account', async () => {
  const actual = await vi.importActual<typeof import('../utils/account')>('../utils/account');
  return {
    ...actual,
    createBlockchainAccountForNetwork: vi.fn(async (networkId: string) => {
      if (networkId.startsWith('solana')) {
        return {
          path: "m/44'/501'/0'/0'",
          index: 0,
          network: { id: networkId, name: networkId, blockchain: 'SOLANA' },
          getReceiveAddress: () => 'TestAddress111111111111111111111111111111',
        };
      }
      return null;
    }),
    createBlockchainAccountFromPrivateKey: vi.fn(async (networkId: string) => ({
      path: "m/44'/501'/0'/0'",
      index: 0,
      network: { id: networkId, name: networkId, blockchain: 'SOLANA' },
      getReceiveAddress: () => 'ImportedAddress1111111111111111111111111',
    })),
  };
});

vi.mock('axios', () => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

// ============================================================================
// Test Data
// ============================================================================

const MOCK_MNEMONIC = 'test test test test test test test test test test test test';
const MOCK_PASSWORD = 'SecurePassword123!';
const MOCK_ACCOUNT_ID = 'account_123456_abc';

const mockSolanaAccount = {
  path: "m/44'/501'/0'/0'",
  index: 0,
  network: {
    id: 'solana-mainnet',
    name: 'Mainnet Beta',
    blockchain: 'SOLANA',
  },
  getReceiveAddress: vi.fn(() => 'TestAddress111111111111111111111111111111'),
};

// ============================================================================
// Helper Functions
// ============================================================================

function createMockAccount(): Account {
  return {
    id: MOCK_ACCOUNT_ID,
    name: 'Test Account',
    avatar: 'default',
    secret: { kind: 'mnemonic' as const, mnemonic: MOCK_MNEMONIC },
    pathIndexes: {
      'solana-mainnet': [0],
    },
    networksAccounts: {
      'solana-mainnet': [mockSolanaAccount as any],
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useAccounts Hook', () => {
  // Track stashed values to simulate real stash behavior
  let stashStore: Record<string, any> = {};

  beforeEach(() => {
    vi.resetAllMocks();
    stashStore = {};

    // Default mock implementations
    (storage.getStorageItem as any).mockResolvedValue(null);
    (createSolanaAccount as any).mockResolvedValue(mockSolanaAccount);
    (storage.updateLastActivity as any).mockResolvedValue(undefined);
    (encryptMnemonics as any).mockResolvedValue({
      vault: { isEncrypted: true },
      requiredLock: true,
    });

    // Stateful stash mocks - getStashItem returns what setStashItem stored
    (storage.setStashItem as any).mockImplementation((key: string, value: any) => {
      stashStore[key] = value;
      return Promise.resolve();
    });
    (storage.getStashItem as any).mockImplementation((key: string) => {
      return Promise.resolve(stashStore[key] ?? null);
    });
    (storage.removeStashItem as any).mockImplementation((key: string) => {
      delete stashStore[key];
      return Promise.resolve();
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    stashStore = {};
  });

  describe('Initialization', () => {
    it('should initialize with default state when no stored data', async () => {
      const { result } = renderHook(() => useAccounts());
      const [_state] = result.current;

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [finalState] = result.current;
      expect(finalState.locked).toBe(false);
      expect(finalState.requiredLock).toBe(false);
      expect(finalState.accounts).toEqual([]);
      expect(finalState.accountId).toBeNull();
      expect(finalState.networkId).toBeNull();
      expect(finalState.counter).toBe(0);
    });

    it('should load accounts from storage', async () => {
      const mockAccount = createMockAccount();
      const storedAccounts = [
        {
          id: mockAccount.id,
          name: mockAccount.name,
          avatar: mockAccount.avatar,
          pathIndexes: mockAccount.pathIndexes,
        },
      ];

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts') return Promise.resolve(storedAccounts);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        if (key === 'salmon_active_path_index') return Promise.resolve(0);
        if (key === 'salmon_account_counter') return Promise.resolve(1);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [state] = result.current;
      expect(state.accounts).toHaveLength(1);
      expect(state.accountId).toBe(mockAccount.id);
      expect(state.networkId).toBe('solana-mainnet');
      expect(state.activeAccount).toBeDefined();
    });

    it('should detect encrypted mnemonics and set locked state', async () => {
      const encryptedData = {
        isEncrypted: true,
        nonce: 'test-nonce',
        salt: 'test-salt',
        ciphertext: 'encrypted-data',
      };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_mnemonics') return Promise.resolve(encryptedData);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [state] = result.current;
      expect(state.locked).toBe(true);
      expect(state.requiredLock).toBe(true);
    });

    it('should load account metadata even when locked (without decrypting mnemonics)', async () => {
      const mockAccount = createMockAccount();
      const storedAccounts = [
        {
          id: mockAccount.id,
          name: mockAccount.name,
          avatar: mockAccount.avatar,
          pathIndexes: mockAccount.pathIndexes,
        },
      ];

      const encryptedData = {
        isEncrypted: true,
        nonce: 'test-nonce',
        salt: 'test-salt',
        ciphertext: 'encrypted-data',
      };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_mnemonics') return Promise.resolve(encryptedData);
        if (key === 'salmon_accounts') return Promise.resolve(storedAccounts);
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        if (key === 'salmon_account_counter') return Promise.resolve(1);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [state] = result.current;
      expect(state.locked).toBe(true);
      expect(state.requiredLock).toBe(true);
      // Critical: accounts array should NOT be empty even when locked
      expect(state.accounts).toHaveLength(1);
      expect(state.accounts[0].id).toBe(mockAccount.id);
      expect(state.accounts[0].name).toBe(mockAccount.name);
      expect(state.accounts[0].avatar).toBe(mockAccount.avatar);
      // Secret should be the empty placeholder (not decrypted)
      expect(state.accounts[0].secret).toEqual({ kind: 'mnemonic', mnemonic: '' });
      // Networks should be empty (not loaded until unlock)
      expect(state.accounts[0].networksAccounts).toEqual({});
    });

    it('should update last activity on mount', async () => {
      renderHook(() => useAccounts());

      await waitFor(() => {
        expect(storage.updateLastActivity).toHaveBeenCalled();
      });
    });
  });

  describe('Password Management', () => {
    it('should check password correctly', async () => {
      const encryptedData = {
        isEncrypted: true,
        nonce: 'test-nonce',
        salt: 'test-salt',
        ciphertext: 'encrypted-data',
      };

      const mockKeyCache = {
        salt: 'test-salt',
        derivedKey: new Uint8Array(32),
        createdAt: Date.now(),
      };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_mnemonics') return Promise.resolve(encryptedData);
        if (key === 'salmon_wallets') return Promise.resolve(null);
        return Promise.resolve(null);
      });
      (encryption.unlockAndGetKey as any).mockResolvedValue({
        data: { test: 'mnemonic' },
        keyCache: mockKeyCache,
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        const isValid = await actions.checkPassword(MOCK_PASSWORD);
        expect(isValid).toBe(true);
      });

      expect(encryption.unlockAndGetKey).toHaveBeenCalledWith(encryptedData, MOCK_PASSWORD);
    });

    it('should return true for checkPassword when no encryption', async () => {
      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_mnemonics') return Promise.resolve({ test: 'plain-mnemonic' });
        if (key === 'salmon_wallets') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        const isValid = await actions.checkPassword(MOCK_PASSWORD);
        expect(isValid).toBe(true);
      });
    });

    it('should lock accounts', async () => {
      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        await actions.lockAccounts();
      });

      const [state] = result.current;
      expect(state.locked).toBe(true);
      expect(storage.removeStashItem).toHaveBeenCalledWith('derived_key_cache');
    });

    it('should unlock accounts with correct password', async () => {
      const mockAccount = createMockAccount();
      const encryptedData = {
        isEncrypted: true,
        nonce: 'test-nonce',
        salt: 'test-salt',
        ciphertext: 'encrypted-data',
        digest: 'sha512' as const,
        iterations: 210000,
      };

      const mockKeyCache = {
        salt: 'test-salt',
        derivedKey: new Uint8Array(32),
        createdAt: Date.now(),
      };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_mnemonics') return Promise.resolve(encryptedData);
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_wallets') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      (encryption.unlockAndGetKey as any).mockResolvedValue({
        data: { [mockAccount.id]: MOCK_MNEMONIC },
        keyCache: mockKeyCache,
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        const success = await actions.unlockAccounts(MOCK_PASSWORD);
        expect(success).toBe(true);
      });

      await waitFor(() => {
        expect(result.current[0].locked).toBe(false);
      });

      // Password is no longer stored in stash (security fix: only DerivedKeyCache is cached)
      expect(storage.setStashItem).not.toHaveBeenCalledWith('password', expect.anything());
    });

    it('restores an imported private-key account on unlock', async () => {
      // The regression this guards: an account whose secret is a private key
      // has no mnemonic to re-derive from, so a restore that assumes one would
      // drop it — the wallet would vanish from the list at the first unlock.
      const encryptedData = {
        isEncrypted: true,
        nonce: 'test-nonce',
        salt: 'test-salt',
        ciphertext: 'encrypted-data',
        // Current KDF parameters, so unlock does not take the vault-upgrade
        // branch — this test is about the restored account, not re-encryption.
        digest: 'sha512',
        iterations: 210000,
      };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_mnemonics') return Promise.resolve(encryptedData);
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: 'imported-id',
              name: 'Imported',
              avatar: 'default',
              pathIndexes: { 'solana-mainnet': [0] },
            },
          ]);
        if (key === 'salmon_wallets') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      (encryption.unlockAndGetKey as any).mockResolvedValue({
        data: {
          'imported-id': {
            kind: 'privateKey',
            privateKey: 'base58-secret-key',
            networkId: 'solana-mainnet',
          },
        },
        keyCache: {
          salt: 'test-salt',
          derivedKey: new Uint8Array(32),
          createdAt: Date.now(),
        },
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      await act(async () => {
        expect(await result.current[1].unlockAccounts(MOCK_PASSWORD)).toBe(true);
      });

      await waitFor(() => {
        expect(result.current[0].locked).toBe(false);
      });

      const restored = result.current[0].accounts[0];
      expect(restored.id).toBe('imported-id');
      expect(restored.secret).toEqual({
        kind: 'privateKey',
        privateKey: 'base58-secret-key',
        networkId: 'solana-mainnet',
      });
      expect(restored.networksAccounts['solana-mainnet']?.[0]).toBeTruthy();
    });

    it('should fail to unlock with incorrect password', async () => {
      const encryptedData = {
        isEncrypted: true,
        nonce: 'test-nonce',
        salt: 'test-salt',
        ciphertext: 'encrypted-data',
      };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_mnemonics') return Promise.resolve(encryptedData);
        if (key === 'salmon_wallets') return Promise.resolve(null);
        return Promise.resolve(null);
      });
      (encryption.unlockAndGetKey as any).mockRejectedValue(new Error('Decryption failed'));

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        const success = await actions.unlockAccounts('wrong-password');
        expect(success).toBe(false);
      });

      const [state] = result.current;
      expect(state.locked).toBe(true);
    });

    it('should stay locked on a fresh init after lockAccounts removed the cached derived key', async () => {
      const mockAccount = createMockAccount();
      const encryptedData = {
        isEncrypted: true,
        nonce: 'test-nonce',
        salt: 'test-salt',
        ciphertext: 'encrypted-data',
        digest: 'sha512' as const,
        iterations: 210000,
      };

      const mockKeyCache = {
        key: [1, 2, 3],
        salt: 'test-salt',
        iterations: 210000,
        digest: 'sha512' as const,
        expiresAt: Date.now() + 60_000,
      };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_mnemonics') return Promise.resolve(encryptedData);
        if (key === 'salmon_accounts') {
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        }
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        if (key === 'salmon_wallets') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      stashStore['derived_key_cache'] = mockKeyCache;

      (encryption.isKeyCacheValid as any).mockImplementation((keyCache: unknown) =>
        Boolean(keyCache)
      );
      (encryption.unlockWithKey as any).mockReturnValue({ [mockAccount.id]: MOCK_MNEMONIC });

      const firstHook = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(firstHook.result.current[0].ready).toBe(true);
      });

      expect(firstHook.result.current[0].locked).toBe(false);
      expect(encryption.unlockWithKey).toHaveBeenCalledTimes(1);

      await act(async () => {
        await firstHook.result.current[1].lockAccounts();
      });

      expect(stashStore['derived_key_cache']).toBeUndefined();

      firstHook.unmount();

      const secondHook = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(secondHook.result.current[0].ready).toBe(true);
      });

      expect(secondHook.result.current[0].locked).toBe(true);
      expect(encryption.unlockWithKey).toHaveBeenCalledTimes(1);
    });

    it('should clear the cached derived key after changing the password', async () => {
      const encryptedData = {
        isEncrypted: true,
        nonce: 'test-nonce',
        salt: 'test-salt',
        ciphertext: 'encrypted-data',
        digest: 'sha512' as const,
        iterations: 210000,
      };

      const decryptedMnemonics = { [MOCK_ACCOUNT_ID]: MOCK_MNEMONIC };
      const newVault = {
        isEncrypted: true,
        nonce: 'new-nonce',
        salt: 'new-salt',
        ciphertext: 'new-encrypted-data',
        digest: 'sha512' as const,
        iterations: 210000,
      };

      stashStore['derived_key_cache'] = {
        key: [1, 2, 3],
        salt: 'old-salt',
        iterations: 210000,
        digest: 'sha512' as const,
        expiresAt: Date.now() + 60_000,
      };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_mnemonics') return Promise.resolve(encryptedData);
        if (key === 'salmon_wallets') return Promise.resolve(null);
        return Promise.resolve(null);
      });
      (encryption.unlockAndGetKey as any).mockResolvedValue({
        data: decryptedMnemonics,
        keyCache: {
          key: [1, 2, 3],
          salt: 'old-salt',
          iterations: 210000,
          digest: 'sha512' as const,
          expiresAt: Date.now() + 60_000,
        },
      });
      (encryption.lock as any).mockResolvedValue(newVault);

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      await act(async () => {
        const changed = await result.current[1].changePassword(
          MOCK_PASSWORD,
          'NewSecurePassword456!'
        );
        expect(changed).toBe(true);
      });

      expect(encryption.unlockAndGetKey).toHaveBeenCalledWith(encryptedData, MOCK_PASSWORD);
      expect(encryption.lock).toHaveBeenCalledWith(decryptedMnemonics, 'NewSecurePassword456!');
      expect(storage.setStorageItem).toHaveBeenCalledWith('salmon_mnemonics', newVault);
      expect(storage.removeStashItem).toHaveBeenCalledWith('derived_key_cache');
      expect(stashStore['derived_key_cache']).toBeUndefined();
    });

    it('should ignore an invalid cached key on init and remain locked with metadata loaded', async () => {
      const mockAccount = createMockAccount();
      const storedAccounts = [
        {
          id: mockAccount.id,
          name: mockAccount.name,
          avatar: mockAccount.avatar,
          pathIndexes: mockAccount.pathIndexes,
        },
      ];

      const encryptedData = {
        isEncrypted: true,
        nonce: 'test-nonce',
        salt: 'test-salt',
        ciphertext: 'encrypted-data',
      };

      stashStore['derived_key_cache'] = {
        key: [1, 2, 3],
        salt: 'stale-salt',
        iterations: 210000,
        digest: 'sha512' as const,
        expiresAt: Date.now() - 1,
      };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_mnemonics') return Promise.resolve(encryptedData);
        if (key === 'salmon_accounts') return Promise.resolve(storedAccounts);
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        if (key === 'salmon_account_counter') return Promise.resolve(1);
        if (key === 'salmon_wallets') return Promise.resolve(null);
        return Promise.resolve(null);
      });
      (encryption.isKeyCacheValid as any).mockReturnValue(false);

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      expect(encryption.unlockWithKey).not.toHaveBeenCalled();
      expect(result.current[0].locked).toBe(true);
      expect(result.current[0].requiredLock).toBe(true);
      expect(result.current[0].accounts).toHaveLength(1);
      expect(result.current[0].accounts[0].secret).toEqual({ kind: 'mnemonic', mnemonic: '' });
      expect(result.current[0].accounts[0].networksAccounts).toEqual({});
    });
  });

  describe('Account Management', () => {
    it('should add new account', async () => {
      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const newAccount = createMockAccount();
      const [, actions] = result.current;

      await act(async () => {
        await actions.addAccount(newAccount);
      });

      const [state] = result.current;
      expect(state.accounts).toHaveLength(1);
      expect(state.accounts[0].id).toBe(newAccount.id);
      expect(storage.setStorageItem).toHaveBeenCalledWith('salmon_accounts', expect.any(Array));
    });

    it('should add account with password encryption', async () => {
      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const newAccount = createMockAccount();
      const [, actions] = result.current;

      await act(async () => {
        await actions.addAccount(newAccount, MOCK_PASSWORD);
      });

      // encryptMnemonics is called with mnemonics, password, and options
      expect(encryptMnemonics).toHaveBeenCalledWith(
        { [newAccount.id]: MOCK_MNEMONIC },
        MOCK_PASSWORD,
        { cacheNewKey: true }
      );
      expect(storage.setStorageItem).toHaveBeenCalledWith(
        'salmon_mnemonics',
        expect.objectContaining({ isEncrypted: true })
      );
    });

    it('should re-encrypt mnemonics when adding account without explicit password to encrypted wallet', async () => {
      // When addAccount is called without a password but the wallet is encrypted,
      // encryptMnemonics handles re-encryption using cached derived key or stashed password.
      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const newAccount = createMockAccount();

      // Call addAccount WITHOUT password
      await act(async () => {
        await result.current[1].addAccount(newAccount);
      });

      // encryptMnemonics is called without password — it internally decides how to encrypt
      expect(encryptMnemonics).toHaveBeenCalledWith({ [newAccount.id]: MOCK_MNEMONIC }, undefined, {
        cacheNewKey: false,
      });
      expect(storage.setStorageItem).toHaveBeenCalledWith(
        'salmon_mnemonics',
        expect.objectContaining({ isEncrypted: true })
      );
    });

    it('aborts addAccount when encryptMnemonics throws and leaves runtime/storage untouched', async () => {
      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const baselineAccounts = result.current[0].accounts.length;
      const baselineRequiredLock = result.current[0].requiredLock;

      // Force the next encryptMnemonics call to fail (cached key expired,
      // no password supplied — exactly the runtime regression we're fixing).
      const throwingMock = vi.fn().mockRejectedValueOnce(new Error('material missing'));
      (encryptMnemonics as any).mockImplementationOnce(throwingMock);

      const newAccount = createMockAccount();
      await act(async () => {
        await expect(result.current[1].addAccount(newAccount)).rejects.toThrow('material missing');
      });

      // Runtime state did not advance
      expect(result.current[0].accounts.length).toBe(baselineAccounts);
      // Lock requirement was not turned off as a side effect
      expect(result.current[0].requiredLock).toBe(baselineRequiredLock);
      // Storage was not written
      expect(storage.setStorageItem).not.toHaveBeenCalledWith(
        'salmon_mnemonics',
        expect.anything()
      );
    });

    it('aborts removeAccount when encryptMnemonics throws and leaves runtime/storage untouched', async () => {
      const mockAccount1 = createMockAccount();
      const mockAccount2 = { ...createMockAccount(), id: 'account_throw_remove' };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount1.id,
              name: mockAccount1.name,
              avatar: mockAccount1.avatar,
              pathIndexes: mockAccount1.pathIndexes,
            },
            {
              id: mockAccount2.id,
              name: mockAccount2.name,
              avatar: mockAccount2.avatar,
              pathIndexes: mockAccount2.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics')
          return Promise.resolve({
            [mockAccount1.id]: MOCK_MNEMONIC,
            [mockAccount2.id]: MOCK_MNEMONIC,
          });
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount1.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
        expect(result.current[0].accounts).toHaveLength(2);
      });

      const baselineRequiredLock = result.current[0].requiredLock;
      vi.mocked(storage.setStorageItem).mockClear();

      (encryptMnemonics as any).mockRejectedValueOnce(new Error('material missing'));

      await act(async () => {
        await expect(result.current[1].removeAccount(mockAccount1.id)).rejects.toThrow(
          'material missing'
        );
      });

      // Account list unchanged
      expect(result.current[0].accounts).toHaveLength(2);
      // Lock requirement preserved
      expect(result.current[0].requiredLock).toBe(baselineRequiredLock);
      // Vault never overwritten
      expect(storage.setStorageItem).not.toHaveBeenCalledWith(
        'salmon_mnemonics',
        expect.anything()
      );
    });

    it('should re-encrypt mnemonics when removing account without explicit password from encrypted wallet', async () => {
      // When removeAccount is called without a password but the wallet is encrypted,
      // encryptMnemonics handles re-encryption using stashed password or cached key.
      const mockAccount1 = createMockAccount();
      const mockAccount2 = { ...createMockAccount(), id: 'account_789' };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount1.id,
              name: mockAccount1.name,
              avatar: mockAccount1.avatar,
              pathIndexes: mockAccount1.pathIndexes,
            },
            {
              id: mockAccount2.id,
              name: mockAccount2.name,
              avatar: mockAccount2.avatar,
              pathIndexes: mockAccount2.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics')
          return Promise.resolve({
            [mockAccount1.id]: MOCK_MNEMONIC,
            [mockAccount2.id]: MOCK_MNEMONIC,
          });
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount1.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
        expect(result.current[0].accounts).toHaveLength(2);
      });

      // Remove account WITHOUT password
      await act(async () => {
        await result.current[1].removeAccount(mockAccount1.id);
      });

      // encryptMnemonics is called with remaining mnemonics, no password, cacheNewKey=false
      expect(encryptMnemonics).toHaveBeenCalledWith(
        { [mockAccount2.id]: MOCK_MNEMONIC },
        undefined,
        { cacheNewKey: false }
      );
      expect(storage.setStorageItem).toHaveBeenCalledWith(
        'salmon_mnemonics',
        expect.objectContaining({ isEncrypted: true })
      );
    });

    it('should edit account name', async () => {
      const mockAccount = createMockAccount();
      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;
      const newName = 'Updated Account Name';

      await act(async () => {
        await actions.editAccount(mockAccount.id, { name: newName });
      });

      const [state] = result.current;
      expect(state.accounts[0].name).toBe(newName);
    });

    it('should edit account avatar', async () => {
      const mockAccount = createMockAccount();
      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;
      const newAvatar = 'custom-avatar';

      await act(async () => {
        await actions.editAccount(mockAccount.id, { avatar: newAvatar });
      });

      const [state] = result.current;
      expect(state.accounts[0].avatar).toBe(newAvatar);
    });

    it('adds derived accounts without mutating the account held before the edit', async () => {
      const mockAccount = createMockAccount();
      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [before, actions] = result.current;
      const previous = before.accounts[0];
      const networkId = Object.keys(previous.networksAccounts)[0];
      const previousSlots = previous.networksAccounts[networkId];
      const previousLength = previousSlots.length;
      const derived = { ...previousSlots[0], index: previousLength + 1 } as any;

      await act(async () => {
        await actions.editAccount(mockAccount.id, { newDerivedAccounts: [derived] });
      });

      const [after] = result.current;
      expect(after.accounts[0].networksAccounts[networkId][previousLength + 1]).toBe(derived);
      expect(after.accounts[0].networksAccounts[networkId][previousLength]).toBeNull();
      // The object captured before the edit is untouched.
      expect(previous.networksAccounts[networkId]).toBe(previousSlots);
      expect(previousSlots.length).toBe(previousLength);
    });

    it('should remove account', async () => {
      const mockAccount1 = createMockAccount();
      const mockAccount2 = { ...createMockAccount(), id: 'account_789' };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount1.id,
              name: mockAccount1.name,
              avatar: mockAccount1.avatar,
              pathIndexes: mockAccount1.pathIndexes,
            },
            {
              id: mockAccount2.id,
              name: mockAccount2.name,
              avatar: mockAccount2.avatar,
              pathIndexes: mockAccount2.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics')
          return Promise.resolve({
            [mockAccount1.id]: MOCK_MNEMONIC,
            [mockAccount2.id]: MOCK_MNEMONIC,
          });
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount1.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
        expect(result.current[0].accounts).toHaveLength(2);
      });

      const [, actions] = result.current;

      await act(async () => {
        await actions.removeAccount(mockAccount1.id);
      });

      const [state] = result.current;
      expect(state.accounts).toHaveLength(1);
      expect(state.accounts[0].id).toBe(mockAccount2.id);
    });

    it('should remove all accounts when removing last account', async () => {
      const mockAccount = createMockAccount();

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        await actions.removeAccount(mockAccount.id);
      });

      const [state] = result.current;
      expect(state.accounts).toEqual([]);
      expect(state.accountId).toBeNull();
      expect(storage.removeStorageItem).toHaveBeenCalledWith('salmon_mnemonics');
    });

    it('should remove all accounts', async () => {
      const mockAccount = createMockAccount();
      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        await actions.removeAllAccounts();
      });

      const [state] = result.current;
      expect(state.accounts).toEqual([]);
      expect(state.locked).toBe(false);
      expect(state.requiredLock).toBe(false);
      expect(storage.removeStorageItem).toHaveBeenCalledWith('salmon_mnemonics');
      expect(storage.removeStorageItem).toHaveBeenCalledWith('salmon_accounts');
    });

    it('should clear the cached derived key when removing all accounts', async () => {
      const mockAccount = createMockAccount();

      stashStore['derived_key_cache'] = {
        key: [1, 2, 3],
        salt: 'test-salt',
        iterations: 210000,
        digest: 'sha512' as const,
        expiresAt: Date.now() + 60_000,
      };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      await act(async () => {
        await result.current[1].removeAllAccounts();
      });

      expect(storage.removeStashItem).toHaveBeenCalledWith('derived_key_cache');
      expect(stashStore['derived_key_cache']).toBeUndefined();
      expect(result.current[0].accounts).toEqual([]);
      expect(result.current[0].accountId).toBeNull();
      expect(result.current[0].networkId).toBeNull();
    });
  });

  describe('Account Switching', () => {
    it('should change active account', async () => {
      const mockAccount1 = createMockAccount();
      const mockAccount2 = { ...createMockAccount(), id: 'account_789' };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount1.id,
              name: mockAccount1.name,
              avatar: mockAccount1.avatar,
              pathIndexes: mockAccount1.pathIndexes,
            },
            {
              id: mockAccount2.id,
              name: mockAccount2.name,
              avatar: mockAccount2.avatar,
              pathIndexes: mockAccount2.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics')
          return Promise.resolve({
            [mockAccount1.id]: MOCK_MNEMONIC,
            [mockAccount2.id]: MOCK_MNEMONIC,
          });
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount1.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        await actions.changeAccount(mockAccount2.id);
      });

      const [state] = result.current;
      expect(state.accountId).toBe(mockAccount2.id);
      expect(storage.setStorageItem).toHaveBeenCalledWith(
        'salmon_active_account_id',
        mockAccount2.id
      );
    });

    it('should change active network', async () => {
      const mockAccount = createMockAccount();
      mockAccount.networksAccounts['solana-devnet'] = [mockSolanaAccount as any];
      mockAccount.pathIndexes['solana-devnet'] = [0];

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        await actions.changeNetwork('solana-devnet');
      });

      const [state] = result.current;
      expect(state.networkId).toBe('solana-devnet');
      expect(storage.setStorageItem).toHaveBeenCalledWith(
        'salmon_active_network_id',
        'solana-devnet'
      );
    });

    it('should switch accounts after adding two accounts via addAccount (real user flow)', async () => {
      // This test simulates the ACTUAL user flow:
      // 1. Start with empty wallet
      // 2. Add first account
      // 3. Add second account
      // 4. Try to switch back to first account
      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      // Verify initial state: no accounts, networkId is null
      expect(result.current[0].accounts).toHaveLength(0);
      expect(result.current[0].networkId).toBeNull();

      const account1 = createMockAccount();
      const account2 = { ...createMockAccount(), id: 'account_second_xyz', name: 'Account 2' };

      // Add first account
      await act(async () => {
        await result.current[1].addAccount(account1);
      });

      expect(result.current[0].accountId).toBe(account1.id);
      expect(result.current[0].networkId).toBe('solana-mainnet');
      expect(result.current[0].accounts).toHaveLength(1);

      // Add second account (uses latest actions with updated closure)
      await act(async () => {
        await result.current[1].addAccount(account2);
      });

      expect(result.current[0].accountId).toBe(account2.id);
      expect(result.current[0].accounts).toHaveLength(2);

      // CRITICAL: Try to switch back to account 1
      await act(async () => {
        await result.current[1].changeAccount(account1.id);
      });

      // Did the switch actually happen?
      expect(result.current[0].accountId).toBe(account1.id);
      expect(storage.setStorageItem).toHaveBeenCalledWith('salmon_active_account_id', account1.id);
    });

    it('should switch accounts even when networkId is null', async () => {
      // Verifies that the !networkId guard (which blocked switching in locked
      // state when no NETWORK_ID was stored) has been removed.
      // v2 only checked: if (account) { ... }

      const mockAccount1 = createMockAccount();
      const mockAccount2 = { ...createMockAccount(), id: 'account_789', name: 'Account 2' };

      const encryptedData = {
        isEncrypted: true,
        nonce: 'test-nonce',
        salt: 'test-salt',
        ciphertext: 'encrypted-data',
      };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_mnemonics') return Promise.resolve(encryptedData);
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount1.id,
              name: mockAccount1.name,
              avatar: mockAccount1.avatar,
              pathIndexes: mockAccount1.pathIndexes,
            },
            {
              id: mockAccount2.id,
              name: mockAccount2.name,
              avatar: mockAccount2.avatar,
              pathIndexes: mockAccount2.pathIndexes,
            },
          ]);
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount1.id);
        // INTENTIONALLY not providing salmon_active_network_id
        // loadMetadata will set networkId = null
        if (key === 'salmon_account_counter') return Promise.resolve(2);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      // Verify: locked state, accounts loaded via metadata, networkId is null
      expect(result.current[0].locked).toBe(true);
      expect(result.current[0].accounts).toHaveLength(2);
      expect(result.current[0].accountId).toBe(mockAccount1.id);
      expect(result.current[0].networkId).toBeNull();

      // Switch accounts with networkId = null — should succeed now
      await act(async () => {
        await result.current[1].changeAccount(mockAccount2.id);
      });

      expect(result.current[0].accountId).toBe(mockAccount2.id);
      expect(storage.setStorageItem).toHaveBeenCalledWith(
        'salmon_active_account_id',
        mockAccount2.id
      );
    });

    it('should change path index', async () => {
      const mockAccount = createMockAccount();
      mockAccount.networksAccounts['solana-mainnet'] = [
        mockSolanaAccount as any,
        mockSolanaAccount as any,
      ];
      mockAccount.pathIndexes['solana-mainnet'] = [0, 1];

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        if (key === 'salmon_active_path_index') return Promise.resolve(0);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        await actions.changePathIndex(1);
      });

      const [state] = result.current;
      expect(state.pathIndex).toBe(1);
      expect(storage.setStorageItem).toHaveBeenCalledWith('salmon_active_path_index', 1);
    });
  });

  describe('switchNetwork', () => {
    it('should switch to a valid network and persist to storage', async () => {
      const mockAccount = createMockAccount();
      mockAccount.networksAccounts['solana-devnet'] = [mockSolanaAccount as any];
      mockAccount.pathIndexes['solana-devnet'] = [0];

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        await actions.switchNetwork('solana-devnet');
      });

      const [state] = result.current;
      expect(state.networkId).toBe('solana-devnet');
      expect(storage.setStorageItem).toHaveBeenCalledWith(
        'salmon_active_network_id',
        'solana-devnet'
      );
    });

    it('should handle switching to an invalid network gracefully', async () => {
      const mockAccount = createMockAccount();

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        await actions.switchNetwork('invalid-network');
      });

      const [state] = result.current;
      // Should remain on the original network
      expect(state.networkId).toBe('solana-mainnet');
    });
  });

  describe('getNetworkId', () => {
    it('should return current network ID', async () => {
      const mockAccount = createMockAccount();

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;
      const networkId = actions.getNetworkId();

      expect(networkId).toBe('solana-mainnet');
    });

    it('should return default network when none is set', async () => {
      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;
      const networkId = actions.getNetworkId();

      expect(networkId).toBeNull();
    });
  });

  describe('Trusted Apps', () => {
    it('should add trusted app', async () => {
      const mockAccount = createMockAccount();
      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        if (key === 'salmon_trusted_apps') return Promise.resolve({});
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        await actions.addTrustedApp('example.com', { name: 'Example App', icon: 'icon.png' });
      });

      const [state] = result.current;
      expect(state.activeTrustedApps['example.com']).toBeDefined();
      expect(state.activeTrustedApps['example.com'].name).toBe('Example App');
    });

    it('should remove trusted app', async () => {
      const mockAccount = createMockAccount();
      const initialTrustedApps = {
        'solana-mainnet': {
          'example.com': { name: 'Example App', icon: 'icon.png' },
        },
      };

      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        if (key === 'salmon_trusted_apps') return Promise.resolve(initialTrustedApps);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        await actions.removeTrustedApp('example.com');
      });

      const [state] = result.current;
      expect(state.activeTrustedApps['example.com']).toBeUndefined();
    });
  });

  describe('Custom Tokens', () => {
    it('should import custom tokens', async () => {
      const mockAccount = createMockAccount();
      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        if (key === 'salmon_custom_tokens') return Promise.resolve({});
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [, actions] = result.current;

      await act(async () => {
        await actions.importTokens('solana-mainnet', [
          {
            address: 'TokenAddress1111111111111111111111111111',
            symbol: 'TKN',
            name: 'Token',
            decimals: 9,
            logoURI: 'logo.png',
          },
        ]);
      });

      const [state] = result.current;
      expect(state.activeTokens['TokenAddress1111111111111111111111111111']).toBeDefined();
      expect(state.activeTokens['TokenAddress1111111111111111111111111111'].symbol).toBe('TKN');
    });
  });

  describe('Computed Values', () => {
    it('should provide active account', async () => {
      const mockAccount = createMockAccount();
      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount.id);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [state] = result.current;
      expect(state.activeAccount).toBeDefined();
      expect(state.activeAccount?.id).toBe(mockAccount.id);
    });

    it('should provide active blockchain account', async () => {
      const mockAccount = createMockAccount();
      (storage.getStorageItem as any).mockImplementation((key: string) => {
        if (key === 'salmon_accounts')
          return Promise.resolve([
            {
              id: mockAccount.id,
              name: mockAccount.name,
              avatar: mockAccount.avatar,
              pathIndexes: mockAccount.pathIndexes,
            },
          ]);
        if (key === 'salmon_mnemonics') return Promise.resolve({ [mockAccount.id]: MOCK_MNEMONIC });
        if (key === 'salmon_active_account_id') return Promise.resolve(mockAccount.id);
        if (key === 'salmon_active_network_id') return Promise.resolve('solana-mainnet');
        if (key === 'salmon_active_path_index') return Promise.resolve(0);
        return Promise.resolve(null);
      });

      const { result } = renderHook(() => useAccounts());

      await waitFor(() => {
        expect(result.current[0].ready).toBe(true);
      });

      const [state] = result.current;
      expect(state.activeBlockchainAccount).toBeDefined();
      expect(state.activeBlockchainAccount?.getReceiveAddress()).toBeTruthy();
    });
  });
});
