import { describe, expect, it } from 'vitest';
import { deriveSolanaWsUrl } from './networks';

describe('deriveSolanaWsUrl', () => {
  it.each([
    // The real backend shapes: a query string carrying the API key must survive.
    ['https://mainnet.helius-rpc.com/?api-key=K', 'wss://mainnet.helius-rpc.com/?api-key=K'],
    // Triton puts the token in the path.
    ['https://rpc.triton.example/TOKEN', 'wss://rpc.triton.example/TOKEN'],
    ['https://api.testnet.solana.com', 'wss://api.testnet.solana.com/'],
    // A local agave-validator serves the websocket on the RPC port + 1.
    ['http://127.0.0.1:8899', 'ws://127.0.0.1:8900/'],
  ])('maps %s to %s', (nodeUrl, expected) => {
    expect(deriveSolanaWsUrl(nodeUrl)).toBe(expected);
  });
});
