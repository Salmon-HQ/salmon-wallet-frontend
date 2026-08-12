/**
 * Biometric authentication hook for secure wallet unlock.
 *
 * This hook provides biometric authentication functionality including:
 * - Checking device biometric capabilities
 * - Storing derived encryption keys securely with biometric protection
 * - Retrieving keys using biometric authentication
 * - Managing user preferences for biometric unlock
 *
 * The hook uses expo-local-authentication for biometric prompts and
 * expo-secure-store for secure key storage with biometric protection.
 *
 * @module hooks/useBiometricAuth
 */

import { useState, useEffect, useCallback } from 'react';
import i18n from 'i18next';
import * as LocalAuthentication from '../utils/localAuthentication';
import * as SecureStore from '../utils/secureStore';

// ============================================================================
// Constants
// ============================================================================

/**
 * Storage key for the biometrically-protected derived key.
 */
const BIOMETRIC_KEY_STORAGE = 'salmon_biometric_key';
const BIOMETRIC_KEY_MARKER = 'salmon_biometric_key_marker';

/**
 * Storage key for user's biometric preference.
 */
const BIOMETRIC_ENABLED_KEY = 'salmon_biometric_enabled';

/**
 * Flag indicating a biometric key has been stored.
 * This is a plain (non-protected) key so we can check it
 * without triggering the biometric prompt.
 */
const BIOMETRIC_KEY_EXISTS_FLAG = 'salmon_biometric_key_exists';

// OS prompt messages are resolved at call time via i18n.t so they follow the
// active language (this is a hook, not a component, so no useTranslation).

// ============================================================================
// Types
// ============================================================================

/**
 * State representing the device's biometric capabilities.
 */
export interface BiometricAuthState {
  /** Whether the initial capability check has completed */
  isReady: boolean;
  /** Whether biometric hardware is available on the device */
  isAvailable: boolean;
  /** Whether the user has enrolled biometrics (e.g., registered a fingerprint) */
  isEnrolled: boolean;
  /** The type of biometric available (null if none) */
  biometricType: 'fingerprint' | 'facial' | 'iris' | null;
  /** Whether a derived key is stored for biometric unlock */
  hasStoredKey: boolean;
}

/**
 * Outcome of a biometric enrollment attempt.
 *
 * `cancelled` is a user choice, not a failure — callers should stay put
 * rather than surface an error.
 */
export type BiometricEnrollResult = 'stored' | 'cancelled' | 'failed';

/**
 * Return type for the useBiometricAuth hook.
 */
