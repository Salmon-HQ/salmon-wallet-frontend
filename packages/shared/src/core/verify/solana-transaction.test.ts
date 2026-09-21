import { describe, expect, it } from 'vitest';
import {
  assertSolanaTransactionMatches,
  SolanaTransactionMismatchError,
} from './solana-transaction';
import {
  NFT_TRANSACTION_INSTRUCTIONS,
  NFT_TRANSACTION_PROGRAMS,
  SYSTEM_PROGRAM,
  TOKEN_METADATA_PROGRAM,
} from './solana-programs';

/** The owner that pays and signs in both fixtures. */
const OWNER = 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';
/** A second account the no-lookup fixture names. */
const NAMED = 'So11111111111111111111111111111111111111112';

/**
 * A v0 transaction with one System-program instruction and no table lookups,
 * so its static list is the whole account set and absence proves something.
 */
const NO_LOOKUPS =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQACA4qI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cBpuIV/6rgYT7aH9jRhjANdrEOdwa6ztVmKDwAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOMy2vkvq+zotj/3pEAF5f39mvoVh1a2HFqV+QSzuNCBAQICAAEEAgAAAAA=';

/** The same shape with one address-table lookup (shared with core/broadcast). */
const WITH_LOOKUPS =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQABAoqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAgACDAIAAAABAAAAAAAAAAHtSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QEAAA==';

describe('assertSolanaTransactionMatches', () => {
  it('accepts a transaction whose payer and programs are the declared ones', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
      })
    ).not.toThrow();
  });

  it('refuses a transaction that pays from another account', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: NAMED,
        allowedPrograms: [SYSTEM_PROGRAM],
      })
    ).toThrow(SolanaTransactionMismatchError);
  });

  // The program list is a vocabulary: System is on the NFT list so a builder
  // can create an account, and that same entry would let a compromised backend
  // append a transfer that empties the wallet's SOL. Nothing on the
  // confirmation screen would show it — the screen is drawn from the
  // response's own fields.
  it('refuses a System transfer appended to an NFT transaction', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: NFT_TRANSACTION_PROGRAMS,
        allowedInstructions: NFT_TRANSACTION_INSTRUCTIONS,
      })
    ).toThrow(/instruction 2 on 11111111111111111111111111111111/);
  });

  it('leaves a program the flow did not bind to the program list alone', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
        allowedInstructions: { [TOKEN_METADATA_PROGRAM]: { width: 1, codes: [] } },
      })
    ).not.toThrow();
  });

  it('accepts an instruction the flow does use', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
        allowedInstructions: { [SYSTEM_PROGRAM]: { width: 4, codes: [2] } },
      })
    ).not.toThrow();
  });

  it('refuses a program the flow did not declare', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [TOKEN_METADATA_PROGRAM],
      })
    ).toThrow(/invokes 11111111111111111111111111111111/);
  });

  it('requires the accounts the flow named', () => {
    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
        requiredAccounts: [NAMED],
      })
    ).not.toThrow();

    expect(() =>
      assertSolanaTransactionMatches(NO_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
        requiredAccounts: [TOKEN_METADATA_PROGRAM],
      })
    ).toThrow(/does not name/);
  });

  // The static list is partial here, so a missing account proves nothing —
  // which makes the requirement undecidable, not satisfied. Returning as if it
  // held let the message's own author decide whether the check ran: including
  // any lookup entry switched it off, silently.
  it('refuses rather than skips when a table hides a required account', () => {
    expect(() =>
      assertSolanaTransactionMatches(WITH_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
        requiredAccounts: [NAMED],
      })
    ).toThrow(SolanaTransactionMismatchError);
  });

  it('still passes when the table is present but the required account is named anyway', () => {
    expect(() =>
      assertSolanaTransactionMatches(WITH_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [SYSTEM_PROGRAM],
        requiredAccounts: [OWNER],
      })
    ).not.toThrow();
  });

  it('still refuses an undeclared program when a table is in play', () => {
    expect(() =>
      assertSolanaTransactionMatches(WITH_LOOKUPS, {
        feePayer: OWNER,
        allowedPrograms: [TOKEN_METADATA_PROGRAM],
      })
    ).toThrow(SolanaTransactionMismatchError);
  });
});
