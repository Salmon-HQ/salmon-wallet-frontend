import type {
  Rpc,
  RpcSubscriptions,
  SolanaRpcApi,
  SolanaRpcSubscriptionsApi,
} from '@solana/kit';
import type { SolanaNetwork } from '../../types/blockchain';

/** The kit RPC client this package talks to Solana through. */
export type SolanaRpc = Rpc<SolanaRpcApi>;

/** The kit RPC subscriptions client, used for confirmations and account watches. */
export type SolanaRpcSubscriptions = RpcSubscriptions<SolanaRpcSubscriptionsApi>;

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
 * Use `resolveSolanaWsUrl` rather than calling this directly, so a
 * backend-supplied `wsUrl` is honoured where it is trustworthy.
 */
export function deriveSolanaWsUrl(nodeUrl: string): string {
  const url = new URL(nodeUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  if (url.port) {
    url.port = String(Number(url.port) + 1);
  }
  return url.toString();
}

/**
 * Picks the WebSocket endpoint for a network config.
 *
 * A backend-supplied `wsUrl` wins, but only when it points at the same host as
 * the RPC endpoint. The network catalog is fetched over the network, so an
 * off-host `wsUrl` would silently move subscription traffic — signature
 * confirmations and account watches — to a third party. Anything else falls
 * back to the derivation, which cannot leave the RPC host by construction.
 *
 * The port is deliberately not compared: `deriveSolanaWsUrl` shifts explicit
 * ports itself, and a different port on the same host is not a redirection.
 */
export function resolveSolanaWsUrl(nodeUrl: string, wsUrl?: string): string {
  if (wsUrl) {
    try {
      if (new URL(wsUrl).hostname === new URL(nodeUrl).hostname) {
        return wsUrl;
      }
    } catch {
      // Unparseable override — fall through to the derivation.
    }
  }
  return deriveSolanaWsUrl(nodeUrl);
}
