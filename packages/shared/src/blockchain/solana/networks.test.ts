import { describe, expect, it } from 'vitest';
import { deriveSolanaWsUrl, resolveSolanaWsUrl } from './networks';

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

describe('resolveSolanaWsUrl', () => {
  const NODE_URL = 'https://mainnet.helius-rpc.com/?api-key=K';

  it('honours a backend wsUrl on the same host', () => {
    expect(resolveSolanaWsUrl(NODE_URL, 'wss://mainnet.helius-rpc.com/ws?api-key=K')).toBe(
      'wss://mainnet.helius-rpc.com/ws?api-key=K'
    );
  });

  it('ignores a backend wsUrl pointing at a different host', () => {
    // The catalog is fetched over the network; an off-host wsUrl would move
    // subscription traffic to a third party.
    expect(resolveSolanaWsUrl(NODE_URL, 'wss://attacker.example/ws')).toBe(
      'wss://mainnet.helius-rpc.com/?api-key=K'
    );
  });

  it('falls back to the derivation for an unparseable wsUrl', () => {
    expect(resolveSolanaWsUrl(NODE_URL, 'not a url')).toBe(
      'wss://mainnet.helius-rpc.com/?api-key=K'
    );
  });

  it('derives when no wsUrl is configured', () => {
    expect(resolveSolanaWsUrl('http://127.0.0.1:8899')).toBe('ws://127.0.0.1:8900/');
  });
});
