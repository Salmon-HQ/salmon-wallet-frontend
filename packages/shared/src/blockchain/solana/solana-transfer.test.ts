/**
 * Integration Tests for Solana Transfer Functions
 *
 * Tests cover transfer transaction creation and validation.
 * Uses Vitest 4.0.18 with a stubbed kit RPC client.
 *
 * The kit instruction builders are pure and offline, so the instructions are
 * built for real and asserted on their account metas and data bytes. Only the
 * two account-fetching helpers (`fetchMint`, `fetchMaybeToken`) are mocked.
 */

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { PublicKey, Keypair } from '@solana/web3.js';
import {
  AccountRole,
  address,
  createKeyPairSignerFromPrivateKeyBytes,
  some,
  none,
  getBase64Encoder,
  getCompiledTransactionMessageDecoder,
  getTransactionMessageComputeUnitLimit,
  getTransactionMessagePriorityFeeLamports,
  getTransactionMessageLoadedAccountsDataSizeLimit,
} from '@solana/kit';
import type { Address } from '@solana/kit';
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  getTransferCheckedWithFeeInstructionDataDecoder,
} from '@solana-program/token-2022';
import { COMPUTE_BUDGET_PROGRAM_ADDRESS } from '@solana-program/compute-budget';

vi.mock('@solana-program/token-2022', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@solana-program/token-2022')>()),
  fetchMint: vi.fn(),
  fetchMaybeToken: vi.fn(),
}));

import { fetchMint, fetchMaybeToken } from '@solana-program/token-2022';
import {
  calculateTransferFee,
  createSolTransaction,
  createSplTransaction,
  createTransfer,
  estimateFee,
  requiresMemo,
  resendTransaction,
  SOL_ADDRESS,
  v1ResourceBudget,
} from './transfer';
import { createSolanaAccount } from './factory';
import { SOLANA_NETWORKS } from './factory';
import type { SolanaRpc } from './networks';

// ============================================================================
// Test Constants
// ============================================================================

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TOKEN_PROGRAM_ADDRESS = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SYSTEM_PROGRAM_ADDRESS = address('11111111111111111111111111111111');
const MEMO_PROGRAM_ADDRESS = address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const BLOCKHASH = 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi';

const mockSolanaApiFunctions = {
  fetchBalance: vi.fn().mockResolvedValue([]),
  fetchTransactions: vi
    .fn()
    .mockResolvedValue({ transactions: [], oldestSignature: null, hasMore: false }),
  fetchNfts: vi.fn().mockResolvedValue([]),
};

const thunk = <T>(value: T) => vi.fn().mockReturnValue({ send: async () => value });

/**
 * Kit RPC methods return a `{ send() }` thunk, which makes them easier to fake
 * than Connection's methods.
 */
function createRpc(overrides: Record<string, unknown> = {}) {
  return {
    getLatestBlockhash: thunk({ value: { blockhash: BLOCKHASH, lastValidBlockHeight: 1000n } }),
    getRecentPrioritizationFees: thunk([
      { prioritizationFee: 0n, slot: 1n },
      { prioritizationFee: 5_000n, slot: 2n },
      { prioritizationFee: 12_000n, slot: 3n },
      { prioritizationFee: 50_000n, slot: 4n },
    ]),
    getAccountInfo: thunk({ value: { owner: TOKEN_PROGRAM_ADDRESS } }),
    getFeeForMessage: thunk({ value: 5000n }),
    getEpochInfo: thunk({ epoch: 10n }),
    ...overrides,
  } as unknown as SolanaRpc;
}

/**
 * Every v0 transfer now leads with its priority-fee bid, which is a
 * ComputeBudget instruction rather than part of what the user asked for.
 * These assertions are about the transfer, so the bid is taken off first.
 */
const payload = <T extends { programAddress: string }>(transaction: {
  instructions: readonly T[];
}): readonly T[] =>
  transaction.instructions.filter(
    (instruction) => instruction.programAddress !== COMPUTE_BUDGET_PROGRAM_ADDRESS
  );

const testSigner = (seed: number) =>
  createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(seed), false);

const mockMint = (decimals: number, extensions: unknown = none()) => {
  vi.mocked(fetchMint).mockResolvedValue({
    address: address(USDC_MINT),
    data: { decimals, extensions },
  } as never);
};

// ============================================================================
// Test 1: createSolTransaction
// ============================================================================

