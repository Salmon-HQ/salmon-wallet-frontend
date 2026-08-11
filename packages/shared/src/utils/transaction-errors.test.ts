import { describe, expect, it } from 'vitest';
import { classifyTransactionError } from './transaction-errors';

describe('classifyTransactionError', () => {
  it('maps a broke fee payer to the SOL-fee message', () => {
    const err = new Error(
      'Transaction simulation failed: Attempt to debit an account but found no record of a prior credit.',
    );
    expect(classifyTransactionError(err)).toBe('transaction.errors.insufficientFeeSol');
  });

  it('maps a preflight failure with empty logs to the SOL-fee message', () => {
    const err = Object.assign(new Error('Solana error #-32002; Decode this error by running …'), {
      context: { __code: -32002, logs: [] },
    });
    expect(classifyTransactionError(err)).toBe('transaction.errors.insufficientFeeSol');
  });

  it('does not blame the fee when a preflight failure carries program logs', () => {
    const err = Object.assign(new Error('Solana error #-32002'), {
      context: { __code: -32002, logs: ['Program log: Error: custom program error'] },
    });
    expect(classifyTransactionError(err)).toBe('transaction.errors.generic');
  });

  it('maps insufficient lamports to the balance message', () => {
    expect(classifyTransactionError(new Error('Transfer: insufficient lamports 100, need 2039280'))).toBe(
      'transaction.errors.insufficientFunds',
    );
  });

  it('maps an expired blockhash to the retry message', () => {
    expect(classifyTransactionError(new Error('TransactionExpiredBlockheightExceededError: block height exceeded'))).toBe(
      'transaction.errors.expired',
    );
  });

  it('maps a Jupiter slippage failure to the slippage message', () => {
    expect(classifyTransactionError(new Error('Swap failed: Slippage tolerance exceeded'))).toBe(
      'transaction.errors.slippage',
    );
    expect(classifyTransactionError(new Error('{"InstructionError":[0,{"Custom":6001}]}'))).toBe(
      'transaction.errors.slippage',
    );
    expect(classifyTransactionError(new Error('custom program error: 0x1771'))).toBe(
      'transaction.errors.slippage',
    );
  });

  it('does not blame the fee for a preflight slippage failure', () => {
    const err = Object.assign(new Error('Solana error #-32002: SlippageToleranceExceeded'), {
      context: { __code: -32002, logs: [] },
    });
    expect(classifyTransactionError(err)).toBe('transaction.errors.slippage');
  });

  it('maps a missing route to the no-route message', () => {
    expect(classifyTransactionError(new Error('Failed to get swap quote: No route found'))).toBe(
      'transaction.errors.noRoute',
    );
    expect(classifyTransactionError(new Error('ROUTE_NOT_FOUND'))).toBe('transaction.errors.noRoute');
  });

  it('maps an expired quote to the re-review message', () => {
    expect(classifyTransactionError(new Error('Quote expired: the quote has changed'))).toBe(
      'transaction.errors.quoteExpired',
    );
  });

  it('falls back to the generic message for anything else', () => {
    expect(classifyTransactionError(new Error('something unexpected'))).toBe('transaction.errors.generic');
    expect(classifyTransactionError('raw string failure')).toBe('transaction.errors.generic');
    expect(classifyTransactionError(undefined)).toBe('transaction.errors.generic');
  });
});
