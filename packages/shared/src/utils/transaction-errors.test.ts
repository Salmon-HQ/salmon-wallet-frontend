import { describe, expect, it } from 'vitest';
import {
  SolanaError,
  SOLANA_ERROR__INSTRUCTION_ERROR__COMPUTATIONAL_BUDGET_EXCEEDED,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
  SOLANA_ERROR__INSTRUCTION_ERROR__INVALID_ACCOUNT_DATA,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_NODE_UNHEALTHY,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  SOLANA_ERROR__TRANSACTION_ERROR__ALREADY_PROCESSED,
  SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT,
  SOLANA_ERROR__TRANSACTION_ERROR__SANITIZE_FAILURE,
  SOLANA_ERROR__TRANSACTION_ERROR__UNSUPPORTED_VERSION,
} from '@solana/kit';

import { classifyTransactionError, describeTransactionError } from './transaction-errors';

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const SYSTEM_PROGRAM = '11111111111111111111111111111111';

/** A send rejected at preflight, the way kit hands it back: the cause is the transaction error. */
function preflight(cause: SolanaError, logs: string[] = []) {
  return new SolanaError(SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE, {
    accounts: null,
    logs,
    returnData: null,
    unitsConsumed: 0n,
    cause,
  } as never);
}

const custom = (code: number, index = 0) =>
  new SolanaError(SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM, { code, index });

describe('describeTransactionError — decoded Solana errors', () => {
  it('reads the fee payer out of a preflight failure', () => {
    const err = preflight(
      new SolanaError(SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE)
    );
    expect(describeTransactionError(err)).toEqual({
      key: 'transaction.errors.insufficientFeeSol',
      detail: null,
    });
  });

  it('tells rent apart from balance', () => {
    const err = preflight(
      new SolanaError(SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT, {
        accountIndex: 1,
      })
    );
    expect(classifyTransactionError(err)).toBe('transaction.errors.insufficientRent');
  });

  it('maps an expired blockhash, a duplicate, an unhealthy node and a bad version', () => {
    expect(
      classifyTransactionError(
        new SolanaError(SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND)
      )
    ).toBe('transaction.errors.expired');
    expect(
      classifyTransactionError(new SolanaError(SOLANA_ERROR__TRANSACTION_ERROR__ALREADY_PROCESSED))
    ).toBe('transaction.errors.alreadyProcessed');
    expect(
      classifyTransactionError(
        new SolanaError(SOLANA_ERROR__JSON_RPC__SERVER_ERROR_NODE_UNHEALTHY, { numSlotsBehind: 5 })
      )
    ).toBe('transaction.errors.networkBusy');
    expect(
      classifyTransactionError(
        new SolanaError(SOLANA_ERROR__TRANSACTION_ERROR__UNSUPPORTED_VERSION)
      )
    ).toBe('transaction.errors.unsupportedVersion');
  });

  it('names the token program error behind a custom code, from the logs', () => {
    const logs = [
      `Program ${TOKEN_PROGRAM} invoke [1]`,
      'Program log: Instruction: Transfer',
      'Program log: Error: Account is frozen',
      `Program ${TOKEN_PROGRAM} failed: custom program error: 0x11`,
    ];
    expect(describeTransactionError(preflight(custom(17), logs))).toEqual({
      key: 'transaction.errors.accountFrozen',
      detail: 'Program Toke…Q5DA: AccountFrozen (#17) — Error: Account is frozen',
    });
    expect(classifyTransactionError(preflight(custom(1), logs.slice(0, 2)))).toBe(
      'transaction.errors.programRejected'
    );
  });

  it('reads insufficient funds off the token and system programs', () => {
    const tokenLogs = [`Program ${TOKEN_PROGRAM} failed: custom program error: 0x1`];
    expect(classifyTransactionError(preflight(custom(1), tokenLogs))).toBe(
      'transaction.errors.insufficientFunds'
    );
    const systemLogs = [`Program ${SYSTEM_PROGRAM} failed: custom program error: 0x1`];
    expect(classifyTransactionError(preflight(custom(1), systemLogs))).toBe(
      'transaction.errors.insufficientFunds'
    );
  });

  it('keeps Jupiter slippage as slippage', () => {
    expect(classifyTransactionError(preflight(custom(6001)))).toBe('transaction.errors.slippage');
  });

  it('surfaces an Anchor error message as the detail', () => {
    const logs = [
      'Program log: AnchorError occurred. Error Code: InvalidAmount. Error Number: 6003. Error Message: Amount must be greater than zero.',
      'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 failed: custom program error: 0x1773',
    ];
    const failure = describeTransactionError(preflight(custom(6003), logs));
    expect(failure.key).toBe('transaction.errors.programRejected');
    expect(failure.detail).toContain('Amount must be greater than zero');
  });

  it('calls other instruction errors a refusal and other transaction errors malformed', () => {
    const refused = describeTransactionError(
      preflight(
        new SolanaError(SOLANA_ERROR__INSTRUCTION_ERROR__INVALID_ACCOUNT_DATA, { index: 0 })
      )
    );
    expect(refused.key).toBe('transaction.errors.programRejected');
    expect(refused.detail).toBeTruthy();

    expect(
      classifyTransactionError(new SolanaError(SOLANA_ERROR__TRANSACTION_ERROR__SANITIZE_FAILURE))
    ).toBe('transaction.errors.malformed');
    expect(
      classifyTransactionError(
        new SolanaError(SOLANA_ERROR__INSTRUCTION_ERROR__COMPUTATIONAL_BUDGET_EXCEEDED, {
          index: 0,
        })
      )
    ).toBe('transaction.errors.computeExceeded');
  });
});