describe('createSolTransaction', () => {
  const lamports = (transaction: Awaited<ReturnType<typeof createSolTransaction>>) =>
    Buffer.from(payload(transaction).at(-1)!.data!).readBigUInt64LE(4);

  it('sends the lamports the amount holds, exactly', async () => {
    const recipient = address(Keypair.generate().publicKey.toBase58());
    // Math.floor(1e9 * 8.2) is 8,199,999,999.
    const transaction = await createSolTransaction(
      createRpc(),
      await testSigner(1),
      recipient,
      8.2
    );
    expect(lamports(transaction)).toBe(8_200_000_000n);
  });

  it('refuses an amount finer than a lamport, or none at all', async () => {
    const signer = await testSigner(1);
    const recipient = address(Keypair.generate().publicKey.toBase58());
    await expect(createSolTransaction(createRpc(), signer, recipient, 1e-10)).rejects.toThrow();
    await expect(createSolTransaction(createRpc(), signer, recipient, 0)).rejects.toThrow();
  });

  it('should create valid SOL transaction with a stubbed rpc', async () => {
    const rpc = createRpc();
    const signer = await testSigner(1);
    const recipient = address(Keypair.generate().publicKey.toBase58());

    const transaction = await createSolTransaction(rpc, signer, recipient, 1.5);

    expect(transaction.lifetimeConstraint.blockhash).toBe(BLOCKHASH);
    expect(transaction.feePayer.address).toBe(signer.address);
    expect(payload(transaction)).toHaveLength(1);
    expect(payload(transaction)[0].programAddress).toBe(SYSTEM_PROGRAM_ADDRESS);
    expect(rpc.getLatestBlockhash).toHaveBeenCalledTimes(1);
  });

  it('carries a memo and Solana Pay references on a SOL transfer too', async () => {
    const signer = await testSigner(1);
    const ref = Keypair.generate().publicKey.toBase58();
    const transaction = await createSolTransaction(
      createRpc(),
      signer,
      address(Keypair.generate().publicKey.toBase58()),
      1,
      { memo: 'pr_2', references: [ref] }
    );

    expect(payload(transaction)).toHaveLength(2);
    expect(payload(transaction)[0].programAddress).toBe(MEMO_PROGRAM_ADDRESS);
    const transfer = payload(transaction)[1];
    expect(transfer.programAddress).toBe(SYSTEM_PROGRAM_ADDRESS);
    // source, destination — then the reference.
    expect(transfer.accounts).toHaveLength(3);
    expect(transfer.accounts![2]).toEqual({ address: ref, role: AccountRole.READONLY });
  });

  it('should handle different amounts correctly', async () => {
    const signer = await testSigner(1);
    const recipient = address(Keypair.generate().publicKey.toBase58());

    const small = await createSolTransaction(createRpc(), signer, recipient, 0.001);
    const large = await createSolTransaction(createRpc(), signer, recipient, 1000);

    // 4-byte discriminator (2) + u64 lamports, little endian.
    expect(Buffer.from(payload(small)[0].data!).toString('hex')).toBe(
      '02000000' + Buffer.from(new BigUint64Array([1_000_000n]).buffer).toString('hex')
    );
    expect(Buffer.from(payload(large)[0].data!).toString('hex')).toBe(
      '02000000' + Buffer.from(new BigUint64Array([1_000_000_000_000n]).buffer).toString('hex')
    );
  });

  it('should set correct fee payer', async () => {
    const signer = await testSigner(2);
    const transaction = await createSolTransaction(
      createRpc(),
      signer,
      address(Keypair.generate().publicKey.toBase58()),
      2.0
    );

    expect(transaction.feePayer.address).toBe(signer.address);
    // The fee payer travels as a signer, not a bare address, so the compiled
    // message marks it WRITABLE_SIGNER.
    expect(payload(transaction)[0].accounts![0].role).toBe(AccountRole.WRITABLE_SIGNER);
  });
});

// ============================================================================
// Transaction version
// ============================================================================

