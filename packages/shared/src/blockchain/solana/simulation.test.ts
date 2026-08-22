/**
 * Tests for the pre-signature transaction effect preview.
 *
 * Split in two halves:
 * - `deriveEffects` / `classifyApprovalScope` are pure, so they are driven
 *   entirely by fixtures — no RPC, fully deterministic.
 * - `previewTransactionEffects` is exercised against a mock RPC, with the
 *   emphasis on the failure modes: a wallet that renders "no change" after a
 *   failed simulation is more dangerous than one without the feature at all.
 *
 * A live-RPC counterpart lives in `simulation.live.test.ts`.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase64Decoder,
  getBase64EncodedWireTransaction,
  none,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  createNoopSigner,
  some,
} from '@solana/kit';
import type { Address, Base64EncodedWireTransaction, Blockhash } from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  getMintEncoder,
  getTokenEncoder,
} from '@solana-program/token-2022';

import {
  U64_MAX,
  classifyApprovalScope,
  decodeAccountState,
  deriveEffects,
  previewTransactionEffects,
} from './simulation';
import type { AccountState, DerivationInput, MintState, TransactionEffects } from './simulation';
import type { SolanaRpc } from './networks';

// ============================================================================
// Fixtures
// ============================================================================

const WALLET: Address = address('4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T');
const OTHER: Address = address('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
const SPENDER: Address = address('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
const USDC: Address = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const WSOL: Address = address('So11111111111111111111111111111111111111112');
const USDC_ATA: Address = address('2y8ryG1ULFrfrJhg6iEuNbmvbLnKrCbxjfJvpG4PSvHb');
const WSOL_ATA: Address = address('AeMuAqDcw2nWnCUnkqNXTVfWjRqPZ4uHzHUgBvBmnGXK');
const POOL_ATA: Address = address('7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj');
const BLOCKHASH = '11111111111111111111111111111111' as Blockhash;

/** Builds a decoded token-account snapshot. */
function tokenAccount(
  overrides: Partial<AccountState['token'] & object> & { mint: Address; owner: Address },
  lamports = 2_039_280n
): AccountState {
  return {
    lamports,
    token: {
      amount: 0n,
      delegate: null,
      delegatedAmount: 0n,
      ...overrides,
    },
  };
}

/** Builds a plain (non-token) account snapshot. */
function solAccount(lamports: bigint): AccountState {
  return { lamports, token: null };
}

const MINTS: ReadonlyMap<Address, MintState> = new Map([
  [USDC, { decimals: 6, supply: 5_000_000_000_000_000n }],
  [WSOL, { decimals: 9, supply: 1_000_000_000_000_000_000n }],
]);

/** Assembles a `deriveEffects` input with sane defaults. */
function derivationInput(overrides: Partial<DerivationInput> = {}): DerivationInput {
  return {
    account: WALLET,
    before: new Map(),
    after: new Map(),
    mints: MINTS,
    feeLamports: 5_000n,
    ...overrides,
  };
}

// ============================================================================
// classifyApprovalScope
// ============================================================================

describe('classifyApprovalScope', () => {
  it('treats u64::MAX as unlimited', () => {
    expect(classifyApprovalScope(U64_MAX, 100n, 1_000n)).toBe('unlimited');
  });

  it('treats an amount at or above total supply as unlimited', () => {
    // u64::MAX - 1 is not the sentinel, but no holder can ever exceed supply,
    // so the delegation can never be exhausted either.
    expect(classifyApprovalScope(U64_MAX - 1n, 100n, 1_000n)).toBe('unlimited');
    expect(classifyApprovalScope(1_000n, 100n, 1_000n)).toBe('unlimited');
  });

  it('treats an amount above the current balance as exceeds-balance', () => {
    expect(classifyApprovalScope(500n, 100n, 1_000n)).toBe('exceeds-balance');
  });

  it('treats a delegation on an empty account as exceeds-balance', () => {
    // Dangerous precisely because it is invisible: nothing to take today,
    // everything received later is drainable.
    expect(classifyApprovalScope(500n, 0n, 1_000n)).toBe('exceeds-balance');
  });

  it('treats an amount at or below the balance as bounded', () => {
    expect(classifyApprovalScope(100n, 100n, 1_000n)).toBe('bounded');
    expect(classifyApprovalScope(50n, 100n, 1_000n)).toBe('bounded');
  });

  it('does not use the supply rule when supply is unknown', () => {
    expect(classifyApprovalScope(500n, 100n, 0n)).toBe('exceeds-balance');
  });
});

