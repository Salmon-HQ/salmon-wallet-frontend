/**
 * Storage types and interfaces for platform-agnostic storage.
 *
 * This module provides a common interface for persistent storage that works
 * across different platforms (mobile with expo-secure-store, extension with
 * chrome.storage, web with localStorage).
 *
 * @module storage/types
 */

// ============================================================================
// Storage Adapter Interface
// ============================================================================

/**
 * Platform-specific storage adapter interface.
 *
 * Implementations must provide async get/set/remove/clear operations.
 * Data is serialized to JSON strings internally.
 *
 * @example
 * ```typescript
 * // Example adapter for localStorage
 * const localStorageAdapter: StorageAdapter = {
 *   getItem: async (key) => localStorage.getItem(key),
 *   setItem: async (key, value) => localStorage.setItem(key, value),
 *   removeItem: async (key) => localStorage.removeItem(key),
 *   clear: async () => localStorage.clear(),
 * };
 * ```
 */
export interface StorageAdapter {
  /**
   * Retrieves a raw string value from storage.
   * @param key - The storage key
   * @returns The stored string value, or null if not found
   */
  getItem(key: string): Promise<string | null>;

  /**
   * Stores a raw string value.
   * @param key - The storage key
   * @param value - The string value to store
   */
  setItem(key: string, value: string): Promise<void>;

  /**
   * Removes a value from storage.
   * @param key - The storage key to remove
   */
  removeItem(key: string): Promise<void>;

  /**
   * Clears all stored values.
   */
  clear(): Promise<void>;
}

// ============================================================================
// Typed Storage Interface
// ============================================================================

/**
 * Type-safe storage interface with automatic JSON serialization.
 *
 * This interface wraps a StorageAdapter and provides type-safe get/set
 * operations with automatic JSON serialization and deserialization.
 *
 * @example
 * ```typescript
 * interface UserSettings {
 *   theme: 'light' | 'dark';
 *   notifications: boolean;
 * }
 *
 * const settings = await storage.getItem<UserSettings>('settings');
 * if (settings) {
 *   console.log(settings.theme);
 * }
 * ```
 */
export interface TypedStorage {
  /**
   * Retrieves and deserializes a typed value from storage.
   * @typeParam T - The expected type of the stored value
   * @param key - The storage key
   * @returns The deserialized value, or null if not found
   */
  getItem<T>(key: string): Promise<T | null>;

  /**
   * Serializes and stores a typed value.
   * @typeParam T - The type of value to store
   * @param key - The storage key
   * @param value - The value to store (will be JSON serialized)
   */
  setItem<T>(key: string, value: T): Promise<void>;

  /**
   * Removes a value from storage.
   * @param key - The storage key to remove
   */
  removeItem(key: string): Promise<void>;

  /**
   * Clears all stored values.
   */
  clear(): Promise<void>;
}

// ============================================================================
// Stash (In-Memory Session Storage) Interface
// ============================================================================

/**
 * In-memory session storage interface for sensitive data.
 *
 * The stash is used for temporarily storing sensitive data (like passwords
 * and session tokens) that should not persist to disk. On mobile, this is
 * a simple in-memory Map. On extensions, it communicates with the background
 * service worker which maintains the in-memory state.
 *
 * Important: Stash data is lost when the app/extension is closed. This is
 * intentional for security - sensitive data should not persist.
 *
 * @example
 * ```typescript
 * // Store password temporarily for the session
 * await stash.setItem('password', 'userPassword');
 *
 * // Later, retrieve it for decryption
 * const password = await stash.getItem<string>('password');
 *
 * // Clear on logout
 * await stash.clear();
 * ```
 */
export interface Stash {
  /**
   * Retrieves a typed value from the in-memory stash.
   * @typeParam T - The expected type of the stashed value
   * @param key - The stash key
   * @returns The stashed value, or undefined if not found
   */
  getItem<T>(key: string): Promise<T | undefined>;

  /**
   * Stores a typed value in the in-memory stash.
   * @typeParam T - The type of value to store
   * @param key - The stash key
   * @param value - The value to store
   */
  setItem<T>(key: string, value: T): Promise<void>;

  /**
   * Removes a value from the stash.
   * @param key - The stash key to remove
   */
  removeItem(key: string): Promise<void>;

  /**
   * Clears all stashed values.
   */
  clear(): Promise<void>;
}

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * Well-known storage keys used by the wallet.
 *
 * Using constants prevents typos and makes it easy to track
 * what data is stored where.
 */
