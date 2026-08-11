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
} from '@solana/kit';
import type { Address } from '@solana/kit';
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';

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
  estimateFee,
  requiresMemo,
  SOL_ADDRESS
} from './transfer';
import { createSolanaAccount } from './factory';
import { SOLANA_NETWORKS } from './factory';
import type { SolanaRpc } from './networks';

// ============================================================================
// Test Constants
// ============================================================================

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TOKEN_PROGRAM_ADDRESS = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SYSTEM_PROGRAM_ADDRESS = address('11111111111111111111111111111111');
const MEMO_PROGRAM_ADDRESS = address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const BLOCKHASH = 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi';

const mockSolanaApiFunctions = {
  fetchBalance: vi.fn().mockResolvedValue([]),
  fetchTransactions: vi.fn().mockResolvedValue({ transactions: [], oldestSignature: null, hasMore: false }),
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
    getAccountInfo: thunk({ value: { owner: TOKEN_PROGRAM_ADDRESS } }),
    getFeeForMessage: thunk({ value: 5000n }),
    getEpochInfo: thunk({ epoch: 10n }),
    ...overrides,
  } as unknown as SolanaRpc;
}

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
  it('should create valid SOL transaction with a stubbed rpc', async () => {
    const rpc = createRpc();
    const signer = await testSigner(1);
    const recipient = address(Keypair.generate().publicKey.toBase58());

    const transaction = await createSolTransaction(rpc, signer, recipient, 1.5);

    expect(transaction.lifetimeConstraint.blockhash).toBe(BLOCKHASH);
    expect(transaction.feePayer.address).toBe(signer.address);
    expect(transaction.instructions).toHaveLength(1);
    expect(transaction.instructions[0].programAddress).toBe(SYSTEM_PROGRAM_ADDRESS);
    expect(rpc.getLatestBlockhash).toHaveBeenCalledTimes(1);
  });

  it('should handle different amounts correctly', async () => {
    const signer = await testSigner(1);
    const recipient = address(Keypair.generate().publicKey.toBase58());

    const small = await createSolTransaction(createRpc(), signer, recipient, 0.001);
    const large = await createSolTransaction(createRpc(), signer, recipient, 1000);

    // 4-byte discriminator (2) + u64 lamports, little endian.
    expect(Buffer.from(small.instructions[0].data!).toString('hex')).toBe(
      '02000000' + Buffer.from(new BigUint64Array([1_000_000n]).buffer).toString('hex')
    );
    expect(Buffer.from(large.instructions[0].data!).toString('hex')).toBe(
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
    expect(transaction.instructions[0].accounts![0].role).toBe(AccountRole.WRITABLE_SIGNER);
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
    expect(transaction.instructions).toHaveLength(2);
    expect(transaction.instructions[1].programAddress).toBe(TOKEN_PROGRAM_ADDRESS);
    // Transfer instruction: discriminator 3, u64 amount.
    expect(Buffer.from(transaction.instructions[1].data!).toString('hex')).toBe(
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

    const authority = transaction.instructions[1].accounts![2];
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
    expect(transaction.instructions).toHaveLength(3);
    const memoInstruction = transaction.instructions[1];
    expect(memoInstruction.programAddress).toBe(MEMO_PROGRAM_ADDRESS);
    expect(Buffer.from(memoInstruction.data!).toString('utf8')).toBe('Test memo');
    // Regression guard: without an explicit `signers` list the memo carries no
    // accounts at all and is not attributable to the payer.
    expect(memoInstruction.accounts).toHaveLength(1);
    expect(memoInstruction.accounts![0].address).toBe(signer.address);
    expect(memoInstruction.accounts![0].role).toBe(AccountRole.READONLY_SIGNER);
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
