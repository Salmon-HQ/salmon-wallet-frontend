/**
 * Crypto Polyfills for React Native
 *
 * @deprecated This file is no longer the primary polyfill location.
 * Polyfills are now loaded in index.js (the app entry point) to ensure
 * they are available BEFORE expo-router loads any modules.
 *
 * This file is kept for backwards compatibility with test files and
 * other parts of the codebase that may still import it.
 *
 * Required for: bitcoinjs-lib and other crypto libraries
 */

// Polyfill for crypto.getRandomValues()
import 'react-native-get-random-values';

// Polyfill for Buffer global
import { Buffer } from 'buffer';
(global as unknown as Record<string, unknown>).Buffer = Buffer;

// Polyfill for process.env (some libraries expect this)
if (typeof process === 'undefined') {
  (global as unknown as Record<string, unknown>).process = { env: {} };
}

export {};