// ============================================================================
// deriveEffects — balances
// ============================================================================

describe('deriveEffects', () => {
  it('reports no-effect when nothing moved', () => {
    const result = deriveEffects(
      derivationInput({
        before: new Map([[WALLET, solAccount(1_000_000n)]]),
        after: new Map([[WALLET, solAccount(1_000_000n)]]),
      })
    );

    expect(result.kind).toBe('no-effect');
  });

  it('derives a plain SOL transfer as a negative lamport change including the fee', () => {
    // 1 SOL out plus a 5000 lamport fee, as observed on the account itself.
    const result = deriveEffects(
      derivationInput({
        before: new Map([[WALLET, solAccount(2_000_000_000n)]]),
        after: new Map([[WALLET, solAccount(999_995_000n)]]),
      })
    );

    expect(result.kind).toBe('effects');
    if (result.kind !== 'effects') throw new Error('expected effects');
    expect(result.sol.lamports).toBe(-1_000_005_000n);
    expect(result.sol.feeLamports).toBe(5_000n);
    expect(result.tokens).toEqual([]);
    expect(result.approvals).toEqual([]);
    expect(result.account).toBe(WALLET);
  });

  it('derives an SPL transfer with mint, decimals and resolved symbol', () => {
    const result = deriveEffects(
      derivationInput({
        before: new Map([
          [WALLET, solAccount(1_000_000n)],
          [USDC_ATA, tokenAccount({ mint: USDC, owner: WALLET, amount: 100_000_000n })],
        ]),
        after: new Map([
          [WALLET, solAccount(995_000n)],
          [USDC_ATA, tokenAccount({ mint: USDC, owner: WALLET, amount: 75_000_000n })],
        ]),
        resolveSymbol: (mint) => (mint === USDC ? 'USDC' : undefined),
      })
    );

    if (result.kind !== 'effects') throw new Error('expected effects');
    expect(result.tokens).toEqual([
      {
        tokenAccount: USDC_ATA,
        mint: USDC,
        amount: -25_000_000n,
        decimals: 6,
        symbol: 'USDC',
      },
    ]);
  });

  it('reports a null symbol rather than omitting an unresolvable token', () => {
    const result = deriveEffects(
      derivationInput({
        before: new Map([[USDC_ATA, tokenAccount({ mint: USDC, owner: WALLET, amount: 10n })]]),
        after: new Map([[USDC_ATA, tokenAccount({ mint: USDC, owner: WALLET, amount: 4n })]]),
      })
    );

    if (result.kind !== 'effects') throw new Error('expected effects');
    expect(result.tokens[0]?.symbol).toBeNull();
    expect(result.tokens[0]?.amount).toBe(-6n);
  });

  it('derives a swap touching several token accounts and ignores accounts it does not own', () => {
    const result = deriveEffects(
      derivationInput({
        before: new Map([
          [WALLET, solAccount(1_000_000_000n)],
          [USDC_ATA, tokenAccount({ mint: USDC, owner: WALLET, amount: 100_000_000n })],
          [WSOL_ATA, tokenAccount({ mint: WSOL, owner: WALLET, amount: 0n })],
          [POOL_ATA, tokenAccount({ mint: USDC, owner: OTHER, amount: 900_000_000n })],
        ]),
        after: new Map([
          [WALLET, solAccount(999_995_000n)],
          [USDC_ATA, tokenAccount({ mint: USDC, owner: WALLET, amount: 0n })],
          [WSOL_ATA, tokenAccount({ mint: WSOL, owner: WALLET, amount: 500_000_000n })],
          [POOL_ATA, tokenAccount({ mint: USDC, owner: OTHER, amount: 1_000_000_000n })],
        ]),
      })
    );

    if (result.kind !== 'effects') throw new Error('expected effects');
    // The pool's own token account moved, but it is not the previewed account's.
    expect(result.tokens).toHaveLength(2);
    expect(result.tokens.map((t) => t.tokenAccount)).toEqual(
      expect.arrayContaining([USDC_ATA, WSOL_ATA])
    );
    expect(result.tokens.find((t) => t.mint === USDC)?.amount).toBe(-100_000_000n);
    expect(result.tokens.find((t) => t.mint === WSOL)?.amount).toBe(500_000_000n);
  });

  it('treats a token account created by the transaction as a gain from zero', () => {
    const result = deriveEffects(
      derivationInput({
        after: new Map([
          [USDC_ATA, tokenAccount({ mint: USDC, owner: WALLET, amount: 42_000_000n })],
        ]),
        feeLamports: null,
      })
    );

    if (result.kind !== 'effects') throw new Error('expected effects');
    expect(result.tokens[0]?.amount).toBe(42_000_000n);
    expect(result.sol.feeLamports).toBeNull();
  });

  it('treats a token account closed by the transaction as a loss to zero', () => {
    const result = deriveEffects(
      derivationInput({
        before: new Map([
          [USDC_ATA, tokenAccount({ mint: USDC, owner: WALLET, amount: 42_000_000n })],
        ]),
        after: new Map([[USDC_ATA, null]]),
      })
    );

    if (result.kind !== 'effects') throw new Error('expected effects');
    expect(result.tokens[0]?.amount).toBe(-42_000_000n);
  });
});