describe('transaction version', () => {
  // Spec 032: the version is the caller's choice per network. Omitted means
  // v0, so every caller that predates the option keeps its behaviour.
  const recipient = () => address(Keypair.generate().publicKey.toBase58());

  it('builds v0 when no version is asked for, and when 0 is', async () => {
    const signer = await testSigner(1);
    const implicit = await createSolTransaction(createRpc(), signer, recipient(), 1);
    const explicit = await createSolTransaction(createRpc(), signer, recipient(), 1, {
      version: 0,
    });
    expect(implicit.version).toBe(0);
    expect(explicit.version).toBe(0);
  });

  it('builds a v1 SOL transfer on request', async () => {
    const signer = await testSigner(1);
    const transaction = await createSolTransaction(createRpc(), signer, recipient(), 1, {
      version: 1,
    });
    expect(transaction.version).toBe(1);
    expect(transaction.feePayer.address).toBe(signer.address);
    expect(payload(transaction)).toHaveLength(1);
  });

  it('builds a v1 SPL transfer on request', async () => {
    mockMint(6);
    const signer = await testSigner(1);
    const transaction = await createSplTransaction(createRpc(), signer, recipient(), USDC_MINT, 1, {
      version: 1,
    });
    expect(transaction.version).toBe(1);
    // ATA creation + transfer, as for v0.
    expect(payload(transaction)).toHaveLength(2);
  });

  it('writes the v0-equivalent resource budget into a v1 header, and nothing into v0', async () => {
    mockMint(6);
    const signer = await testSigner(1);
    const v0 = await createSplTransaction(createRpc(), signer, recipient(), USDC_MINT, 1);
    const v1 = await createSplTransaction(createRpc(), signer, recipient(), USDC_MINT, 1, {
      version: 1,
    });

    // v0 sets no compute-unit *limit*: the runtime grants 200k CU per
    // instruction and 64 MiB of account data on its own. (It does carry a
    // ComputeBudget instruction now, but for the priority-fee price, which is
    // a different field.) v1 grants zero unless told.
    expect(getTransactionMessageComputeUnitLimit(v0)).toBeUndefined();
    expect(getTransactionMessageLoadedAccountsDataSizeLimit(v0)).toBeUndefined();
    expect(getTransactionMessageComputeUnitLimit(v1)).toBe(200_000 * v1.instructions.length);
    expect(getTransactionMessageLoadedAccountsDataSizeLimit(v1)).toBe(64 * 1024 * 1024);
    expect(v1ResourceBudget(new Array(10).fill(v1.instructions[0])).computeUnitLimit).toBe(
      1_400_000
    );
  });

  it('leads a v0 transfer with its priority-fee bid', async () => {
    const signer = await testSigner(1);
    const transaction = await createSolTransaction(createRpc(), signer, recipient(), 1);

    // The base fee buys no priority, so an unpriced transfer waits out its
    // blockhash whenever the network is busy.
    const bid = transaction.instructions[0];
    expect(bid.programAddress).toBe(COMPUTE_BUDGET_PROGRAM_ADDRESS);
    // Discriminator 3 (SetComputeUnitPrice) + u64 micro-lamports, little
    // endian. The stubbed node's p75 is 12_000, inside the clamp.
    expect(Buffer.from(bid.data!).toString('hex')).toBe(
      '03' + Buffer.from(new BigUint64Array([12_000n]).buffer).toString('hex')
    );
  });

  it('puts the same bid in a v1 header instead of an instruction', async () => {
    const signer = await testSigner(1);
    const transaction = await createSolTransaction(createRpc(), signer, recipient(), 1, {
      version: 1,
    });

    // v1 takes ComputeBudget out of the picture and states one total.
    expect(
      transaction.instructions.some((i) => i.programAddress === COMPUTE_BUDGET_PROGRAM_ADDRESS)
    ).toBe(false);
    // 12_000 micro-lamports/CU over the 200k budget one instruction gets.
    if (transaction.version !== 1) throw new Error('expected a v1 message');
    expect(getTransactionMessagePriorityFeeLamports(transaction)).toBe(2_400n);
  });

  it('still builds when the node cannot price the block', async () => {
    const signer = await testSigner(1);
    const rpc = createRpc({
      getRecentPrioritizationFees: vi.fn().mockReturnValue({
        send: async () => {
          throw new Error('rpc down');
        },
      }),
    });

    const transaction = await createSolTransaction(rpc, signer, recipient(), 1);

    // The floor, rather than no bid at all: an unpriced transfer is the
    // failure this exists to prevent.
    expect(Buffer.from(transaction.instructions[0].data!).toString('hex')).toBe(
      '03' + Buffer.from(new BigUint64Array([1_000n]).buffer).toString('hex')
    );
  });

  it('estimates the fee on a message of the same version it would send', async () => {
    const signer = await testSigner(1);
    const rpc = createRpc();
    await estimateFee(rpc, signer, recipient(), SOL_ADDRESS, 1, { version: 1 });

    const [message] = vi.mocked(rpc.getFeeForMessage).mock.calls[0];
    const compiled = getCompiledTransactionMessageDecoder().decode(
      getBase64Encoder().encode(message)
    );
    expect(compiled.version).toBe(1);
  });
});

// ============================================================================
// Test 2: createSplTransaction
// ============================================================================

