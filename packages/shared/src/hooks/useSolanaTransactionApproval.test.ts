import { describe, expect, it } from 'vitest';
import { applySymbols } from './useSolanaTransactionApproval';
import type { Address } from '@solana/kit';
import type { TransactionEffects } from '../blockchain/solana';

const ACCOUNT = 'Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf' as Address;
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address;
const TOKEN_ACCOUNT = '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi' as Address;
const SPENDER = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' as Address;

const effects = (overrides: Partial<Extract<TransactionEffects, { kind: 'effects' }>> = {}) =>
  ({
    kind: 'effects',
    account: ACCOUNT,
    sol: { lamports: -5_000n, feeLamports: 5_000n },
    tokens: [{ tokenAccount: TOKEN_ACCOUNT, mint: MINT, amount: -1n, decimals: 6, symbol: null }],
    approvals: [],
    ...overrides,
  }) as TransactionEffects;

describe('applySymbols', () => {
  it('names the tokens a preview could not resolve on its own', () => {
    const named = applySymbols(effects(), (mint) => (mint === MINT ? 'USDC' : undefined));

    expect(named?.kind === 'effects' && named.tokens[0].symbol).toBe('USDC');
  });

  it('names the mint in an approval, where the token is the whole warning', () => {
    const named = applySymbols(
      effects({
        approvals: [
          {
            tokenAccount: TOKEN_ACCOUNT,
            mint: MINT,
            spender: SPENDER,
            amount: 1n,
            decimals: 6,
            symbol: null,
            scope: 'bounded',
          },
        ],
      }),
      () => 'USDC'
    );

    expect(named?.kind === 'effects' && named.approvals[0].symbol).toBe('USDC');
  });

  it('leaves an unknown mint unnamed rather than inventing a ticker', () => {
    const named = applySymbols(effects(), () => undefined);

    expect(named?.kind === 'effects' && named.tokens[0].symbol).toBeNull();
  });

  it('passes the non-effect outcomes through untouched', () => {
    const undetermined: TransactionEffects = {
      kind: 'undetermined',
      account: ACCOUNT,
      reason: 'simulation-unavailable',
      detail: 'offline',
    };

    expect(applySymbols(undetermined, () => 'USDC')).toBe(undetermined);
    expect(applySymbols(null, () => 'USDC')).toBeNull();
  });
});
