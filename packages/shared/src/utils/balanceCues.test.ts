import { describe, expect, it } from 'vitest';
import { balanceCues } from './balanceCues';

const chains = [
  { network: { id: 'solana-mainnet', blockchain: 'solana' } },
  { network: { id: 'bitcoin-mainnet', blockchain: 'bitcoin' } },
  { network: { id: 'solana-devnet', blockchain: 'solana' } },
] as any;

describe('balanceCues', () => {
  it('names only the pages a swipe reaches', () => {
    expect(balanceCues(chains, 0)).toEqual({
      next: { index: 1, symbol: 'BTC', blockchain: 'bitcoin' },
    });
    expect(balanceCues(chains, 1)).toEqual({
      previous: { index: 0, symbol: 'SOL', blockchain: 'solana' },
      next: { index: 2, symbol: 'SOL', blockchain: 'solana' },
    });
    expect(balanceCues(chains, 2)).toEqual({
      previous: { index: 1, symbol: 'BTC', blockchain: 'bitcoin' },
    });
  });

  it('has nothing to say on a single chain', () => {
    expect(balanceCues(chains.slice(0, 1), 0)).toEqual({});
  });
});
