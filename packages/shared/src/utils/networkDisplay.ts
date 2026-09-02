/**
 * Per-network display metadata: the ticker and the name the UI shows for a
 * network id. A leaf on purpose — the balance block's cues and the derived
 * accounts scan both read it, and the cues must not drag the scan's chain
 * clients into a component test.
 */

export interface NetworkDisplayInfo {
  /** Native token ticker, e.g. "SOL", "BTC", "ETH". */
  symbol: string;
  /** Human-readable network name shown in the UI. */
  name: string;
  /** Underlying blockchain family. */
  blockchain: 'solana' | 'bitcoin' | 'ethereum';
}

export const NETWORK_DISPLAY: Record<string, NetworkDisplayInfo> = {
  'solana-mainnet': { symbol: 'SOL', name: 'Solana', blockchain: 'solana' },
  'solana-devnet': { symbol: 'SOL', name: 'Solana Devnet', blockchain: 'solana' },
  'bitcoin-mainnet': { symbol: 'BTC', name: 'Bitcoin', blockchain: 'bitcoin' },
  'bitcoin-testnet': { symbol: 'BTC', name: 'Bitcoin Testnet', blockchain: 'bitcoin' },
  'ethereum-mainnet': { symbol: 'ETH', name: 'Ethereum', blockchain: 'ethereum' },
  'ethereum-sepolia': { symbol: 'ETH', name: 'Ethereum Sepolia', blockchain: 'ethereum' },
};
