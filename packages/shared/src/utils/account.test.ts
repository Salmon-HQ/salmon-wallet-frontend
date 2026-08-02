import { describe, expect, it } from 'vitest';
import {
  getAccountBlockchainType,
  isBitcoinAccount,
  isEthereumAccount,
  isSolanaAccount,
} from './account';
import { SolanaAccount } from '../blockchain/solana';
import type { BlockchainAccount } from '../types/blockchain';

/**
 * The duck-typing markers each account class actually carries: `getRpc` is
 * unique to SolanaAccount, `keyPair` to BitcoinAccount, `wallet` to
 * EthereumAccount. This is the route that decides which chain signs, so the
 * three classifications are pinned rather than assumed.
 */
const solanaLike = { getRpc: () => undefined } as unknown as BlockchainAccount;
const bitcoinLike = { keyPair: {} } as unknown as BlockchainAccount;
const ethereumLike = { wallet: {} } as unknown as BlockchainAccount;

describe('getAccountBlockchainType', () => {
  it('classifies each account shape by its distinguishing member', () => {
    expect(getAccountBlockchainType(solanaLike)).toBe('solana');
    expect(getAccountBlockchainType(bitcoinLike)).toBe('bitcoin');
    expect(getAccountBlockchainType(ethereumLike)).toBe('ethereum');
  });

  it('reads a marker SolanaAccount actually carries', () => {
    // The stubs above only prove the branching. This is what fails if the
    // accessor is ever renamed and every Solana account starts classifying as
    // something else.
    expect('getRpc' in SolanaAccount.prototype).toBe(true);
  });

  it('keeps the type guards mutually exclusive', () => {
    expect(isSolanaAccount(solanaLike)).toBe(true);
    expect(isBitcoinAccount(solanaLike)).toBe(false);
    expect(isEthereumAccount(solanaLike)).toBe(false);

    expect(isBitcoinAccount(bitcoinLike)).toBe(true);
    expect(isSolanaAccount(bitcoinLike)).toBe(false);

    expect(isEthereumAccount(ethereumLike)).toBe(true);
    expect(isSolanaAccount(ethereumLike)).toBe(false);
  });
});
