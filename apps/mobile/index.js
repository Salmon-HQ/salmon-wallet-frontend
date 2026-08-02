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
 * 2.2 Fill the gaps in React Native's AbortSignal polyfill
 * 2.3 Provide the EventTarget/CustomEvent globals React Native omits
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
// 2. Crypto Polyfill - Required for crypto libraries that expect WebCrypto
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
//     throws "s.digest is not a function".
//   - install(): adds generateKey/sign/verify/importKey/exportKey for Ed25519.
//     It is a no-op on runtimes with native Ed25519 (it probes once and hands
//     back the native implementation), so it is safe to call unconditionally.
//
// Why pure JS and not expo-crypto's native digest: passing a buffer across the
// JSI bridge to the Kotlin implementation fails on Hermes/Android, so every
// account creation died on the seed-derivation hash with
//   [Error: [digest] Cannot convert '[object ArrayBuffer]' to a Kotlin type.
//    no ArrayBuffer attached]
// @noble/hashes runs entirely in JS, which removes the bridge from the path and
// keeps the result byte-identical across devices.
//
// Note this leaves crypto.subtle without deriveBits. The PBKDF2 paths in
// @salmon/shared probe for subtle.deriveBits specifically, not for subtle.
const { sha256, sha384, sha512 } = require('@noble/hashes/sha2');
const DIGEST_ALGORITHMS = { 'SHA-256': sha256, 'SHA-384': sha384, 'SHA-512': sha512 };
if (!globalThis.crypto.subtle) {
  globalThis.crypto.subtle = {
    digest: async (algorithm, data) => {
      const name = (typeof algorithm === 'string' ? algorithm : algorithm.name).toUpperCase();
      const hash = DIGEST_ALGORITHMS[name];
      if (!hash) {
        throw new Error(`Unsupported digest algorithm: ${name}`);
      }
      // WebCrypto takes any BufferSource. Views need their offset and length
      // honoured; a bare ArrayBuffer wraps directly.
      const bytes = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
      // noble allocates a fresh array per call, so its buffer is never aliased
      // to the caller's input.
      return hash(bytes).buffer;
    },
  };
}
require('@solana/webcrypto-ed25519-polyfill').install();

// =============================================================================
// 2.2 AbortSignal Gap Fill - Required by @solana/kit RPC subscriptions
// =============================================================================
// React Native's setUpXHR.js unconditionally replaces global.AbortSignal with
// abort-controller@3.0.0, which predates most of the current spec. Verified on
// RN 0.83.6: AbortSignal.timeout, AbortSignal.abort, AbortSignal.any and
// signal.throwIfAborted are all undefined, and signals carry no `reason`.
//
// @solana/kit's subscription machinery uses every one of those, so signature
// confirmation for swaps and NFT burns throws "AbortSignal.timeout is not a
// function" on mobile without this. Each patch is feature-detected, so this is
// a no-op the moment React Native ships a compliant polyfill.
//
// The gap fill itself lives in src/polyfills/abort-signal.js so it can be unit
// tested; it is feature-detected and becomes a no-op once React Native ships a
// compliant polyfill.
require('./src/polyfills/abort-signal').installAbortSignalGapFill();

// =============================================================================
// 2.3 EventTarget / CustomEvent - Required by @solana/kit RPC subscriptions
// =============================================================================
// React Native defines neither global (verified on RN 0.83.6). The @solana
// subscription packages capture `globalThis.EventTarget` at module scope and
// construct it when a subscription opens, so signature confirmation threw
// "Cannot read property 'prototype' of undefined" *after* the transaction had
// already landed on chain.
//
// The polyfill lives in src/polyfills/event-target.js so it can be unit
// tested. It dispatches events by reference on purpose: @solana/subscribable
// gates on `ev instanceof CustomEvent` before reading `ev.detail`, so the
// wrapping implementation React Native already bundles (event-target-shim)
// would deliver every subscription message as undefined instead.
require('./src/polyfills/event-target').installEventTargetPolyfill();

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