describe('createSplTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMint(6);
  });

  it('should create valid SPL token transaction', async () => {
    const rpc = createRpc();
    const signer = await testSigner(1);
    const recipient = address(Keypair.generate().publicKey.toBase58());

    const transaction = await createSplTransaction(rpc, signer, recipient, USDC_MINT, 100, {
      decimals: 6,
    });

    expect(transaction.lifetimeConstraint.blockhash).toBe(BLOCKHASH);
    expect(transaction.feePayer.address).toBe(signer.address);
    // Idempotent ATA creation + transfer.
    expect(payload(transaction)).toHaveLength(2);
    expect(payload(transaction)[1].programAddress).toBe(TOKEN_PROGRAM_ADDRESS);
    // Transfer instruction: discriminator 3, u64 amount.
    expect(Buffer.from(payload(transaction)[1].data!).toString('hex')).toBe(
      '03' + Buffer.from(new BigUint64Array([100_000_000n]).buffer).toString('hex')
    );
  });

  it('marks the transfer authority as a signer', async () => {
    // Regression guard: passing `authority` as a plain Address instead of the
    // TransactionSigner silently yields a READONLY meta, and the transfer is
    // then unauthorized.
    const signer = await testSigner(1);
    const transaction = await createSplTransaction(
      createRpc(),
      signer,
      address(Keypair.generate().publicKey.toBase58()),
      USDC_MINT,
      100,
      { decimals: 6 }
    );

    const authority = payload(transaction)[1].accounts![2];
    expect(authority.address).toBe(signer.address);
    expect(authority.role).toBe(AccountRole.READONLY_SIGNER);
  });

  it('should handle memo in transaction', async () => {
    const signer = await testSigner(1);
    const transaction = await createSplTransaction(
      createRpc(),
      signer,
      address(Keypair.generate().publicKey.toBase58()),
      USDC_MINT,
      50,
      { decimals: 6, memo: 'Test memo' }
    );

    // ATA creation + memo + transfer.
    expect(payload(transaction)).toHaveLength(3);
    const memoInstruction = payload(transaction)[1];
    expect(memoInstruction.programAddress).toBe(MEMO_PROGRAM_ADDRESS);
    expect(Buffer.from(memoInstruction.data!).toString('utf8')).toBe('Test memo');
    // Regression guard: without an explicit `signers` list the memo carries no
    // accounts at all and is not attributable to the payer.
    expect(memoInstruction.accounts).toHaveLength(1);
    expect(memoInstruction.accounts![0].address).toBe(signer.address);
    expect(memoInstruction.accounts![0].role).toBe(AccountRole.READONLY_SIGNER);
  });

  it('carries Solana Pay references on the transfer instruction, after the memo', async () => {
    const signer = await testSigner(1);
    const ref1 = Keypair.generate().publicKey.toBase58();
    const ref2 = Keypair.generate().publicKey.toBase58();
    const transaction = await createSplTransaction(
      createRpc(),
      signer,
      address(Keypair.generate().publicKey.toBase58()),
      USDC_MINT,
      50,
      { decimals: 6, memo: 'pr_1', references: [ref1, ref2] }
    );

    // ATA creation, then the memo immediately before the transfer.
    expect(payload(transaction)).toHaveLength(3);
    expect(payload(transaction)[1].programAddress).toBe(MEMO_PROGRAM_ADDRESS);
    const transfer = payload(transaction)[2];
    expect(transfer.programAddress).toBe(TOKEN_PROGRAM_ADDRESS);
    // source, destination, authority — then the references, in order, read-only and unsigned.
    expect(transfer.accounts).toHaveLength(5);
    expect(transfer.accounts!.slice(3)).toEqual([
      { address: ref1, role: AccountRole.READONLY },
      { address: ref2, role: AccountRole.READONLY },
    ]);
  });

  it('should throw error if token mint not found', async () => {
    const rpc = createRpc({ getAccountInfo: thunk({ value: null }) });

    await expect(
      createSplTransaction(
        rpc,
        await testSigner(1),
        address(Keypair.generate().publicKey.toBase58()),
        USDC_MINT,
        100,
        { decimals: 6 }
      )
    ).rejects.toThrow(`Token mint ${USDC_MINT} not found`);
  });
});

// ============================================================================
// Test 2b: a Token-2022 mint whose displayed amount carries a multiplier
// ============================================================================

describe('createSplTransaction on a mint without a display multiplier', () => {
  const send = async (amount: number, opts: Record<string, unknown> = {}) =>
    createSplTransaction(
      createRpc(),
      await testSigner(1),
      address(Keypair.generate().publicKey.toBase58()),
      USDC_MINT,
      amount,
      opts
    );
  const sent = (transaction: Awaited<ReturnType<typeof send>>) =>
    Buffer.from(payload(transaction).at(-1)!.data!).readBigUInt64LE(1);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the amount exactly as typed, with no floating point between', async () => {
    mockMint(0);
    expect(sent(await send(2 ** 53, { amountText: '9007199254740993' }))).toBe(
      9_007_199_254_740_993n
    );
  });

  // Rounding such an amount sends something else: 2.5 of a whole-unit token
  // went out as 3.
  it('refuses an amount with more decimal places than the token has', async () => {
    mockMint(0);
    await expect(send(2.5, { amountText: '2.5' })).rejects.toThrow();
    mockMint(6);
    await expect(send(0.0000005, { amountText: '0.0000005' })).rejects.toThrow();
  });
});

