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

  it('falls back to the generic message for anything else', () => {
    expect(classifyTransactionError(new Error('something unexpected'))).toBe('transaction.errors.generic');
    expect(classifyTransactionError('raw string failure')).toBe('transaction.errors.generic');
    expect(classifyTransactionError(undefined)).toBe('transaction.errors.generic');
  });
});
