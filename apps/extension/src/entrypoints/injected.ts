import { SolanaProvider } from '@/lib/SolanaProvider';
import { initialize } from '@/wallet-standard';

/**
 * Injected script that runs in the context of web pages.
 * This script creates the Salmon wallet provider and exposes it
 * to the page via window.salmon, and initializes wallet-standard support.
 *
 * Deliberately does NOT import `../polyfills/node`: this runs in page scope, so
 * defining `globalThis.Buffer` / `globalThis.process` there would change how
 * every site the user visits feature-detects its runtime. The injected graph is
 * kit codecs + bs58 + eventemitter3, all `Uint8Array`-native. The popup and
 * sidepanel entrypoints keep the polyfill — they run in extension origin and
 * still host web3.js through `@salmon/shared`.
 */
export default defineUnlistedScript(() => {
  // Create the Solana provider instance
  const salmon = new SolanaProvider();

  // Initialize wallet-standard support for dApp discovery
  initialize(salmon);

  // Expose the provider on the window object
  try {
    Object.defineProperty(window, 'salmon', {
      value: salmon,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    // Also expose as solana for broader compatibility (optional)
    // Some dApps look for window.solana as a fallback
    if (!('solana' in window)) {
      Object.defineProperty(window, 'solana', {
        value: salmon,
        writable: false,
        enumerable: true,
        configurable: false,
      });
    }
  } catch (error) {
    console.error('[Salmon] Failed to inject provider:', error);
  }

  // Log successful injection in development
  if (import.meta.env.DEV) {
    console.log('[Salmon] Wallet provider injected successfully');
  }
});
