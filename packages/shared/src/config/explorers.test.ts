/**
 * Tests for Explorers Configuration module
 */

import { describe, it, expect } from 'vitest';
import { EXPLORERS, DEFAULT_EXPLORERS, getTransactionUrl } from './explorers';

// ============================================================================
// Explorer Configuration Structure Tests
// ============================================================================

describe('EXPLORERS structure', () => {
  it('every configured explorer has a name and an https URL with a {txId} placeholder', () => {
    const explorers = Object.values(EXPLORERS).flatMap((networks) =>
      Object.values(networks).flatMap((networkExplorers) => Object.values(networkExplorers))
    );

    expect(explorers.length).toBeGreaterThan(0);

    for (const explorer of explorers) {
      expect(explorer.name).toBeTruthy();
      expect(explorer.url).toMatch(/^https:\/\/\S+\{txId\}\S*$/);
    }
  });

  it('every default explorer key exists in each network of its blockchain', () => {
    for (const [blockchain, defaultKey] of Object.entries(DEFAULT_EXPLORERS)) {
      const networks = EXPLORERS[blockchain as keyof typeof EXPLORERS];

      expect(Object.keys(networks).length).toBeGreaterThan(0);

      for (const networkExplorers of Object.values(networks)) {
        expect(networkExplorers[defaultKey]).toBeDefined();
      }
    }
  });
});

// ============================================================================
// getTransactionUrl for Ethereum Tests
// ============================================================================

describe('getTransactionUrl for Ethereum', () => {
  const testTxId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  it('should return correct URL for mainnet transaction', () => {
    const url = getTransactionUrl('ETHEREUM', 'mainnet', 'ETHERSCAN', testTxId);

    expect(url).toBe(`https://etherscan.io/tx/${testTxId}`);
  });

  it('should return correct URL for sepolia transaction', () => {
    const url = getTransactionUrl('ETHEREUM', 'sepolia', 'ETHERSCAN', testTxId);

    expect(url).toBe(`https://sepolia.etherscan.io/tx/${testTxId}`);
  });

  it('should return null for invalid explorer key', () => {
    const url = getTransactionUrl('ETHEREUM', 'mainnet', 'INVALID_EXPLORER', testTxId);

    expect(url).toBeNull();
  });

  it('should return null for invalid network environment', () => {
    // @ts-expect-error - Testing invalid input
    const url = getTransactionUrl('ETHEREUM', 'invalid-network', 'ETHERSCAN', testTxId);

    expect(url).toBeNull();
  });
});

// ============================================================================
// getTransactionUrl keyed by full networkId
// ============================================================================

describe('getTransactionUrl keyed by full networkId', () => {
  const btcTxId = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  it('resolves a bitcoin-mainnet transaction to a valid explorer URL', () => {
    const url = getTransactionUrl('BITCOIN', 'bitcoin-mainnet', 'BLOCKCYPHER', btcTxId);

    expect(url).toBe(`https://live.blockcypher.com/btc/tx/${btcTxId}`);
  });

  it('resolves a bitcoin-testnet transaction to a valid explorer URL', () => {
    const url = getTransactionUrl('BITCOIN', 'bitcoin-testnet', 'BLOCKCYPHER', btcTxId);

    expect(url).toBe(`https://live.blockcypher.com/btc-testnet/tx/${btcTxId}`);
  });

  it('resolves ethereum full networkIds to the same explorers as the short keys', () => {
    const txId = '0xabc';

    expect(getTransactionUrl('ETHEREUM', 'ethereum-mainnet', 'ETHERSCAN', txId)).toBe(
      getTransactionUrl('ETHEREUM', 'mainnet', 'ETHERSCAN', txId)
    );
    expect(getTransactionUrl('ETHEREUM', 'ethereum-sepolia', 'ETHERSCAN', txId)).toBe(
      getTransactionUrl('ETHEREUM', 'sepolia', 'ETHERSCAN', txId)
    );
  });
});

// ============================================================================
// DEFAULT_EXPLORERS Tests
// ============================================================================

describe('DEFAULT_EXPLORERS', () => {
  it('should have ETHEREUM set to ETHERSCAN', () => {
    expect(DEFAULT_EXPLORERS.ETHEREUM).toBe('ETHERSCAN');
  });
});

// ============================================================================
// Solana devnet
// ============================================================================

describe('Solana devnet explorers', () => {
  it('never hands back a mainnet URL for a devnet transaction', () => {
    const txId = '5abc';

    for (const key of Object.keys(EXPLORERS.SOLANA['solana-devnet'] ?? {})) {
      const devnetUrl = getTransactionUrl('SOLANA', 'solana-devnet', key, txId);
      const mainnetUrl = getTransactionUrl('SOLANA', 'solana-mainnet', key, txId);
      expect(devnetUrl).not.toBe(mainnetUrl);
      expect(devnetUrl).toContain('cluster=devnet');
    }
  });

  it('carries each explorer its own cluster query', () => {
    expect(getTransactionUrl('SOLANA', 'solana-devnet', 'SOLSCAN', '5abc')).toBe(
      'https://solscan.io/tx/5abc?cluster=devnet'
    );
    expect(getTransactionUrl('SOLANA', 'solana-devnet', 'SOLANA_EXPLORER', '5abc')).toBe(
      'https://explorer.solana.com/tx/5abc?cluster=devnet'
    );
    expect(getTransactionUrl('SOLANA', 'solana-devnet', 'SOLANA_FM', '5abc')).toBe(
      'https://solana.fm/tx/5abc?cluster=devnet-solana'
    );
  });

  it('drops the explorers that have no devnet view rather than pointing them at mainnet', () => {
    expect(getTransactionUrl('SOLANA', 'solana-devnet', 'SOLANA_BEACH', '5abc')).toBeNull();
  });

  it('keeps the default explorer reachable on devnet', () => {
    expect(EXPLORERS.SOLANA['solana-devnet']?.[DEFAULT_EXPLORERS.SOLANA]).toBeDefined();
  });
});
