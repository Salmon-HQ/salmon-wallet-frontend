import type { SolanaNetwork } from '../../types/blockchain';

/**
 * Pre-defined network configurations for common Solana networks.
 * RPC URLs here are public fallbacks — useAvailableNetworks merges
 * the real URLs from the backend API at runtime.
 */
export const SOLANA_NETWORKS: Record<string, SolanaNetwork> = {
  'solana-mainnet': {
    id: 'solana-mainnet',
    networkId: 'solana-mainnet',
    name: 'Mainnet Beta',
    config: {
      nodeUrl: 'https://api.mainnet-beta.solana.com',
      commitment: 'confirmed',
    },
  },
  'solana-devnet': {
    id: 'solana-devnet',
    networkId: 'solana-devnet',
    name: 'Devnet',
    config: {
      nodeUrl: 'https://api.devnet.solana.com',
      commitment: 'confirmed',
    },
  },
};

/**
 * Derives the WebSocket endpoint from an RPC endpoint.
 *
 * @solana/kit refuses an http(s) URL for subscriptions, while the backend only
 * ever sends `nodeUrl`. This reproduces what `new Connection(url)` did
 * internally in @solana/web3.js: https -> wss, http -> ws, and an explicitly
 * specified port shifted by +1 (agave-validator's convention). A port-less URL
 * is assumed to sit behind a reverse proxy that upgrades on the same port,
 * which is what both Helius and Triton do.
 *
 * Prefer `config.wsUrl` over this whenever the backend provides one.
 */
export function deriveSolanaWsUrl(nodeUrl: string): string {
  const url = new URL(nodeUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  if (url.port) {
    url.port = String(Number(url.port) + 1);
  }
  return url.toString();
}