// ============================================================================
// deriveEffects — approvals
// ============================================================================

describe('deriveEffects approvals', () => {
  it('flags an unlimited approval as a first-class result, not a footnote', () => {
    const result = deriveEffects(
      derivationInput({
        before: new Map([[USDC_ATA, tokenAccount({ mint: USDC, owner: WALLET, amount: 5n })]]),
        after: new Map([
          [
            USDC_ATA,
            tokenAccount({
              mint: USDC,
              owner: WALLET,
              amount: 5n,
              delegate: SPENDER,
              delegatedAmount: U64_MAX,
            }),
          ],
        ]),
        resolveSymbol: () => 'USDC',
      })
    );

    if (result.kind !== 'effects') throw new Error('expected effects');
    expect(result.approvals).toEqual([
      {
        tokenAccount: USDC_ATA,
        mint: USDC,
        spender: SPENDER,
        amount: U64_MAX,
        decimals: 6,
        symbol: 'USDC',
        scope: 'unlimited',
      },
    ]);
    // The balance itself does not move, so an approval-only transaction must
    // never collapse into `no-effect`.
    expect(result.tokens).toEqual([]);
    expect(result.kind).toBe('effects');
  });

  it('flags a bounded approval as bounded', () => {
    const result = deriveEffects(
      derivationInput({
        before: new Map([
          [USDC_ATA, tokenAccount({ mint: USDC, owner: WALLET, amount: 100_000_000n })],
        ]),
        after: new Map([
          [
            USDC_ATA,
            tokenAccount({
              mint: USDC,
              owner: WALLET,
              amount: 100_000_000n,
              delegate: SPENDER,
              delegatedAmount: 25_000_000n,
            }),
          ],
        ]),
      })
    );

    if (result.kind !== 'effects') throw new Error('expected effects');
    expect(result.approvals[0]?.scope).toBe('bounded');
    expect(result.approvals[0]?.amount).toBe(25_000_000n);
  });

  it('does not re-report a pre-existing delegation the transaction leaves alone', () => {
    const delegated = {
      mint: USDC,
      owner: WALLET,
      delegate: SPENDER,
      delegatedAmount: 25_000_000n,
    };
    const result = deriveEffects(
      derivationInput({
        before: new Map([[USDC_ATA, tokenAccount({ ...delegated, amount: 100_000_000n })]]),
        after: new Map([[USDC_ATA, tokenAccount({ ...delegated, amount: 90_000_000n })]]),
      })
    );

    if (result.kind !== 'effects') throw new Error('expected effects');
    expect(result.approvals).toEqual([]);
    expect(result.tokens[0]?.amount).toBe(-10_000_000n);
  });

  it('reports an enlarged delegation to the same spender', () => {
    const result = deriveEffects(
      derivationInput({
        before: new Map([
          [
            USDC_ATA,
            tokenAccount({
              mint: USDC,
              owner: WALLET,
              amount: 100n,
              delegate: SPENDER,
              delegatedAmount: 10n,
            }),
          ],
        ]),
        after: new Map([
          [
            USDC_ATA,
            tokenAccount({
              mint: USDC,
              owner: WALLET,
              amount: 100n,
              delegate: SPENDER,
              delegatedAmount: U64_MAX,
            }),
          ],
        ]),
      })
    );

    if (result.kind !== 'effects') throw new Error('expected effects');
    expect(result.approvals[0]?.scope).toBe('unlimited');
  });

  it('reports a delegation swapped to a different spender for the same amount', () => {
    const result = deriveEffects(
      derivationInput({
        before: new Map([
          [
            USDC_ATA,
            tokenAccount({
              mint: USDC,
              owner: WALLET,
              amount: 100n,
              delegate: OTHER,
              delegatedAmount: 10n,
            }),
          ],
        ]),
        after: new Map([
          [
            USDC_ATA,
            tokenAccount({
              mint: USDC,
              owner: WALLET,
              amount: 100n,
              delegate: SPENDER,
              delegatedAmount: 10n,
            }),
          ],
        ]),
      })
    );

    if (result.kind !== 'effects') throw new Error('expected effects');
    expect(result.approvals[0]?.spender).toBe(SPENDER);
  });

  it('ignores an approval granted on someone else’s token account', () => {
    const result = deriveEffects(
      derivationInput({
        before: new Map([[POOL_ATA, tokenAccount({ mint: USDC, owner: OTHER, amount: 100n })]]),
        after: new Map([
          [
            POOL_ATA,
            tokenAccount({
              mint: USDC,
              owner: OTHER,
              amount: 100n,
              delegate: SPENDER,
              delegatedAmount: U64_MAX,
            }),
          ],
        ]),
      })
    );

    expect(result.kind).toBe('no-effect');
  });
});