export const STORAGE_KEYS = {
  // -- Account management (useAccounts) --
  /** Account creation counter */
  COUNTER: 'salmon_account_counter',
  /** Serialized account list */
  ACCOUNTS: 'salmon_accounts',
  /** Encrypted or plain mnemonics keyed by account ID */
  MNEMONICS: 'salmon_mnemonics',
  /** Currently active account ID */
  ACCOUNT_ID: 'salmon_active_account_id',
  /** Currently active network ID */
  NETWORK_ID: 'salmon_active_network_id',
  /** Currently active derivation path index */
  PATH_INDEX: 'salmon_active_path_index',
  /** Trusted dApp permissions per network */
  TRUSTED_APPS: 'salmon_trusted_apps',
  /** User-imported custom tokens per network */
  CUSTOM_TOKENS: 'salmon_custom_tokens',
  /** Active connection info for external apps */
  CONNECTION: 'salmon_connection',

  // -- User preferences --
  /** User settings and preferences (useUserConfig) */
  SETTINGS: 'salmon_settings',
  /** Preferred display currency (e.g. 'USD', 'EUR') */
  CURRENCY: 'salmon_currency',
  /** User's preferred language (useLanguage) */
  LANGUAGE: 'salmon_language',
  /** Address book / contacts (useAddressbook) */
  CONTACTS: 'salmon_contacts',
  /** Balance visibility preference */
  HIDDEN_BALANCE: 'salmon_hidden_balance',
  /** Anonymous usage-analytics consent flag (opt-in, default off) */
  ANALYTICS_CONSENT: 'salmon_analytics_consent',
  /** Random per-install analytics id — NOT derived from any wallet data */
  ANALYTICS_INSTALL_ID: 'salmon_analytics_install_id',
  /** Whether the first-run analytics consent prompt has been answered */
  ANALYTICS_CONSENT_PROMPTED: 'salmon_analytics_consent_prompted',
  /** One-shot flag: the first successful send has been reported (activation) */
  ANALYTICS_FIRST_SEND: 'salmon_analytics_first_send',
  /** One-shot flag: the first successful swap has been reported (activation) */
  ANALYTICS_FIRST_SWAP: 'salmon_analytics_first_swap',
  /** Device-only onboarding event ('wallet_created' | 'wallet_recovered') parked until the consent prompt is answered */
  ANALYTICS_PENDING_ONBOARDING_EVENT: 'salmon_analytics_pending_onboarding_event',

  // -- Cross-chain settlement --
  /** Pending StealthEX bridge exchanges awaiting completion (BridgeSettlement) */
  PENDING_BRIDGES: 'salmon_pending_bridges',

  // -- Legacy keys (v2 → v3 migration, removed after upgrade) --
  /** @deprecated Legacy wallet list */
  WALLETS: 'salmon_wallets',
  /** @deprecated Legacy active wallet index */
  ACTIVE: 'salmon_active',
  /** @deprecated Legacy endpoint configuration */
  ENDPOINTS: 'salmon_endpoints',
} as const;

/**
 * Type for storage key values.
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// ============================================================================
// Stash Keys
// ============================================================================

/**
 * Well-known stash keys for session data.
 *
 * Stash keys are for temporary in-memory data that should not
 * be persisted to disk.
 */
export const STASH_KEYS = {
  /** User's decryption password (cleared on lock) */
  PASSWORD: 'password',
  /** Cached PBKDF2 derived key for fast re-encryption */
  DERIVED_KEY: 'derived_key_cache',
  /** Timestamp of last activity (for auto-lock) */
  LAST_ACTIVITY: 'salmon_last_activity',
  /** Temporary mnemonic transfer between auth screens */
  PENDING_MNEMONIC: 'pending_mnemonic',
} as const;

/**
 * Type for stash key values.
 */
export type StashKey = (typeof STASH_KEYS)[keyof typeof STASH_KEYS];

// ============================================================================
// Platform Types
// ============================================================================

/**
 * Supported platform types for storage implementation selection.
 */
export type Platform = 'mobile' | 'extension' | 'web';

/**
 * Configuration for storage initialization.
 */
export interface StorageConfig {
  /** The platform to use for storage */
  platform: Platform;
  /** Optional custom adapter (overrides platform default) */
  adapter?: StorageAdapter;
}
