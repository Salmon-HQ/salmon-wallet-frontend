/**
 * Public Bitcoin transaction relays.
 *
 * A signed Bitcoin transaction goes straight from the client to one of these
 * public relays — it never passes through the Salmon backend. Both accept the
 * raw signed hex as a `text/plain` body and answer with the txid as plain
 * text, so the two are interchangeable and the second is only a fallback for
 * the first being unreachable.
 *
 * @module config/bitcoin-relays
 */

/**
 * Relay endpoints per Bitcoin network, primary first.
 */
export const BITCOIN_BROADCAST_RELAYS = {
  mainnet: ['https://mempool.space/api/tx', 'https://blockstream.info/api/tx'],
  testnet: ['https://mempool.space/testnet/api/tx', 'https://blockstream.info/testnet/api/tx'],
} as const;

/**
 * Resolves the relay endpoints for a Bitcoin network id
 * (`bitcoin` / `bitcoin-mainnet` / `bitcoin-testnet`).
 */
export function getBitcoinBroadcastRelays(networkId: string): readonly string[] {
  return networkId === 'bitcoin-testnet'
    ? BITCOIN_BROADCAST_RELAYS.testnet
    : BITCOIN_BROADCAST_RELAYS.mainnet;
}