// ============================================================================
// decodeAccountState
// ============================================================================

describe('decodeAccountState', () => {
  const encodeAccount = (owner: Address, data: Uint8Array, lamports = 2_039_280n) => ({
    lamports,
    owner,
    data: [getBase64Decoder().decode(data), 'base64'] as const,
  });

  it('decodes a classic SPL token account, delegate included', () => {
    const data = getTokenEncoder().encode({
      mint: USDC,
      owner: WALLET,
      amount: 123n,
      delegate: some(SPENDER),
      state: 1,
      isNative: none(),
      delegatedAmount: U64_MAX,
      closeAuthority: none(),
      extensions: none(),
    });

    const state = decodeAccountState(encodeAccount(TOKEN_PROGRAM_ADDRESS, new Uint8Array(data)));

    expect(state?.token).toEqual({
      mint: USDC,
      owner: WALLET,
      amount: 123n,
      delegate: SPENDER,
      delegatedAmount: U64_MAX,
    });
    expect(state?.lamports).toBe(2_039_280n);
  });

  it('decodes an account with no delegate as delegate null', () => {
    const data = getTokenEncoder().encode({
      mint: USDC,
      owner: WALLET,
      amount: 1n,
      delegate: none(),
      state: 1,
      isNative: none(),
      delegatedAmount: 0n,
      closeAuthority: none(),
      extensions: none(),
    });

    const state = decodeAccountState(
      encodeAccount(TOKEN_2022_PROGRAM_ADDRESS, new Uint8Array(data))
    );

    expect(state?.token?.delegate).toBeNull();
  });

  it('does not mistake a mint for a token account', () => {
    const data = getMintEncoder().encode({
      mintAuthority: none(),
      supply: 1_000n,
      decimals: 6,
      isInitialized: true,
      freezeAuthority: none(),
      extensions: none(),
    });

    const state = decodeAccountState(encodeAccount(TOKEN_PROGRAM_ADDRESS, new Uint8Array(data)));

    expect(state?.token).toBeNull();
  });

  it('returns lamports only for an account owned by another program', () => {
    const state = decodeAccountState({
      lamports: 7n,
      owner: address('11111111111111111111111111111111'),
      data: ['', 'base64'],
    });

    expect(state).toEqual({ lamports: 7n, token: null });
  });

  it('returns null for an account that does not exist', () => {
    expect(decodeAccountState(null)).toBeNull();
  });
});

