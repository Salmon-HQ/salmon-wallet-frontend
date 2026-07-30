/**
 * Custom Entry Point for Expo Router
 *
 * CRITICAL: This file MUST be the entry point (set in package.json "main").
 * Polyfills and initialization must happen BEFORE expo-router/entry loads.
 *
 * IMPORTANT: We use require() instead of import for modules that depend on
 * polyfills because ES module imports are hoisted and evaluated before any
 * code runs. Using require() ensures synchronous, ordered execution.
 *
 * Order of operations:
 * 1. Polyfill Buffer globally
 * 2. Polyfill crypto.getRandomValues()
 * 2.1 Polyfill crypto.subtle Ed25519 (+ digest)
 * 3. Polyfill process.env
 * 4. Initialize Storage & Stash (required for useAccounts hook)
 * 5. Load expo-router (which loads the app)
 */

// =============================================================================
// 1. Buffer Polyfill - MUST be first
// =============================================================================
const { Buffer } = require('buffer');
global.Buffer = Buffer;

// =============================================================================
// 1.1 Buffer.prototype.subarray Fix - Required for some crypto libraries
// =============================================================================
// In React Native (Hermes), Buffer.prototype.subarray returns a Uint8Array
// instead of a Buffer. This can break libraries that depend on Buffer methods.
// This patch ensures subarray returns a proper Buffer with the Buffer prototype.
if (!(Buffer.alloc(1).subarray(0, 1) instanceof Buffer)) {
  const originalSubarray = Buffer.prototype.subarray;
  Buffer.prototype.subarray = function subarray(begin, end) {
    const result = originalSubarray.call(this, begin, end);
    Object.setPrototypeOf(result, Buffer.prototype);
    return result;
  };
}

// =============================================================================
// 2. Crypto Polyfill - Required for @solana/web3.js and other crypto libraries
// =============================================================================
// Use expo-crypto for getRandomValues (official Expo SDK, works in Expo Go)
const { getRandomValues: expoCryptoGetRandomValues } = require('expo-crypto');

// Polyfill crypto.getRandomValues using expo-crypto
class Crypto {
  getRandomValues = expoCryptoGetRandomValues;
}

const webCrypto = typeof crypto !== 'undefined' ? crypto : new Crypto();

if (typeof crypto === 'undefined') {
  Object.defineProperty(global, 'crypto', {
    configurable: true,
    enumerable: true,
    get: () => webCrypto,
  });
}

// Also import react-native-get-random-values as a backup
// This is a more complete polyfill that some libraries prefer
require('react-native-get-random-values');

// =============================================================================
// 2.1 Ed25519 Web Crypto Polyfill - Required by @solana/kit signers
// =============================================================================
// Hermes has no crypto.subtle at all. @solana/kit derives and signs through
// WebCrypto Ed25519, so both pieces have to exist before any shared code runs:
//
//   - digest: @solana/webcrypto-ed25519-polyfill signs via @noble/ed25519,
//     whose sha512Async calls crypto.subtle.digest('SHA-512', ...). The
//     polyfill does not install digest, so without this shim every signature
//     throws "s.digest is not a function". expo-crypto's native digest takes
//     the same algorithm strings as WebCrypto.
//   - install(): adds generateKey/sign/verify/importKey/exportKey for Ed25519.
//     It is a no-op on runtimes with native Ed25519 (it probes once and hands
//     back the native implementation), so it is safe to call unconditionally.
//
// Note this leaves crypto.subtle without deriveBits. The PBKDF2 paths in
// @salmon/shared probe for subtle.deriveBits specifically, not for subtle.
const expoCrypto = require('expo-crypto');
if (!globalThis.crypto.subtle) {
  globalThis.crypto.subtle = {
    digest: (algorithm, data) =>
      expoCrypto.digest(typeof algorithm === 'string' ? algorithm : algorithm.name, data),
  };
}
require('@solana/webcrypto-ed25519-polyfill').install();

// =============================================================================
// 3. Process Polyfill - Some libraries expect process.env
// =============================================================================
if (typeof process === 'undefined') {
  global.process = { env: {} };
}

// =============================================================================
// 4. Initialize Storage & Stash - Required before useAccounts hook
// =============================================================================
const { initStorage, initStash, initAnalytics, createAsyncStorageAdapter } = require('@salmon/shared');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

// Create adapter using AsyncStorage for persistent storage
// Note: Sensitive data (mnemonics) is encrypted at the app layer before storage.
// expo-secure-store has a ~2KB limit on iOS which is too small for account data.
const adapter = createAsyncStorageAdapter(AsyncStorage);

// Initialize storage with mobile platform and AsyncStorage adapter
initStorage({ platform: 'mobile', adapter });

// Initialize stash for session data (in-memory for mobile)
initStash('mobile');

// Anonymous, opt-in usage analytics (no events until the user opts in).
initAnalytics({ platform: 'mobile', appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '3.0.0' });

// =============================================================================
// 5. Load Expo Router - This starts the app
// =============================================================================
require('expo-router/entry');