describe('createSplTransaction on a mint with a display multiplier', () => {
  const CLOCK = 'SysvarC1ock11111111111111111111111111111111';
  const NOW = 1_800_000_000n;

  /** A Token-2022 mint's rpc, with the chain clock at `unixTimestamp` (`null`: no clock account). */
  const rpcAt = (unixTimestamp: bigint | null) =>
    createRpc({
      getAccountInfo: vi.fn((account: string) => ({
        send: async () => {
          if (account !== CLOCK) return { value: { owner: TOKEN_2022_PROGRAM_ADDRESS } };
          if (unixTimestamp === null) return { value: null };
          // Clock: slot, epoch start, epoch, leader schedule epoch, then the unix timestamp.
          const clock = Buffer.alloc(40);
          clock.writeBigInt64LE(unixTimestamp, 32);
          return {
            value: {
              data: [clock.toString('base64'), 'base64'],
              executable: false,
              lamports: 1n,
              owner: 'Sysvar1111111111111111111111111111111111111',
              space: 40n,
            },
          };
        },
      })),
    });

  const scaled = (multiplier: number, newMultiplier = multiplier, effectiveAt = 0n) => ({
    __kind: 'ScaledUiAmountConfig' as const,
    authority: address(USDC_MINT),
    multiplier,
    newMultiplierEffectiveTimestamp: effectiveAt,
    newMultiplier,
  });

  const interestBearing = (currentRate: number) => ({
    __kind: 'InterestBearingConfig' as const,
    rateAuthority: address(USDC_MINT),
    initializationTimestamp: 0n,
    preUpdateAverageRate: 0,
    lastUpdateTimestamp: 0n,
    currentRate,
  });

  const send = async (rpc: SolanaRpc, amount: number, opts: Record<string, unknown> = {}) =>
    createSplTransaction(
      rpc,
      await testSigner(1),
      address(Keypair.generate().publicKey.toBase58()),
      USDC_MINT,
      amount,
      opts
    );

  /** The raw amount a Transfer instruction carries: a u64 after its one-byte discriminator. */
  const sent = (transaction: Awaited<ReturnType<typeof send>>) =>
    Buffer.from(payload(transaction).at(-1)!.data!).readBigUInt64LE(1);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends half the raw units when the multiplier doubles what the holder sees', async () => {
    mockMint(6, some([scaled(2)]));
    expect(sent(await send(rpcAt(NOW), 10))).toBe(5_000_000n);
  });

  it('sends twice the raw units when the multiplier halves what the holder sees', async () => {
    mockMint(6, some([scaled(0.5)]));
    expect(sent(await send(rpcAt(NOW), 10))).toBe(20_000_000n);
  });

  it('rounds up when that is what makes the recipient see exactly the amount typed', async () => {
    // 10 / 1.0000001 is 999,999,900.00001 raw units: 999,999,900 shows as
    // 9.99999999, 999,999,901 shows as 10.
    mockMint(8, some([scaled(1.0000001)]));
    expect(sent(await send(rpcAt(NOW), 10))).toBe(999_999_901n);
  });

  it('sends the closest amount below when no raw amount shows as exactly what was typed', async () => {
    // At x3 with no decimals each raw unit shows as 3: 10 is unreachable, 9 is below it.
    mockMint(0, some([scaled(3)]));
    expect(sent(await send(rpcAt(NOW), 10))).toBe(3n);
  });

  it('refuses an amount that comes to no raw units at all', async () => {
    // At x2, one display unit is half a raw unit: nothing can show as 0.000001.
    mockMint(6, some([scaled(2)]));
    await expect(send(rpcAt(NOW), 0.000001, { amountText: '0.000001' })).rejects.toThrow();
  });

  it('switches to the new multiplier once the chain clock is past its effective time', async () => {
    mockMint(6, some([scaled(1, 2, NOW)]));
    expect(sent(await send(rpcAt(NOW - 600n), 10))).toBe(10_000_000n);
    expect(sent(await send(rpcAt(NOW + 600n), 10))).toBe(5_000_000n);
  });

  it('refuses to build within five minutes either side of a scheduled multiplier change', async () => {
    // The transaction can land after the switch it was converted before.
    mockMint(6, some([scaled(1, 2, NOW)]));
    await expect(send(rpcAt(NOW - 120n), 10)).rejects.toThrow();
    await expect(send(rpcAt(NOW + 120n), 10)).rejects.toThrow();
  });

  it('does not refuse a scheduled change that keeps the same multiplier', async () => {
    mockMint(6, some([scaled(2, 2, NOW)]));
    expect(sent(await send(rpcAt(NOW - 60n), 10))).toBe(5_000_000n);
  });

  it('reads the chain clock at confirmed commitment', async () => {
    mockMint(6, some([scaled(2)]));
    const rpc = rpcAt(NOW);
    await send(rpc, 10);
    const clockCall = vi
      .mocked(rpc.getAccountInfo)
      .mock.calls.find(([account]) => account === CLOCK);
    expect(clockCall?.[1]).toMatchObject({ commitment: 'confirmed' });
  });

  it('converts the amount as typed, not its floating-point reading', async () => {
    // 2^53 + 1 has no exact double: the number reads as ...992.
    mockMint(0, some([scaled(1)]));
    const typed = '9007199254740993';
    expect(sent(await send(rpcAt(NOW), Number(typed), { amountText: typed }))).toBe(
      9_007_199_254_740_993n
    );
  });

  it('converts an interest-bearing amount at the interest accrued by the chain clock', async () => {
    // 100% a year for one 365.24-day year compounds continuously to xe: one
    // raw token (1,000,000 units) shows as 2.718281.
    mockMint(6, some([interestBearing(10_000)]));
    expect(sent(await send(rpcAt(31_556_736n), 2.718281))).toBe(1_000_000n);
  });

  it('sends the whole raw balance on Max, not the amount shown converted back', async () => {
    // 12,345,679 raw units at x0.5 show as 6.172839, which converts back to 12,345,678.
    mockMint(6, some([scaled(0.5)]));
    vi.mocked(fetchMaybeToken).mockResolvedValue({
      exists: true,
      data: { amount: 12_345_679n },
    } as never);
    expect(sent(await send(rpcAt(NOW), 6.172839))).toBe(12_345_678n);
    expect(sent(await send(rpcAt(NOW), 6.172839, { max: true }))).toBe(12_345_679n);
  });

  it('never lets Max send a holding worth less than the amount shown', async () => {
    // 1,000,000 raw units at x2 show as 2; the screen said 3. The transfer asks
    // for the 3 shown, and the chain refuses it for lack of funds.
    mockMint(6, some([scaled(2)]));
    vi.mocked(fetchMaybeToken).mockResolvedValue({
      exists: true,
      data: { amount: 1_000_000n },
    } as never);
    expect(sent(await send(rpcAt(NOW), 3, { max: true }))).toBe(1_500_000n);
  });

  it('charges the transfer fee on the raw amount sent', async () => {
    const onePercent = { epoch: 0n, transferFeeBasisPoints: 100, maximumFee: 1_000_000_000n };
    mockMint(
      6,
      some([
        scaled(2),
        {
          __kind: 'TransferFeeConfig',
          olderTransferFee: onePercent,
          newerTransferFee: onePercent,
        },
      ])
    );
    const data = Buffer.from(payload(await send(rpcAt(NOW), 10)).at(-1)!.data!);
    // TransferCheckedWithFee: discriminators (2 bytes), amount u64, decimals u8, fee u64.
    expect(data.readBigUInt64LE(2)).toBe(5_000_000n);
    expect(data.readBigUInt64LE(11)).toBe(50_000n);
  });

  it('refuses to build when the chain clock cannot be read', async () => {
    mockMint(6, some([scaled(2)]));
    await expect(send(rpcAt(null), 10)).rejects.toThrow();
  });

  it('refuses a multiplier that is not a positive number', async () => {
    mockMint(6, some([scaled(Number.NaN)]));
    await expect(send(rpcAt(NOW), 10)).rejects.toThrow();
  });

  describe('Max', () => {
    const holding = (amount: bigint) =>
      vi.mocked(fetchMaybeToken).mockResolvedValue({ exists: true, data: { amount } } as never);

    it('sends the amount shown when the balance has grown past it', async () => {
      // 20,000,000 raw units at x0.5 show as 10; the screen said 6.172839.
      mockMint(6, some([scaled(0.5)]));
      holding(20_000_000n);
      expect(sent(await send(rpcAt(NOW), 6.172839, { max: true }))).toBe(12_345_678n);
    });

    it('allows no difference on a scaled mint: one display unit off sends the amount shown', async () => {
      // 12,345,679 raw units at x0.5 show as 6.172839; the screen said 6.172838.
      mockMint(6, some([scaled(0.5)]));
      holding(12_345_679n);
      expect(sent(await send(rpcAt(NOW), 6.172838, { max: true }))).toBe(12_345_676n);
    });

    it('allows one display unit of interest accrued since the balance was read', async () => {
      // At xe one raw token shows as 2.718281; the screen, read a moment
      // earlier, said 2.718280.
      mockMint(6, some([interestBearing(10_000)]));
      holding(1_000_000n);
      expect(sent(await send(rpcAt(31_556_736n), 2.71828, { max: true }))).toBe(1_000_000n);
    });

    it('charges the transfer fee on what Max sends', async () => {
      // A fee of the whole amount makes the fee name the amount it was taken on.
      const all = { epoch: 0n, transferFeeBasisPoints: 10_000, maximumFee: 1_000_000_000n };
      mockMint(
        6,
        some([
          scaled(0.5),
          { __kind: 'TransferFeeConfig', olderTransferFee: all, newerTransferFee: all },
        ])
      );
      holding(12_345_679n);
      const transfer = getTransferCheckedWithFeeInstructionDataDecoder().decode(
        payload(await send(rpcAt(NOW), 6.172839, { max: true })).at(-1)!.data!
      );
      expect(transfer.amount).toBe(12_345_679n);
      expect(transfer.fee).toBe(12_345_679n);
    });
  });
});

