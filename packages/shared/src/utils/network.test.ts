/**
 * The network name a screen reader says is derived from the identifier, never
 * looked up: a per-network translation key would be a catalogue to maintain on
 * every new chain, and network names are proper nouns that read the same in
 * both languages anyway.
 */

import { describe, expect, it } from 'vitest';
import { getNetworkName } from './network';

describe('getNetworkName', () => {
  it('speaks a canonical identifier as its human name', () => {
    expect(getNetworkName('solana-mainnet')).toBe('Solana Mainnet');
    expect(getNetworkName('bitcoin-mainnet')).toBe('Bitcoin Mainnet');
    expect(getNetworkName('solana-devnet')).toBe('Solana Devnet');
  });

  it('covers a chain nobody added a key for', () => {
    expect(getNetworkName('ethereum-sepolia')).toBe('Ethereum Sepolia');
  });

  it('passes an already well-formed chain name through', () => {
    expect(getNetworkName('Bitcoin')).toBe('Bitcoin');
    expect(getNetworkName('Solana Mainnet')).toBe('Solana Mainnet');
  });

  it('returns the raw identifier rather than nothing when it cannot be formatted', () => {
    expect(getNetworkName('---')).toBe('---');
  });
});
