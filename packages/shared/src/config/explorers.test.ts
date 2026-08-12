/**
 * Tests for Explorers Configuration module
 */

import { describe, it, expect } from 'vitest';
import {
  EXPLORERS,
  DEFAULT_EXPLORERS,
  getTransactionUrl,
} from './explorers';

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
// DEFAULT_EXPLORERS Tests
// ============================================================================

describe('DEFAULT_EXPLORERS', () => {
  it('should have ETHEREUM set to ETHERSCAN', () => {
    expect(DEFAULT_EXPLORERS.ETHEREUM).toBe('ETHERSCAN');
  });
});
