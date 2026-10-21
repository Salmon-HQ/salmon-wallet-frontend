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
import { AccountRole } from '@solana/kit';
import type { Address, Base64EncodedWireTransaction, Blockhash, Instruction } from '@solana/kit';
import {
  getAllocateInstruction,
  getTransferSolInstruction,
  getTransferSolWithSeedInstruction,
} from '@solana-program/system';
import { getSetComputeUnitLimitInstruction } from '@solana-program/compute-budget';
import { getAddMemoInstruction, LEGACY_MEMO_PROGRAM_ADDRESS_V3 } from '@solana-program/memo';
import {
  AuthorityType,
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  getBurnCheckedInstruction,
  getCreateAssociatedTokenIdempotentInstruction,
  getMintEncoder,
  getSetAuthorityInstruction,
  getTokenEncoder,
  getTransferCheckedInstruction,
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
const SYSTEM_PROGRAM: Address = address('11111111111111111111111111111111');

/** Builds a decoded token-account snapshot. */
function tokenAccount(
  overrides: Partial<AccountState['token'] & object> & { mint: Address; owner: Address },
  lamports = 2_039_280n
): AccountState {
  return {
    lamports,
    owner: TOKEN_PROGRAM_ADDRESS,
    token: {
      amount: 0n,
      delegate: null,
      delegatedAmount: 0n,
      ...overrides,
    },
  };
}

/** Builds a plain (non-token) account snapshot, owned by the System Program unless stated. */
function solAccount(lamports: bigint, owner: Address = SYSTEM_PROGRAM): AccountState {
  return { lamports, owner, token: null };
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

  // SPL SetAuthority(AccountOwner) hands the whole token account to someone
  // else. The balance and the delegate are untouched, so an amount/delegate
  // diff sees nothing and the preview used to collapse to `no-effect` — the
  // approval screen then said the transaction moves none of your balances
  // while it gave the account away.
  it('never reports an ownership change as no-effect', () => {
    const ATTACKER = '8pM1YsWLwCoU4nNGUzgjQZ8iBfTFtfkDfsfnayrHRJrQ' as Address;

    const result = deriveEffects(
      derivationInput({
        before: new Map([
          [USDC_ATA, tokenAccount({ mint: USDC, owner: WALLET, amount: 5_000_000_000n })],
        ]),
        after: new Map([
          [USDC_ATA, tokenAccount({ mint: USDC, owner: ATTACKER, amount: 5_000_000_000n })],
        ]),
      })
    );

    expect(result.kind).not.toBe('no-effect');
    expect(result.kind).toBe('undetermined');
  });

  // System Assign hands the wallet's own account to another program, which can
  // then debit every lamport in it. No lamports move, so a balance diff sees
  // nothing: the preview said "No balance changes" (dApp pays the fee) or only
  // the fee, with a one-tap approve.
  it('never reports a reassignment of the wallet account as no-effect or a plain fee', () => {
    const ATTACKER_PROGRAM = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' as Address;

    for (const lamportsAfter of [1_000_000n, 995_000n, 2_000_000n]) {
      const result = deriveEffects(
        derivationInput({
          before: new Map([[WALLET, solAccount(1_000_000n)]]),
          after: new Map([[WALLET, solAccount(lamportsAfter, ATTACKER_PROGRAM)]]),
        })
      );

      expect(result).toMatchObject({ kind: 'undetermined', reason: 'ownership-change' });
    }
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

  it('derives an exchange touching several token accounts and ignores accounts it does not own', () => {
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

  it('reports a delegation moved to a different spender for the same amount', () => {
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

    expect(state).toEqual({ lamports: 7n, owner: SYSTEM_PROGRAM, token: null });
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
const rawSol = (
  lamports: bigint,
  owner: Address = address('11111111111111111111111111111111')
) => ({
  lamports,
  owner,
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

  // Reading the accounts and simulating in parallel let the two answers come
  // from different slots, so a diff could compare a later "before" with an
  // earlier "after". The simulation now runs no earlier than the read.
  it('simulates no earlier than the slot the accounts were read at', async () => {
    const rpc = createRpc({
      getMultipleAccounts: vi.fn().mockReturnValue({
        send: async () => ({
          context: { slot: 4242n },
          value: [rawSol(2_000_000_000n), rawSol(0n), rawSol(1n)],
        }),
      }),
    });

    await preview(rpc);

    const read = vi.mocked(rpc.getMultipleAccounts).mock.invocationCallOrder[0]!;
    const simulated = vi.mocked(rpc.simulateTransaction).mock.invocationCallOrder[0]!;
    expect(read).toBeLessThan(simulated);
    const [, config] = vi.mocked(rpc.simulateTransaction).mock.calls[0]!;
    expect(config).toMatchObject({ minContextSlot: 4242n });
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

  // The mints behind a token account are read after the simulation. A failure
  // there escaped as a thrown error, the approval screen never left
  // "Simulating…", and with no preview it kept the ordinary one-tap Approve.
  it('reports undetermined, not an error, when the token mints cannot be read', async () => {
    const tokenData = getTokenEncoder().encode({
      mint: USDC,
      owner: OTHER,
      amount: 1n,
      delegate: none(),
      state: 1,
      isNative: none(),
      delegatedAmount: 0n,
      closeAuthority: none(),
      extensions: none(),
    });
    const rawToken = {
      lamports: 2_039_280n,
      owner: TOKEN_PROGRAM_ADDRESS,
      data: [getBase64Decoder().decode(new Uint8Array(tokenData)), 'base64'] as const,
    };
    const rpc = createRpc({
      getMultipleAccounts: vi
        .fn()
        .mockReturnValueOnce({
          send: async () => ({ value: [rawSol(2_000_000_000n), rawToken, rawSol(1n)] }),
        })
        .mockReturnValue({
          send: async () => {
            throw new Error('429 Too Many Requests');
          },
        }),
      simulateTransaction: vi.fn().mockReturnValue({
        send: async () => ({
          value: {
            err: null,
            logs: ['ok'],
            fee: 5_000n,
            accounts: [rawSol(1_999_995_000n), rawToken, rawSol(1n)],
          },
        }),
      }),
    });

    const result = await preview(rpc);

    expect(result).toMatchObject({ kind: 'undetermined', reason: 'simulation-unavailable' });
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

  // System Allocate gives the wallet's own account data. No lamport moves and
  // the owner stays the System Program, yet an account with data can no
  // longer send SOL with a System transfer.
  it('never reports data written into the previewed account as no change', async () => {
    const wire = wireOf([
      getAllocateInstruction({ newAccount: createNoopSigner(WALLET), space: 8 }),
    ]);
    const rpc = rpcFor(
      { [WALLET]: rawSol(1_000_000_000n) },
      {
        [WALLET]: {
          ...rawSol(999_995_000n),
          data: [getBase64Decoder().decode(new Uint8Array(8)), 'base64'] as const,
        } as unknown as Raw,
      }
    );

    expect(await previewTransactionEffects(rpc, wire, WALLET)).toMatchObject({
      kind: 'undetermined',
      reason: 'unanalysed-account',
    });
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

// ============================================================================
// previewTransactionEffects — strict mode (dApp approvals)
// ============================================================================

const STAKE_PROGRAM: Address = address('Stake11111111111111111111111111111111111111');
const STAKE_ACCOUNT: Address = address('8pM1YsWLwCoU4nNGUzgjQZ8iBfTFtfkDfsfnayrHRJrQ');
const CLOCK_SYSVAR: Address = address('SysvarC1ock11111111111111111111111111111111');

/** A v0 wire transaction carrying `instructions`, unsigned. */
function wireOf(instructions: Instruction[], feePayer: Address = WALLET) {
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(feePayer, m),
    (m) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: BLOCKHASH, lastValidBlockHeight: 1_000n },
        m
      ),
    (m) => appendTransactionMessageInstructions(instructions, m)
  );
  return getBase64EncodedWireTransaction(compileTransaction(message));
}

type Raw = ReturnType<typeof rawSol>;

/**
 * Mock RPC that answers from two address books: what each account holds
 * before the transaction, and what the simulation says it holds after.
 */
function rpcFor(before: Record<string, Raw | null>, after: Record<string, Raw | null> = before) {
  return {
    getMultipleAccounts: vi.fn((addresses: readonly Address[]) => ({
      send: async () => ({ value: addresses.map((key) => before[key] ?? null) }),
    })),
    simulateTransaction: vi.fn(
      (_wire: unknown, config: { accounts: { addresses: readonly Address[] } }) => ({
        send: async () => ({
          value: {
            err: null,
            logs: ['ok'],
            fee: 5_000n,
            accounts: config.accounts.addresses.map((key) => after[key] ?? null),
          },
        }),
      })
    ),
  } as unknown as SolanaRpc;
}

const strict = (rpc: SolanaRpc, wire: Base64EncodedWireTransaction) =>
  previewTransactionEffects(rpc, wire, WALLET, { strict: true });

const MERCHANT: Address = address('7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj');
const RELAYER: Address = address('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
const RELAYER_ATA: Address = address('AeMuAqDcw2nWnCUnkqNXTVfWjRqPZ4uHzHUgBvBmnGXK');
const MERCHANT_ATA: Address = address('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');

/** Raw RPC payload for a classic SPL token account. */
function rawToken(owner: Address, amount: bigint): Raw {
  const data = getTokenEncoder().encode({
    mint: USDC,
    owner,
    amount,
    delegate: none(),
    state: 1,
    isNative: none(),
    delegatedAmount: 0n,
    closeAuthority: none(),
    extensions: none(),
  });
  return {
    lamports: 2_039_280n,
    owner: TOKEN_PROGRAM_ADDRESS,
    data: [getBase64Decoder().decode(new Uint8Array(data)), 'base64'],
  } as unknown as Raw;
}

/** Raw RPC payload for the USDC mint, with `authority` able to mint. */
function rawMint(supply: bigint, authority: Address): Raw {
  const data = getMintEncoder().encode({
    mintAuthority: some(authority),
    supply,
    decimals: 6,
    isInitialized: true,
    freezeAuthority: none(),
    extensions: none(),
  });
  return {
    lamports: 1_461_600n,
    owner: TOKEN_PROGRAM_ADDRESS,
    data: [getBase64Decoder().decode(new Uint8Array(data)), 'base64'],
  } as unknown as Raw;
}

const classic = { programAddress: TOKEN_PROGRAM_ADDRESS };

describe('previewTransactionEffects in strict mode', () => {
  // A stake authority change moves no lamports and no tokens of the wallet's,
  // so the balance diff reported "No balance changes" with a one-tap approve
  // while the wallet's staked SOL changed hands.
  const authorize: Instruction = {
    programAddress: STAKE_PROGRAM,
    accounts: [
      { address: STAKE_ACCOUNT, role: AccountRole.WRITABLE },
      { address: CLOCK_SYSVAR, role: AccountRole.READONLY },
      { address: WALLET, role: AccountRole.WRITABLE_SIGNER },
    ],
    data: new Uint8Array([1, 0, 0, 0]),
  };

  it('reports a program it cannot read as unanalysed, with the movements it did read', async () => {
    const rpc = rpcFor(
      { [WALLET]: rawSol(1_000_000_000n), [STAKE_ACCOUNT]: rawSol(3_000_000_000n, STAKE_PROGRAM) },
      { [WALLET]: rawSol(999_995_000n), [STAKE_ACCOUNT]: rawSol(3_000_000_000n, STAKE_PROGRAM) }
    );

    const result = await strict(rpc, wireOf([authorize]));

    expect(result).toMatchObject({
      kind: 'undetermined',
      reason: 'unanalysed-program',
      known: { sol: { lamports: -5_000n, feeLamports: 5_000n }, tokens: [], approvals: [] },
    });
  });

  // A swap through a router: the screen shows what the wallet gives and gets,
  // beside the warning, instead of an empty "could not determine" card.
  it('keeps the token movements of a swap through a program it cannot read', async () => {
    const swap: Instruction = {
      programAddress: SPENDER,
      accounts: [
        { address: WALLET, role: AccountRole.WRITABLE_SIGNER },
        { address: USDC_ATA, role: AccountRole.WRITABLE },
        { address: POOL_ATA, role: AccountRole.WRITABLE },
      ],
      data: new Uint8Array([9]),
    };
    const rpc = rpcFor(
      {
        [WALLET]: rawSol(1_000_000_000n),
        [USDC_ATA]: rawToken(WALLET, 30_000_000n),
        [POOL_ATA]: rawToken(OTHER, 1_000_000_000n),
      },
      {
        [WALLET]: rawSol(1_049_995_000n),
        [USDC_ATA]: rawToken(WALLET, 20_000_000n),
        [POOL_ATA]: rawToken(OTHER, 1_010_000_000n),
      }
    );

    const result = await strict(rpc, wireOf([swap]));

    if (result.kind !== 'undetermined')
      throw new Error(`expected undetermined, got ${result.kind}`);
    expect(result.reason).toBe('unanalysed-program');
    expect(result.known?.sol.lamports).toBe(49_995_000n);
    expect(result.known?.tokens).toEqual([expect.objectContaining({ amount: -10_000_000n })]);
  });

  // A Token-2022 mint with a transfer hook runs code its creator chose on
  // every transfer, through Token-2022 itself, so the top-level program list
  // looks harmless.
  it('reports a transfer of a token with a transfer hook as unanalysed', async () => {
    const HOOKED_MINT = address('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
    const mintData = getMintEncoder().encode({
      mintAuthority: none(),
      supply: 1_000_000_000n,
      decimals: 6,
      isInitialized: true,
      freezeAuthority: none(),
      extensions: some([{ __kind: 'TransferHook', authority: OTHER, programId: SPENDER }]),
    });
    const hookedMint = {
      lamports: 1_461_600n,
      owner: TOKEN_2022_PROGRAM_ADDRESS,
      data: [getBase64Decoder().decode(new Uint8Array(mintData)), 'base64'],
    } as unknown as Raw;
    const wire = wireOf([
      getTransferCheckedInstruction({
        source: USDC_ATA,
        mint: HOOKED_MINT,
        destination: MERCHANT_ATA,
        authority: createNoopSigner(WALLET),
        amount: 1n,
        decimals: 6,
      }),
    ]);
    const rpc = rpcFor({ [WALLET]: rawSol(1_000_000_000n), [HOOKED_MINT]: hookedMint });

    expect(await strict(rpc, wire)).toMatchObject({
      kind: 'undetermined',
      reason: 'unanalysed-program',
    });
  });

  it('reports a program the node logged being invoked through another as unanalysed', async () => {
    const wire = wireOf([
      getTransferSolInstruction({
        source: createNoopSigner(WALLET),
        destination: MERCHANT,
        amount: 1n,
      }),
    ]);
    const rpc = rpcFor({ [WALLET]: rawSol(1_000_000_000n), [MERCHANT]: rawSol(10n) });
    vi.mocked(rpc.simulateTransaction).mockReturnValue({
      send: async () => ({
        value: {
          err: null,
          fee: 5_000n,
          logs: [
            'Program 11111111111111111111111111111111 invoke [1]',
            `Program ${SPENDER} invoke [2]`,
            `Program ${SPENDER} success`,
            'Program 11111111111111111111111111111111 success',
          ],
          accounts: [rawSol(999_994_999n), rawSol(11n), rawSol(1n)],
        },
      }),
    } as never);

    expect(await strict(rpc, wire)).toMatchObject({
      kind: 'undetermined',
      reason: 'unanalysed-program',
    });
  });

  // "Would fail" is the simulation's word, and the simulation of a program
  // this module cannot read is not one to repeat to the user.
  it('does not pass on a failing simulation of a program it cannot read', async () => {
    const rpc = rpcFor({ [WALLET]: rawSol(1_000_000_000n) });
    vi.mocked(rpc.simulateTransaction).mockReturnValue({
      send: async () => ({
        value: { err: { InstructionError: [0, { Custom: 1 }] }, logs: ['x'], accounts: null },
      }),
    } as never);

    const result = await strict(rpc, wireOf([authorize]));

    expect(result).toMatchObject({ kind: 'undetermined', reason: 'unanalysed-program' });
    expect(result).not.toHaveProperty('known');
  });

  // An account derived from the wallet with a seed is the wallet's money, but
  // not a balance the diff reads: draining it showed only the fee.
  it('reports an account that loses funds outside the diff as unanalysed', async () => {
    const SEEDED: Address = STAKE_ACCOUNT;
    const wire = wireOf([
      getTransferSolWithSeedInstruction({
        source: SEEDED,
        baseAccount: createNoopSigner(WALLET),
        destination: OTHER,
        amount: 5_000_000_000n,
        fromSeed: 'savings',
        fromOwner: SYSTEM_PROGRAM,
      }),
    ]);
    const rpc = rpcFor(
      { [WALLET]: rawSol(1_000_000_000n), [SEEDED]: rawSol(5_000_000_000n), [OTHER]: rawSol(0n) },
      { [WALLET]: rawSol(999_995_000n), [SEEDED]: rawSol(0n), [OTHER]: rawSol(5_000_000_000n) }
    );

    const result = await strict(rpc, wire);

    expect(result).toMatchObject({
      kind: 'undetermined',
      reason: 'unanalysed-account',
      known: { sol: { lamports: -5_000n } },
    });
  });

  it('reports a mint authority handed over as unanalysed, though no balance moves', async () => {
    const wire = wireOf([
      getSetAuthorityInstruction(
        {
          owned: USDC,
          owner: createNoopSigner(WALLET),
          authorityType: AuthorityType.MintTokens,
          newAuthority: some(OTHER),
        },
        classic
      ),
    ]);
    const rpc = rpcFor(
      { [WALLET]: rawSol(1_000_000_000n), [USDC]: rawMint(1_000n, WALLET) },
      { [WALLET]: rawSol(999_995_000n), [USDC]: rawMint(1_000n, OTHER) }
    );

    expect(await strict(rpc, wire)).toMatchObject({
      kind: 'undetermined',
      reason: 'unanalysed-account',
    });
  });

  describe('keeps the preview for what it reads in full', () => {
    it('a SOL payment with a compute limit and a memo', async () => {
      const wire = wireOf([
        getSetComputeUnitLimitInstruction({ units: 50_000 }),
        getTransferSolInstruction({
          source: createNoopSigner(WALLET),
          destination: MERCHANT,
          amount: 1_000_000_000n,
        }),
        getAddMemoInstruction(
          { memo: 'order 42' },
          { programAddress: LEGACY_MEMO_PROGRAM_ADDRESS_V3 }
        ),
      ]);
      const rpc = rpcFor(
        { [WALLET]: rawSol(2_000_000_000n), [MERCHANT]: rawSol(10n) },
        { [WALLET]: rawSol(999_995_000n), [MERCHANT]: rawSol(1_000_000_010n) }
      );

      const result = await strict(rpc, wire);

      if (result.kind !== 'effects') throw new Error(`expected effects, got ${result.kind}`);
      expect(result.sol.lamports).toBe(-1_000_005_000n);
    });

    it('a token payment that opens the recipient’s token account', async () => {
      const wire = wireOf([
        getCreateAssociatedTokenIdempotentInstruction({
          payer: createNoopSigner(WALLET),
          ata: MERCHANT_ATA,
          owner: MERCHANT,
          mint: USDC,
          tokenProgram: TOKEN_PROGRAM_ADDRESS,
        }),
        getTransferCheckedInstruction(
          {
            source: USDC_ATA,
            mint: USDC,
            destination: MERCHANT_ATA,
            authority: createNoopSigner(WALLET),
            amount: 5_000_000n,
            decimals: 6,
          },
          classic
        ),
      ]);
      const mint = rawMint(9_000_000_000n, OTHER);
      const rpc = rpcFor(
        {
          [WALLET]: rawSol(1_000_000_000n),
          [USDC_ATA]: rawToken(WALLET, 7_000_000n),
          [USDC]: mint,
        },
        {
          [WALLET]: rawSol(1_000_000_000n - 5_000n - 2_039_280n),
          [USDC_ATA]: rawToken(WALLET, 2_000_000n),
          [MERCHANT_ATA]: rawToken(MERCHANT, 5_000_000n),
          [USDC]: mint,
        }
      );

      const result = await strict(rpc, wire);

      if (result.kind !== 'effects') throw new Error(`expected effects, got ${result.kind}`);
      expect(result.tokens).toEqual([expect.objectContaining({ mint: USDC, amount: -5_000_000n })]);
    });

    it('a payment whose network fee another signer pays', async () => {
      const wire = wireOf(
        [
          getTransferCheckedInstruction(
            {
              source: USDC_ATA,
              mint: USDC,
              destination: MERCHANT_ATA,
              authority: createNoopSigner(WALLET),
              amount: 5_000_000n,
              decimals: 6,
            },
            classic
          ),
          getTransferCheckedInstruction(
            {
              source: USDC_ATA,
              mint: USDC,
              destination: RELAYER_ATA,
              authority: createNoopSigner(WALLET),
              amount: 10_000n,
              decimals: 6,
            },
            classic
          ),
        ],
        RELAYER
      );
      const mint = rawMint(9_000_000_000n, OTHER);
      const rpc = rpcFor(
        {
          [RELAYER]: rawSol(50_000_000n),
          [WALLET]: rawSol(1_000_000n),
          [USDC_ATA]: rawToken(WALLET, 7_000_000n),
          [MERCHANT_ATA]: rawToken(MERCHANT, 0n),
          [RELAYER_ATA]: rawToken(RELAYER, 0n),
          [USDC]: mint,
        },
        {
          [RELAYER]: rawSol(49_995_000n),
          [WALLET]: rawSol(1_000_000n),
          [USDC_ATA]: rawToken(WALLET, 1_990_000n),
          [MERCHANT_ATA]: rawToken(MERCHANT, 5_000_000n),
          [RELAYER_ATA]: rawToken(RELAYER, 10_000n),
          [USDC]: mint,
        }
      );

      const result = await strict(rpc, wire);

      if (result.kind !== 'effects') throw new Error(`expected effects, got ${result.kind}`);
      expect(result.tokens).toEqual([expect.objectContaining({ amount: -5_010_000n })]);
    });

    it('a trade where the other party signs and pays from its own token account', async () => {
      const wire = wireOf([
        getTransferSolInstruction({
          source: createNoopSigner(WALLET),
          destination: MERCHANT,
          amount: 100_000_000n,
        }),
        getTransferCheckedInstruction(
          {
            source: MERCHANT_ATA,
            mint: USDC,
            destination: USDC_ATA,
            authority: createNoopSigner(MERCHANT),
            amount: 20_000_000n,
            decimals: 6,
          },
          classic
        ),
      ]);
      const mint = rawMint(9_000_000_000n, OTHER);
      const rpc = rpcFor(
        {
          [WALLET]: rawSol(1_000_000_000n),
          [MERCHANT]: rawSol(5_000_000n),
          [USDC_ATA]: rawToken(WALLET, 0n),
          [MERCHANT_ATA]: rawToken(MERCHANT, 50_000_000n),
          [USDC]: mint,
        },
        {
          [WALLET]: rawSol(899_995_000n),
          [MERCHANT]: rawSol(105_000_000n),
          [USDC_ATA]: rawToken(WALLET, 20_000_000n),
          [MERCHANT_ATA]: rawToken(MERCHANT, 30_000_000n),
          [USDC]: mint,
        }
      );

      const result = await strict(rpc, wire);

      if (result.kind !== 'effects') throw new Error(`expected effects, got ${result.kind}`);
      expect(result.tokens).toEqual([expect.objectContaining({ amount: 20_000_000n })]);
    });

    it('a burn of the wallet’s own tokens, which moves the mint’s supply', async () => {
      const wire = wireOf([
        getBurnCheckedInstruction(
          {
            account: USDC_ATA,
            mint: USDC,
            authority: createNoopSigner(WALLET),
            amount: 1_000_000n,
            decimals: 6,
          },
          classic
        ),
      ]);
      const rpc = rpcFor(
        {
          [WALLET]: rawSol(1_000_000_000n),
          [USDC_ATA]: rawToken(WALLET, 3_000_000n),
          [USDC]: rawMint(9_000_000_000n, OTHER),
        },
        {
          [WALLET]: rawSol(999_995_000n),
          [USDC_ATA]: rawToken(WALLET, 2_000_000n),
          [USDC]: rawMint(8_999_000_000n, OTHER),
        }
      );

      const result = await strict(rpc, wire);

      if (result.kind !== 'effects') throw new Error(`expected effects, got ${result.kind}`);
      expect(result.tokens).toEqual([expect.objectContaining({ amount: -1_000_000n })]);
    });
  });
});