// ============================================================================
// Test 3: estimateFee
// ============================================================================

describe('estimateFee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMint(6);
  });

  it('should return estimated fee in lamports for SOL transfer', async () => {
    const fee = await estimateFee(
      createRpc(),
      await testSigner(1),
      address(Keypair.generate().publicKey.toBase58()),
      SOL_ADDRESS,
      1.0
    );

    expect(fee).toBe(5000);
  });

  it('should return null for failed fee estimation', async () => {
    const fee = await estimateFee(
      createRpc({ getFeeForMessage: thunk({ value: null }) }),
      await testSigner(1),
      address(Keypair.generate().publicKey.toBase58()),
      SOL_ADDRESS,
      1.0
    );

    expect(fee).toBeNull();
  });

  it('should handle SPL token fee estimation', async () => {
    const fee = await estimateFee(
      createRpc({ getFeeForMessage: thunk({ value: 10000n }) }),
      await testSigner(1),
      address(Keypair.generate().publicKey.toBase58()),
      USDC_MINT,
      100,
      { decimals: 6 }
    );

    expect(fee).toBe(10000);
  });
});

// ============================================================================
// Test 3b: calculateTransferFee
// ============================================================================

describe('calculateTransferFee', () => {
  const TOKEN_2022_MINT = 'BgtC1Uh8UNXYCYd1JVAyyPmYtSBpYvGdgFXFyBjbjTMB';

  /** 1% now, rising to 10% at epoch 999. */
  const feeConfig = {
    __kind: 'TransferFeeConfig' as const,
    olderTransferFee: {
      epoch: 0n,
      transferFeeBasisPoints: 100,
      maximumFee: 1_000_000_000n,
    },
    newerTransferFee: {
      epoch: 999n,
      transferFeeBasisPoints: 1000,
      maximumFee: 1_000_000_000n,
    },
  };

  const rpcForEpoch = (epoch: bigint) =>
    createRpc({
      getAccountInfo: thunk({ value: { owner: TOKEN_2022_PROGRAM_ADDRESS } }),
      getEpochInfo: thunk({ epoch }),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockMint(6, some([feeConfig]));
  });

  it('uses the older fee schedule before the newer one activates', async () => {
    const fee = await calculateTransferFee(rpcForEpoch(10n), TOKEN_2022_MINT, 100);

    // 1% of 100_000_000 base units.
    expect(fee).toBe(1_000_000n);
  });

  it('uses the newer fee schedule once its epoch is reached', async () => {
    const fee = await calculateTransferFee(rpcForEpoch(1000n), TOKEN_2022_MINT, 100);

    // 10% of 100_000_000 base units.
    expect(fee).toBe(10_000_000n);
  });

  it('returns null for a mint owned by the classic token program', async () => {
    const fee = await calculateTransferFee(createRpc(), TOKEN_2022_MINT, 100);

    expect(fee).toBeNull();
  });
});