// ============================================================================
// previewTransactionEffects — RPC orchestration and failure modes
// ============================================================================

/** A base64 wire transaction moving 1 SOL, unsigned, as a dApp would supply it. */
function wireTransfer(): Base64EncodedWireTransaction {
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(WALLET, m),
    (m) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: BLOCKHASH, lastValidBlockHeight: 1_000n },
        m
      ),
    (m) =>
      appendTransactionMessageInstructions(
        [
          getTransferSolInstruction({
            source: createNoopSigner(WALLET),
            destination: OTHER,
            amount: 1_000_000_000n,
          }),
        ],
        m
      )
  );
  return getBase64EncodedWireTransaction(compileTransaction(message));
}

/** Raw RPC account payload for a plain lamport-only account. */
const rawSol = (lamports: bigint) => ({
  lamports,
  owner: address('11111111111111111111111111111111'),
  data: ['', 'base64'] as const,
});

/**
 * Mock RPC in the shape the rest of this package uses: every method is a
 * `vi.fn()` returning `{ send }`.
 */
function createRpc(overrides: Record<string, unknown> = {}): SolanaRpc {
  const thunk = <T>(value: T) => vi.fn().mockReturnValue({ send: async () => value });
  return {
    // The transfer's three static accounts: wallet, recipient, system program.
    getMultipleAccounts: thunk({
      value: [rawSol(2_000_000_000n), rawSol(0n), rawSol(1n)],
    }),
    simulateTransaction: thunk({
      value: {
        err: null,
        logs: ['Program 11111111111111111111111111111111 success'],
        fee: 5_000n,
        accounts: [rawSol(999_995_000n), rawSol(1_000_000_000n), rawSol(1n)],
      },
    }),
    ...overrides,
  } as unknown as SolanaRpc;
}

const preview = (rpc: SolanaRpc): Promise<TransactionEffects> =>
  previewTransactionEffects(rpc, wireTransfer(), WALLET);