describe('describeTransactionError — plain messages', () => {
  it('maps a broke fee payer to the SOL-fee message', () => {
    const err = new Error(
      'Transaction simulation failed: Attempt to debit an account but found no record of a prior credit.'
    );
    expect(classifyTransactionError(err)).toBe('transaction.errors.insufficientFeeSol');
  });

  it('maps a preflight failure with empty logs and no cause to the SOL-fee message', () => {
    const err = Object.assign(new Error('Solana error #-32002; Decode this error by running …'), {
      context: { __code: -32002, logs: [] },
    });
    expect(classifyTransactionError(err)).toBe('transaction.errors.insufficientFeeSol');
  });

  it('blames the program, with its log, when a preflight failure carries logs and no cause', () => {
    const err = Object.assign(new Error('Solana error #-32002'), {
      context: { __code: -32002, logs: ['Program log: Error: custom program error'] },
    });
    expect(describeTransactionError(err)).toEqual({
      key: 'transaction.errors.programRejected',
      detail: 'Error: custom program error',
    });
  });

  it('maps insufficient lamports to the balance message', () => {
    expect(
      classifyTransactionError(new Error('Transfer: insufficient lamports 100, need 2039280'))
    ).toBe('transaction.errors.insufficientFunds');
  });

  it('maps an expired blockhash to the retry message', () => {
    expect(classifyTransactionError(new Error('Blockhash not found'))).toBe(
      'transaction.errors.expired'
    );
  });

  it('maps a Jupiter slippage failure to the slippage message', () => {
    expect(classifyTransactionError(new Error('{"InstructionError":[3,{"Custom":6001}]}'))).toBe(
      'transaction.errors.slippage'
    );
  });

  it('maps a missing route to the no-route message', () => {
    expect(classifyTransactionError(new Error('No routes found for this swap'))).toBe(
      'transaction.errors.noRoute'
    );
  });

  it('maps an expired quote to the re-review message', () => {
    expect(classifyTransactionError(new Error('Quote expired'))).toBe(
      'transaction.errors.quoteExpired'
    );
  });

  it('reads a rate limit or a dead connection as the network being busy', () => {
    expect(classifyTransactionError(new Error('Request failed with status code 429'))).toBe(
      'transaction.errors.networkBusy'
    );
    expect(classifyTransactionError(new Error('Network request failed'))).toBe(
      'transaction.errors.networkBusy'
    );
  });

  it('passes a translation key through untouched', () => {
    expect(describeTransactionError(new Error('transaction.errors.broadcastUnknown'))).toEqual({
      key: 'transaction.errors.broadcastUnknown',
      detail: null,
    });
  });

  it('falls back to the generic message, keeping the raw words as the detail', () => {
    expect(describeTransactionError(new Error('something odd happened'))).toEqual({
      key: 'transaction.errors.generic',
      detail: 'something odd happened',
    });
    expect(describeTransactionError(undefined)).toEqual({
      key: 'transaction.errors.generic',
      detail: null,
    });
  });
});