// ============================================================================
// Test 4: requiresMemo
// ============================================================================

describe('requiresMemo', () => {
  const recipient: Address = address(Keypair.generate().publicKey.toBase58());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false for native SOL', async () => {
    expect(await requiresMemo(createRpc(), recipient, SOL_ADDRESS)).toBe(false);
  });

  it('should return false for null token address', async () => {
    expect(await requiresMemo(createRpc(), recipient, null)).toBe(false);
  });

  it('should return false for undefined token address', async () => {
    expect(await requiresMemo(createRpc(), recipient, undefined)).toBe(false);
  });

  it('should return false for regular SPL token (not Token-2022)', async () => {
    expect(await requiresMemo(createRpc(), recipient, USDC_MINT)).toBe(false);
  });

  it('should return false when the Token-2022 destination account does not exist', async () => {
    vi.mocked(fetchMaybeToken).mockResolvedValue({ exists: false } as never);

    const result = await requiresMemo(
      createRpc({ getAccountInfo: thunk({ value: { owner: TOKEN_2022_PROGRAM_ADDRESS } }) }),
      recipient,
      USDC_MINT
    );

    expect(result).toBe(false);
  });

  it('should report the MemoTransfer extension of a Token-2022 destination account', async () => {
    vi.mocked(fetchMaybeToken).mockResolvedValue({
      exists: true,
      data: {
        extensions: some([{ __kind: 'MemoTransfer', requireIncomingTransferMemos: true }]),
      },
    } as never);

    const result = await requiresMemo(
      createRpc({ getAccountInfo: thunk({ value: { owner: TOKEN_2022_PROGRAM_ADDRESS } }) }),
      recipient,
      USDC_MINT
    );

    expect(result).toBe(true);
  });

  it('should return false if token mint not found', async () => {
    const result = await requiresMemo(
      createRpc({ getAccountInfo: thunk({ value: null }) }),
      recipient,
      USDC_MINT
    );

    expect(result).toBe(false);
  });
});

// ============================================================================
// Test 5: SolanaAccount.validateDestinationAccount
// ============================================================================

/**
 * Stubs `account.getRpc()` so `validateDestinationAccount` (which now reads
 * account info off the kit rpc, not the web3.js connection) resolves the
 * given account info instead of hitting devnet for real.
 */
function stubRpcAccountInfo(
  account: Awaited<ReturnType<typeof createSolanaAccount>>,
  value: { lamports: bigint } | null
) {
  vi.spyOn(account, 'getRpc').mockReturnValue({
    getAccountInfo: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue({ value }),
    }),
  } as unknown as ReturnType<typeof account.getRpc>);
}

describe('SolanaAccount.validateDestinationAccount', () => {
  const network = SOLANA_NETWORKS['solana-devnet'];

  it('should validate a valid on-curve address with funds', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockSolanaApiFunctions,
    });

    stubRpcAccountInfo(account, { lamports: 1_000_000n }); // Has funds

    const validAddress = 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk';
    const result = await account.validateDestinationAccount(validAddress);

    expect(result.type).toBe('SUCCESS');
    expect(result.code).toBe('valid');
    expect(result.addressType).toBe('PUBLIC_KEY');
  });

  it('should validate a PDA (off-curve) address without funds', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockSolanaApiFunctions,
    });

    // Create a PDA address
    const [pdaAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('test-seed')],
      new PublicKey('11111111111111111111111111111111')
    );

    stubRpcAccountInfo(account, null); // No account info

    const result = await account.validateDestinationAccount(pdaAddress.toBase58());

    expect(result.type).toBe('SUCCESS');
    expect(result.code).toBe('off_curve_no_funds');
    expect(result.addressType).toBe('PUBLIC_KEY');
  });

  it('should validate a PDA (off-curve) address with funds', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockSolanaApiFunctions,
    });

    const [pdaAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('test-seed-funded')],
      new PublicKey('11111111111111111111111111111111')
    );

    stubRpcAccountInfo(account, { lamports: 5_000_000n }); // Has funds

    const result = await account.validateDestinationAccount(pdaAddress.toBase58());

    expect(result.type).toBe('SUCCESS');
    expect(result.code).toBe('off_curve_has_funds');
    expect(result.addressType).toBe('PUBLIC_KEY');
  });

  it('should return error for invalid address', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockSolanaApiFunctions,
    });

    const result = await account.validateDestinationAccount('invalid-address-123');

    expect(result.type).toBe('ERROR');
    expect(result.code).toBe('invalid');
  });

  it('should return warning for valid address with no account info', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockSolanaApiFunctions,
    });

    stubRpcAccountInfo(account, null); // No account info

    const validAddress = 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk';
    const result = await account.validateDestinationAccount(validAddress);

    expect(result.type).toBe('WARNING');
    expect(result.code).toBe('no_info');
  });
});