export interface UseBiometricAuthReturn {
  /** Current biometric state */
  state: BiometricAuthState;
  /** Authenticate with biometrics and retrieve the stored key */
  authenticateWithBiometric: () => Promise<string | null>;
  /** Store a derived key for future biometric unlock */
  storeKeyForBiometric: (derivedKeyJson: string) => Promise<BiometricEnrollResult>;
  /** Clear the stored biometric key (for logout/reset) */
  clearBiometricKey: () => Promise<void>;
  /** Whether biometric unlock is enabled by the user */
  enableBiometric: boolean;
  /** Toggle biometric unlock preference */
  setEnableBiometric: (enabled: boolean) => Promise<void>;
  /** Refresh the biometric state (useful after app resume) */
  refreshState: () => Promise<void>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps LocalAuthentication types to our simplified type.
 */
function getBiometricType(
  types: LocalAuthentication.AuthenticationType[]
): 'fingerprint' | 'facial' | 'iris' | null {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'facial';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }
  return null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing biometric authentication for wallet unlock.
 *
 * This hook enables Face ID/Touch ID unlock by securely storing the
 * derived encryption key (from PBKDF2) in the device's secure enclave
 * with biometric protection.
 *
 * **Security Model:**
 * - The derived key (not the password) is stored in SecureStore
 * - Access to the key requires biometric authentication
 * - The key is the same one used for vault decryption
 * - If biometrics are compromised, only the session key is exposed
 *
 * **Usage Flow:**
 * 1. On successful password unlock, call `storeKeyForBiometric(keyJson)`
 * 2. On subsequent app launches, call `authenticateWithBiometric()`
 * 3. Use the returned key to decrypt the vault directly
 *
 * @returns Object containing biometric state and actions
 *
 * @example
 * ```tsx
 * function LockScreen() {
 *   const {
 *     state,
 *     authenticateWithBiometric,
 *     storeKeyForBiometric,
 *     enableBiometric,
 *     setEnableBiometric,
 *   } = useBiometricAuth();
 *
 *   // Show biometric button if available and key is stored
 *   const showBiometricButton = state.isAvailable &&
 *     state.hasStoredKey &&
 *     enableBiometric;
 *
 *   const handleBiometricUnlock = async () => {
 *     const keyJson = await authenticateWithBiometric();
 *     if (keyJson) {
 *       // Use keyJson to unlock vault without password
 *       const keyCache = JSON.parse(keyJson);
 *       // ... decrypt with keyCache
 *     }
 *   };
 *
 *   const handlePasswordUnlock = async (password: string) => {
 *     // After successful password unlock...
 *     const keyCache = await unlockAndGetKey(vault, password);
 *     // Store for future biometric unlock
 *     if (enableBiometric) {
 *       await storeKeyForBiometric(JSON.stringify(keyCache));
 *     }
 *   };
 * }
 * ```
 */
export function useBiometricAuth(): UseBiometricAuthReturn {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [state, setState] = useState<BiometricAuthState>({
    isReady: false,
    isAvailable: false,
    isEnrolled: false,
    biometricType: null,
    hasStoredKey: false,
  });

  const [enableBiometric, setEnableBiometricState] = useState(false);

  // -------------------------------------------------------------------------
  // Check Device Capabilities
  // -------------------------------------------------------------------------

  /**
   * Checks device biometric capabilities and updates state.
   */
  const checkBiometricCapabilities = useCallback(async (): Promise<void> => {
    try {
      // Check if hardware supports biometrics
      const hasHardware = await LocalAuthentication.hasHardwareAsync();

      // Check if user has enrolled biometrics
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // Get supported authentication types
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      // Check if we have a stored key by reading the plain flag
      // (NOT the protected key itself, which would trigger a biometric prompt)
      let hasStoredKey = false;
      try {
        const flag = await SecureStore.getItemAsync(BIOMETRIC_KEY_EXISTS_FLAG);
        hasStoredKey = flag === 'true';
      } catch {
        hasStoredKey = false;
      }

      setState({
        isReady: true,
        isAvailable: hasHardware && isEnrolled,
        isEnrolled,
        biometricType: getBiometricType(supportedTypes),
        hasStoredKey,
      });
    } catch (error) {
      console.error('Failed to check biometric capabilities:', error);
      setState({
        isReady: true,
        isAvailable: false,
        isEnrolled: false,
        biometricType: null,
        hasStoredKey: false,
      });
    }
  }, []);

  /**
   * Loads the user's biometric preference from storage.
   */
  const loadBiometricPreference = useCallback(async (): Promise<void> => {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setEnableBiometricState(enabled === 'true');
    } catch {
      setEnableBiometricState(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Initialize on Mount
  // -------------------------------------------------------------------------

  useEffect(() => {
    checkBiometricCapabilities();
    loadBiometricPreference();
  }, [checkBiometricCapabilities, loadBiometricPreference]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /**
   * Stores the derived key securely for future biometric unlock.
   *
   * The key is stored in SecureStore with biometric protection enabled,
   * meaning the user must authenticate with biometrics to retrieve it.
   *
   * The prompt is raised explicitly because iOS evaluates a keychain access
   * control only on read or update: writing a new protected item succeeds
   * without any authentication, so enrollment would otherwise never prompt.
   *
   * @param derivedKeyJson - JSON-serialized DerivedKeyCache object
   * @returns true if storage succeeded, false otherwise
   */
  const storeKeyForBiometric = useCallback(
    async (derivedKeyJson: string): Promise<BiometricEnrollResult> => {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: i18n.t('lock.biometric_enroll_prompt'),
          disableDeviceFallback: true,
        });

        if (!result.success) {
          console.log('[biometric] Enrollment not confirmed:', result.error);
          return result.error === 'user_cancel' || result.error === 'system_cancel'
            ? 'cancelled'
            : 'failed';
        }

        await SecureStore.setItemAsync(BIOMETRIC_KEY_STORAGE, derivedKeyJson, {
          // Require biometric authentication to access
          requireAuthentication: true,
          // Authentication prompt message
          authenticationPrompt: i18n.t('lock.biometric_prompt'),
        });
        await SecureStore.setItemAsync(BIOMETRIC_KEY_MARKER, 'true');

        // Set plain flag so we can check existence without triggering biometric
        await SecureStore.setItemAsync(BIOMETRIC_KEY_EXISTS_FLAG, 'true');

        // Update state to reflect stored key
        setState((prev) => ({ ...prev, hasStoredKey: true }));

        return 'stored';
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : '';
        if (msg.includes('canceled') || msg.includes('cancelled')) {
          console.log('[biometric] User cancelled biometric enrollment');
          return 'cancelled';
        }
        console.error('Failed to store key for biometric:', error);
        return 'failed';
      }
    },
    []
  );

  /**
   * Clears the stored biometric key.
   *
   * Call this when:
   * - User logs out
   * - User resets the wallet
   * - User disables biometric unlock
   * - Password is changed (key would be invalid)
   */
  const clearBiometricKey = useCallback(async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY_STORAGE);
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY_MARKER);
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY_EXISTS_FLAG);
      setState((prev) => ({ ...prev, hasStoredKey: false }));
    } catch (error) {
      console.error('Failed to clear biometric key:', error);
    }
  }, []);

  const authenticateWithBiometric = useCallback(async (): Promise<string | null> => {
    try {
      if (!state.isAvailable) {
        console.warn('Biometric authentication not available');
        return null;
      }

      // SecureStore with requireAuthentication triggers its own biometric prompt.
      // Race against a timeout so the UI never hangs if the native prompt fails to appear
      // (e.g. app not yet fully active on cold start or background resume).
      const BIOMETRIC_TIMEOUT_MS = 30_000;
      const storedKey = await Promise.race([
        SecureStore.getItemAsync(BIOMETRIC_KEY_STORAGE),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), BIOMETRIC_TIMEOUT_MS)),
      ]);

      if (!storedKey) {
        console.warn('No stored key found after biometric auth');
        return null;
      }

      return storedKey;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('canceled') || msg.includes('cancelled')) {
        console.log('[biometric] User cancelled biometric auth');
      } else {
        console.error('Biometric authentication error:', error);
        // Non-cancellation error — key may be invalidated (biometric change on device)
        await clearBiometricKey();
      }
      return null;
    }
  }, [state.isAvailable, clearBiometricKey]);

  /**
   * Sets the user's biometric preference.
   *
   * When disabled, also clears any stored key for security.
   *
   * @param enabled - Whether biometric unlock should be enabled
   */
  const setEnableBiometric = useCallback(
    async (enabled: boolean): Promise<void> => {
      try {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
        setEnableBiometricState(enabled);

        // If disabling, clear the stored key
        if (!enabled) {
          await clearBiometricKey();
        }
      } catch (error) {
        console.error('Failed to set biometric preference:', error);
      }
    },
    [clearBiometricKey]
  );

  /**
   * Refreshes the biometric state.
   *
   * Useful after app resumes from background or after
   * system biometric settings change.
   */
  const refreshState = useCallback(async (): Promise<void> => {
    await checkBiometricCapabilities();
    await loadBiometricPreference();
  }, [checkBiometricCapabilities, loadBiometricPreference]);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    state,
    authenticateWithBiometric,
    storeKeyForBiometric,
    clearBiometricKey,
    enableBiometric,
    setEnableBiometric,
    refreshState,
  };
}

export default useBiometricAuth;