describe('previewTransactionEffects', () => {
  it('previews an unsigned transaction without verifying signatures or sending it', async () => {
    const rpc = createRpc();
    const result = await preview(rpc);

    if (result.kind !== 'effects') throw new Error(`expected effects, got ${result.kind}`);
    expect(result.sol.lamports).toBe(-1_000_005_000n);
    expect(result.sol.feeLamports).toBe(5_000n);

    // An unsigned transaction can only be simulated with sigVerify off, and the
    // post-execution state must be explicitly requested.
    const [, config] = vi.mocked(rpc.simulateTransaction).mock.calls[0]!;
    expect(config).toMatchObject({
      encoding: 'base64',
      replaceRecentBlockhash: true,
      sigVerify: false,
    });
    const { accounts } = config as unknown as { accounts: { addresses: readonly Address[] } };
    expect(accounts.addresses).toEqual([
      WALLET,
      OTHER,
      address('11111111111111111111111111111111'),
    ]);

    // Nothing in this path may broadcast.
    expect((rpc as unknown as Record<string, unknown>).sendTransaction).toBeUndefined();
  });

  it('reports undetermined, not no-change, when the RPC is unreachable', async () => {
    const rpc = createRpc({
      simulateTransaction: vi.fn().mockReturnValue({
        send: async () => {
          throw new Error('fetch failed');
        },
      }),
    });

    const result = await preview(rpc);

    expect(result.kind).toBe('undetermined');
    if (result.kind !== 'undetermined') throw new Error('expected undetermined');
    expect(result.reason).toBe('simulation-unavailable');
    expect(result.detail).toContain('fetch failed');
  });

  it('reports undetermined when the node never executed the transaction', async () => {
    const rpc = createRpc({
      simulateTransaction: vi.fn().mockReturnValue({
        send: async () => ({ value: { err: null, logs: null, accounts: null } }),
      }),
    });

    const result = await preview(rpc);

    if (result.kind !== 'undetermined') throw new Error('expected undetermined');
    expect(result.reason).toBe('simulation-not-executed');
  });

  it('reports a transaction that would fail separately from one with no effect', async () => {
    const rpc = createRpc({
      simulateTransaction: vi.fn().mockReturnValue({
        send: async () => ({
          value: {
            err: { InstructionError: [0, { Custom: 1 }] },
            logs: ['Program log: insufficient funds'],
            accounts: null,
          },
        }),
      }),
    });

    const result = await preview(rpc);

    expect(result.kind).toBe('transaction-would-fail');
    if (result.kind !== 'transaction-would-fail') throw new Error('expected would-fail');
    expect(result.error).toEqual({ InstructionError: [0, { Custom: 1 }] });
    expect(result.logs).toEqual(['Program log: insufficient funds']);
  });

  it('reports undetermined when the node withholds post-execution account state', async () => {
    const rpc = createRpc({
      simulateTransaction: vi.fn().mockReturnValue({
        send: async () => ({ value: { err: null, logs: ['ok'], accounts: null } }),
      }),
    });

    const result = await preview(rpc);

    if (result.kind !== 'undetermined') throw new Error('expected undetermined');
    expect(result.reason).toBe('account-state-unavailable');
  });

  it('refuses to read a missing post-state for the previewed account as a drain to zero', async () => {
    const rpc = createRpc({
      simulateTransaction: vi.fn().mockReturnValue({
        send: async () => ({
          value: { err: null, logs: ['ok'], fee: 5_000n, accounts: [null, null, null] },
        }),
      }),
    });

    const result = await preview(rpc);

    if (result.kind !== 'undetermined') throw new Error('expected undetermined');
    expect(result.reason).toBe('account-state-unavailable');
  });

  it('reports undetermined for a transaction it cannot decode', async () => {
    const result = await previewTransactionEffects(
      createRpc(),
      'not-a-transaction' as Base64EncodedWireTransaction,
      WALLET
    );

    if (result.kind !== 'undetermined') throw new Error('expected undetermined');
    expect(result.reason).toBe('malformed-transaction');
  });

  it('reports no-effect when the previewed account is untouched by a real transaction', async () => {
    const rpc = createRpc({
      getMultipleAccounts: vi.fn().mockReturnValue({
        send: async () => ({ value: [rawSol(2_000_000_000n), rawSol(0n), rawSol(1n)] }),
      }),
      simulateTransaction: vi.fn().mockReturnValue({
        send: async () => ({
          value: {
            err: null,
            logs: ['ok'],
            fee: 0n,
            accounts: [rawSol(2_000_000_000n), rawSol(0n), rawSol(1n)],
          },
        }),
      }),
    });

    const result = await preview(rpc);

    expect(result.kind).toBe('no-effect');
  });
});