// ============================================================================
// Test 6: SolanaAccount.getBalance
// ============================================================================

describe('SolanaAccount.getBalance', () => {
  const network = SOLANA_NETWORKS['solana-devnet'];

  it('should return SolanaWalletBalance from DI functions', async () => {
    const mockFetchBalance = vi.fn().mockResolvedValue([
      {
        mint: 'So11111111111111111111111111111111111111112',
        amount: 5000000000,
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana',
        uiAmount: 5,
        coingeckoId: 'solana',
        // Server-side enricher attaches pricing alongside the balance.
        price: 150,
        usdBalance: 750,
        priceChange24h: 2.5,
      },
    ]);

    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: {
        ...mockSolanaApiFunctions,
        fetchBalance: mockFetchBalance,
      },
    });

    const balance = await account.getBalance();

    expect(balance).toBeDefined();
    expect(balance.items).toBeDefined();
    expect(Array.isArray(balance.items)).toBe(true);
    expect(balance.items.length).toBe(1);
    expect(balance.items[0].symbol).toBe('SOL');
    expect(balance.usdTotal).toBe(750);
  });

  it('should return empty items when DI returns empty', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockSolanaApiFunctions,
    });

    const balance = await account.getBalance();

    expect(balance).toBeDefined();
    expect(balance.items).toEqual([]);
  });

  it('should handle prices being unavailable', async () => {
    // Server-side enricher passes items through key-clean when no quote
    // is available; the client surfaces usdTotal === 0 in that case.
    const mockFetchBalance = vi.fn().mockResolvedValue([
      {
        mint: 'So11111111111111111111111111111111111111112',
        amount: 1500000000,
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana',
        uiAmount: 1.5,
      },
    ]);

    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: {
        ...mockSolanaApiFunctions,
        fetchBalance: mockFetchBalance,
      },
    });

    const balance = await account.getBalance();

    expect(balance).toBeDefined();
    expect(balance.items.length).toBe(1);
    expect(balance.usdTotal).toBe(0);
  });
});

// ============================================================================
// Who retries
// ============================================================================

describe('retry ownership', () => {
  /**
   * The confirmation wait re-broadcasts these same bytes every couple of
   * seconds, so the node's own retry loop — which runs on a cadence we can
   * neither see nor stop — would be a second, uncoordinated loop on one
   * transaction. Solana's retry guide asks for exactly this pairing: take
   * `maxRetries` to zero and re-broadcast yourself.
   */
  const sendConfigOf = (send: ReturnType<typeof vi.fn>) => send.mock.calls[0][1];

  it('tells the node not to retry the first send', async () => {
    const send = vi.fn().mockReturnValue({ send: async () => 'a-signature' });
    const rpc = createRpc({ sendTransaction: send });
    const signer = await testSigner(1);

    await createTransfer(
      rpc,
      signer,
      address(Keypair.generate().publicKey.toBase58()),
      SOL_ADDRESS,
      1
    );

    expect(sendConfigOf(send)).toMatchObject({ maxRetries: 0n, skipPreflight: false });
  });

  it('returns the signed signature when the send answer is lost, so the wait settles it', async () => {
    const send = vi.fn().mockReturnValue({
      send: async () => {
        throw new Error('fetch failed');
      },
    });
    const rpc = createRpc({ sendTransaction: send });
    const signer = await testSigner(1);

    const result = await createTransfer(
      rpc,
      signer,
      address(Keypair.generate().publicKey.toBase58()),
      SOL_ADDRESS,
      1
    );

    expect(String(result.txId)).toMatch(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/);
    expect(result.wireTransaction).toBeTruthy();
  });

  it('tells the node not to retry a re-broadcast either', async () => {
    const send = vi.fn().mockReturnValue({ send: async () => 'a-signature' });
    const rpc = createRpc({ sendTransaction: send });

    await resendTransaction(rpc, 'already-signed-bytes' as never);

    // Preflight is skipped on the repeat: it passed on the way out.
    expect(sendConfigOf(send)).toMatchObject({ maxRetries: 0n, skipPreflight: true });
  });

  it('never sends at all when the caller only wanted a simulation', async () => {
    const send = vi.fn();
    const rpc = createRpc({
      sendTransaction: send,
      simulateTransaction: vi.fn().mockReturnValue({ send: async () => ({ value: {} }) }),
    });
    const signer = await testSigner(1);

    await createTransfer(
      rpc,
      signer,
      address(Keypair.generate().publicKey.toBase58()),
      SOL_ADDRESS,
      1,
      { simulate: true }
    );

    expect(send).not.toHaveBeenCalled();
  });
});
