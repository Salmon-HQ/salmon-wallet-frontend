/**
 * The network name a screen reader says is derived from the identifier, never
 * looked up: a per-network translation key would be a catalogue to maintain on
 * every new chain, and network names are proper nouns that read the same in
 * both languages anyway.
 */

import { describe, expect, it } from 'vitest';
import {
  getMainnetSibling,
  getNetworkName,
  isMainnetNetworkId,
  visibleNetworkIds,
} from './network';

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

describe('isMainnetNetworkId / getMainnetSibling', () => {
  it('knows which ids are mainnets', () => {
    expect(isMainnetNetworkId('solana-mainnet')).toBe(true);
    expect(isMainnetNetworkId('solana-devnet')).toBe(false);
    expect(isMainnetNetworkId('nothing-at-all')).toBe(false);
  });

  it('walks a mirror back to the mainnet it copies', () => {
    expect(getMainnetSibling('solana-devnet')).toBe('solana-mainnet');
    expect(getMainnetSibling('bitcoin-testnet')).toBe('bitcoin-mainnet');
    expect(getMainnetSibling('ethereum-sepolia')).toBe('ethereum-mainnet');
  });

  it('has nothing to walk back to from a mainnet', () => {
    expect(getMainnetSibling('solana-mainnet')).toBeUndefined();
  });
});

describe('visibleNetworkIds', () => {
  const enabled = ['solana-mainnet', 'solana-devnet', 'bitcoin-mainnet', 'bitcoin-testnet'];
  const held = enabled;

  it('offers mainnets only when the developer flag is off', () => {
    expect(visibleNetworkIds({ enabled, held, developerNetworks: false })).toEqual([
      'solana-mainnet',
      'bitcoin-mainnet',
    ]);
  });

  it('keeps offering the non-mainnet the session is standing on with the flag off', () => {
    expect(
      visibleNetworkIds({
        enabled,
        held,
        developerNetworks: false,
        activeNetworkId: 'solana-devnet',
      })
    ).toEqual(['solana-mainnet', 'solana-devnet', 'bitcoin-mainnet']);
  });

  it('offers every held network with the flag on', () => {
    expect(visibleNetworkIds({ enabled, held, developerNetworks: true })).toEqual(enabled);
  });

  it('never offers a network the wallet does not hold', () => {
    expect(
      visibleNetworkIds({
        enabled,
        held: ['solana-mainnet'],
        developerNetworks: true,
        activeNetworkId: 'solana-devnet',
      })
    ).toEqual(['solana-mainnet']);
  });

  it('filters nothing on holdings when the caller cannot say what is held', () => {
    expect(visibleNetworkIds({ enabled, developerNetworks: true })).toEqual(enabled);
  });
});
