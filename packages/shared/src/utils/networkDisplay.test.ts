import { describe, expect, it } from 'vitest';
import { readNetworkId } from './networkDisplay';

describe('readNetworkId', () => {
  it('reads the chain and the environment', () => {
    expect(readNetworkId('solana-mainnet')).toEqual({
      chain: 'solana',
      env: 'mainnet',
      isNonMainnet: false,
    });
    expect(readNetworkId('Bitcoin-Testnet')).toEqual({
      chain: 'bitcoin',
      env: 'testnet',
      isNonMainnet: true,
    });
  });

  it('counts an id without an environment as mainnet', () => {
    expect(readNetworkId('ethereum')).toEqual({
      chain: 'ethereum',
      env: 'mainnet',
      isNonMainnet: false,
    });
  });
});
