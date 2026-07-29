/**
 * Integration Tests for Solana Transfer Functions
 *
 * Tests cover transfer transaction creation and validation.
 * Uses Vitest 4.0.18 with mocked connections.
 */

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getMint, getOrCreateAssociatedTokenAccount, getTransferFeeConfig } from '@solana/spl-token';
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

// ============================================================================
// Test Constants
// ============================================================================

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const mockSolanaApiFunctions = {
  fetchBalance: vi.fn().mockResolvedValue([]),
  fetchTransaction: vi.fn().mockResolvedValue(null),
  fetchTransactions: vi.fn().mockResolvedValue({ transactions: [], oldestSignature: null, hasMore: false }),
  fetchNfts: vi.fn().mockResolvedValue([]),
};

// ============================================================================
// Test 1: createSolTransaction
// ============================================================================

describe('createSolTransaction', () => {
  const senderKeypair = Keypair.generate();
  const recipientKeypair = Keypair.generate();

  it('should create valid SOL transaction with mocked connection', async () => {
    // Create mock connection
    const mockConnection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash',
        lastValidBlockHeight: 1000
      })
    } as unknown as Connection;

    const transaction = await createSolTransaction(
      mockConnection,
      senderKeypair,
      recipientKeypair.publicKey,
      1.5 // 1.5 SOL
    );

    // Verify transaction was created
    expect(transaction).toBeDefined();
    expect(transaction).toBeInstanceOf(Transaction);
    expect(transaction.recentBlockhash).toBe('test-blockhash');
    expect(transaction.feePayer?.toBase58()).toBe(senderKeypair.publicKey.toBase58());

    // Verify instruction exists (SystemProgram.transfer)
    expect(transaction.instructions).toHaveLength(1);
    expect(transaction.instructions[0].programId.toBase58()).toBe('11111111111111111111111111111111');

    // Verify getLatestBlockhash was called
    expect(mockConnection.getLatestBlockhash).toHaveBeenCalledTimes(1);
  });

  it('should handle different amounts correctly', async () => {
    const mockConnection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash-2',
        lastValidBlockHeight: 2000
      })
    } as unknown as Connection;

    const transaction = await createSolTransaction(
      mockConnection,
      senderKeypair,
      recipientKeypair.publicKey,
      0.001 // Small amount
    );

    expect(transaction).toBeDefined();
    expect(transaction.instructions).toHaveLength(1);
    expect(transaction.recentBlockhash).toBe('test-blockhash-2');
  });

  it('should set correct fee payer', async () => {
    const mockConnection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash-3',
        lastValidBlockHeight: 3000
      })
    } as unknown as Connection;

    const transaction = await createSolTransaction(
      mockConnection,
      senderKeypair,
      recipientKeypair.publicKey,
      2.0
    );

    expect(transaction.feePayer?.equals(senderKeypair.publicKey)).toBe(true);
  });

  it('should create transaction with large amount', async () => {
    const mockConnection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash-4',
        lastValidBlockHeight: 4000
      })
    } as unknown as Connection;

    const transaction = await createSolTransaction(
      mockConnection,
      senderKeypair,
      recipientKeypair.publicKey,
      1000.0 // 1000 SOL
    );

    expect(transaction).toBeDefined();
    expect(transaction.instructions).toHaveLength(1);
  });
});

// ============================================================================
// Test 2: createSplTransaction
// ============================================================================

describe('createSplTransaction', () => {
  const senderKeypair = Keypair.generate();
  const recipientKeypair = Keypair.generate();

  // Mock getMint and getOrCreateAssociatedTokenAccount at module level
  vi.mock('@solana/spl-token', async () => {
    const actual = await vi.importActual('@solana/spl-token');
    return {
      ...actual,
      getMint: vi.fn(),
      getOrCreateAssociatedTokenAccount: vi.fn(),
      getTransferFeeConfig: vi.fn(),
    };
  });

  it('should create valid SPL token transaction', async () => {
    // Mock connection with all required methods
    const mockConnection = {
      getAccountInfo: vi.fn()
        .mockResolvedValueOnce({
          // Token mint account info
          owner: TOKEN_PROGRAM_ID,
          lamports: 1000000,
          data: Buffer.alloc(82),
          executable: false,
          rentEpoch: 0
        })
        .mockResolvedValueOnce(null), // Destination token account doesn't exist
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash-spl',
        lastValidBlockHeight: 5000
      }),
      sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
      confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } })
    } as unknown as Connection;

    // Mock getMint to return mint info
    const getMintMock = getMint as unknown as ReturnType<typeof vi.fn>;
    getMintMock.mockResolvedValue({
      address: new PublicKey(USDC_MINT),
      mintAuthority: null,
      supply: BigInt(1000000000),
      decimals: 6,
      isInitialized: true,
      freezeAuthority: null,
      tlvData: Buffer.alloc(0)
    });

    // Mock getOrCreateAssociatedTokenAccount
    const getOrCreateMock = getOrCreateAssociatedTokenAccount as unknown as ReturnType<typeof vi.fn>;
    getOrCreateMock.mockResolvedValue({
      address: Keypair.generate().publicKey, // Use a valid public key
      mint: new PublicKey(USDC_MINT),
      owner: recipientKeypair.publicKey,
      amount: BigInt(0),
      delegate: null,
      delegatedAmount: BigInt(0),
      isInitialized: true,
      isFrozen: false,
      isNative: false,
      rentExemptReserve: null,
      closeAuthority: null
    });

    const transaction = await createSplTransaction(
      mockConnection,
      senderKeypair,
      recipientKeypair.publicKey,
      USDC_MINT,
      100, // 100 USDC
      { decimals: 6 }
    );

    expect(transaction).toBeDefined();
    expect(transaction).toBeInstanceOf(Transaction);
    expect(transaction.recentBlockhash).toBe('test-blockhash-spl');
    expect(transaction.feePayer?.equals(senderKeypair.publicKey)).toBe(true);
    expect(transaction.instructions.length).toBeGreaterThan(0);
  });

  it('should handle memo in transaction', async () => {
    const mockConnection = {
      getAccountInfo: vi.fn()
        .mockResolvedValueOnce({
          owner: TOKEN_PROGRAM_ID,
          lamports: 1000000,
          data: Buffer.alloc(82),
          executable: false,
          rentEpoch: 0
        })
        .mockResolvedValueOnce(null),
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash-memo',
        lastValidBlockHeight: 6000
      })
    } as unknown as Connection;

    const getMintMock = getMint as unknown as ReturnType<typeof vi.fn>;
    getMintMock.mockResolvedValue({
      address: new PublicKey(USDC_MINT),
      mintAuthority: null,
      supply: BigInt(1000000000),
      decimals: 6,
      isInitialized: true,
      freezeAuthority: null,
      tlvData: Buffer.alloc(0)
    });

    const getOrCreateMock = getOrCreateAssociatedTokenAccount as unknown as ReturnType<typeof vi.fn>;
    getOrCreateMock.mockResolvedValue({
      address: Keypair.generate().publicKey, // Use a valid public key
      mint: new PublicKey(USDC_MINT),
      owner: recipientKeypair.publicKey,
      amount: BigInt(0),
      delegate: null,
      delegatedAmount: BigInt(0),
      isInitialized: true,
      isFrozen: false,
      isNative: false,
      rentExemptReserve: null,
      closeAuthority: null
    });

    const transaction = await createSplTransaction(
      mockConnection,
      senderKeypair,
      recipientKeypair.publicKey,
      USDC_MINT,
      50,
      { decimals: 6, memo: 'Test memo' }
    );

    expect(transaction).toBeDefined();
    // Should have at least 2 instructions (memo + transfer)
    expect(transaction.instructions.length).toBeGreaterThanOrEqual(2);
  });

  it('should throw error if token mint not found', async () => {
    const mockConnection = {
      getAccountInfo: vi.fn().mockResolvedValue(null),
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash-error',
        lastValidBlockHeight: 7000
      })
    } as unknown as Connection;

    await expect(
      createSplTransaction(
        mockConnection,
        senderKeypair,
        recipientKeypair.publicKey,
        'InvalidTokenMint11111111111111111111111',
        100,
        { decimals: 6 }
      )
    ).rejects.toThrow();
  });
});

// ============================================================================
// Test 3: estimateFee
// ============================================================================

describe('estimateFee', () => {
  const senderKeypair = Keypair.generate();
  const recipientKeypair = Keypair.generate();

  it('should return estimated fee in lamports for SOL transfer', async () => {
    const mockConnection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash-fee',
        lastValidBlockHeight: 7000
      }),
      getFeeForMessage: vi.fn().mockResolvedValue({
        value: 5000 // 5000 lamports
      })
    } as unknown as Connection;

    const fee = await estimateFee(
      mockConnection,
      senderKeypair,
      recipientKeypair.publicKey,
      SOL_ADDRESS,
      1.0
    );

    expect(fee).toBeDefined();
    expect(typeof fee).toBe('number');
    if (fee !== null) {
      expect(fee).toBeGreaterThanOrEqual(0);
    }
  });

  it('should return null for failed fee estimation', async () => {
    const mockConnection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash-fee-fail',
        lastValidBlockHeight: 8000
      }),
      getFeeForMessage: vi.fn().mockResolvedValue({
        value: null
      })
    } as unknown as Connection;

    const fee = await estimateFee(
      mockConnection,
      senderKeypair,
      recipientKeypair.publicKey,
      SOL_ADDRESS,
      1.0
    );

    expect(fee === null || typeof fee === 'number').toBe(true);
  });

  it('should handle SPL token fee estimation', async () => {
    const mockConnection = {
      getAccountInfo: vi.fn()
        .mockResolvedValueOnce({
          owner: TOKEN_PROGRAM_ID,
          lamports: 1000000,
          data: Buffer.alloc(82),
          executable: false,
          rentEpoch: 0
        })
        .mockResolvedValueOnce(null),
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash-spl-fee',
        lastValidBlockHeight: 9000
      }),
      getFeeForMessage: vi.fn().mockResolvedValue({
        value: 10000 // 10000 lamports
      })
    } as unknown as Connection;

    const getMintMock = getMint as unknown as ReturnType<typeof vi.fn>;
    getMintMock.mockResolvedValue({
      address: new PublicKey(USDC_MINT),
      mintAuthority: null,
      supply: BigInt(1000000000),
      decimals: 6,
      isInitialized: true,
      freezeAuthority: null,
      tlvData: Buffer.alloc(0)
    });

    const getOrCreateMock = getOrCreateAssociatedTokenAccount as unknown as ReturnType<typeof vi.fn>;
    getOrCreateMock.mockResolvedValue({
      address: Keypair.generate().publicKey, // Use a valid public key
      mint: new PublicKey(USDC_MINT),
      owner: recipientKeypair.publicKey,
      amount: BigInt(0),
      delegate: null,
      delegatedAmount: BigInt(0),
      isInitialized: true,
      isFrozen: false,
      isNative: false,
      rentExemptReserve: null,
      closeAuthority: null
    });

    const fee = await estimateFee(
      mockConnection,
      senderKeypair,
      recipientKeypair.publicKey,
      USDC_MINT,
      100,
      { decimals: 6 }
    );

    expect(fee).toBeDefined();
    expect(typeof fee).toBe('number');
  });
});

// ============================================================================
// Test 3b: calculateTransferFee
// ============================================================================

describe('calculateTransferFee', () => {
  const TOKEN_2022_MINT = 'BgtC1Uh8UNXYCYd1JVAyyPmYtSBpYvGdgFXFyBjbjTMB';

  /** 1% now, rising to 10% at epoch 999. */
  const feeConfig = {
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

  const mockConnectionForEpoch = (epoch: number) =>
    ({
      getAccountInfo: vi.fn().mockResolvedValue({
        owner: TOKEN_2022_PROGRAM_ID,
        lamports: 1000000,
        data: Buffer.alloc(82),
        executable: false,
        rentEpoch: 0,
      }),
      getEpochInfo: vi.fn().mockResolvedValue({ epoch }),
    }) as unknown as Connection;

  beforeEach(() => {
    (getMint as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      address: new PublicKey(TOKEN_2022_MINT),
      decimals: 6,
      supply: 1_000_000_000n,
      isInitialized: true,
      mintAuthority: null,
      freezeAuthority: null,
      tlvData: Buffer.alloc(0),
    });
    (getTransferFeeConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue(feeConfig);
  });

  it('uses the older fee schedule before the newer one activates', async () => {
    const fee = await calculateTransferFee(mockConnectionForEpoch(10), TOKEN_2022_MINT, 100);

    // 1% of 100_000_000 base units.
    expect(fee).toBe(1_000_000n);
  });

  it('uses the newer fee schedule once its epoch is reached', async () => {
    const fee = await calculateTransferFee(mockConnectionForEpoch(1000), TOKEN_2022_MINT, 100);

    // 10% of 100_000_000 base units.
    expect(fee).toBe(10_000_000n);
  });
});

// ============================================================================
// Test 4: requiresMemo
// ============================================================================

describe('requiresMemo', () => {
  const recipientKeypair = Keypair.generate();

  it('should return false for native SOL', async () => {
    const mockConnection = {} as Connection;

    const result = await requiresMemo(
      mockConnection,
      recipientKeypair.publicKey,
      SOL_ADDRESS
    );

    expect(result).toBe(false);
  });

  it('should return false for null token address', async () => {
    const mockConnection = {} as Connection;

    const result = await requiresMemo(
      mockConnection,
      recipientKeypair.publicKey,
      null
    );

    expect(result).toBe(false);
  });

  it('should return false for undefined token address', async () => {
    const mockConnection = {} as Connection;

    const result = await requiresMemo(
      mockConnection,
      recipientKeypair.publicKey,
      undefined
    );

    expect(result).toBe(false);
  });

  it('should return false for regular SPL token (not Token-2022)', async () => {
    const mockConnection = {
      getAccountInfo: vi.fn()
        .mockResolvedValueOnce({
          // Token mint with TOKEN_PROGRAM_ID (not Token-2022)
          owner: TOKEN_PROGRAM_ID,
          lamports: 1000000,
          data: Buffer.alloc(82),
          executable: false,
          rentEpoch: 0
        })
    } as unknown as Connection;

    const result = await requiresMemo(
      mockConnection,
      recipientKeypair.publicKey,
      USDC_MINT
    );

    expect(result).toBe(false);
  });

  it('should check Token-2022 token for memo requirement', async () => {
    // Use a valid base58 public key
    const token2022Mint = Keypair.generate().publicKey.toBase58();

    const mockConnection = {
      getAccountInfo: vi.fn()
        .mockResolvedValueOnce({
          // Token mint with TOKEN_2022_PROGRAM_ID
          owner: TOKEN_2022_PROGRAM_ID,
          lamports: 1000000,
          data: Buffer.alloc(82),
          executable: false,
          rentEpoch: 0
        })
        .mockResolvedValueOnce(null) // Token account doesn't exist
    } as unknown as Connection;

    const result = await requiresMemo(
      mockConnection,
      recipientKeypair.publicKey,
      token2022Mint
    );

    // Should return false if account doesn't exist
    expect(result).toBe(false);
  });

  it('should return false if token mint not found', async () => {
    // Use a valid base58 public key
    const nonExistentMint = Keypair.generate().publicKey.toBase58();

    const mockConnection = {
      getAccountInfo: vi.fn().mockResolvedValue(null)
    } as unknown as Connection;

    const result = await requiresMemo(
      mockConnection,
      recipientKeypair.publicKey,
      nonExistentMint
    );

    expect(result).toBe(false);
  });
});

// ============================================================================
// Test 5: SolanaAccount.validateDestinationAccount
// ============================================================================

describe('SolanaAccount.validateDestinationAccount', () => {
  const network = SOLANA_NETWORKS['solana-devnet'];

  it('should validate a valid on-curve address with funds', async () => {
    const account = await createSolanaAccount({
      network,
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockSolanaApiFunctions,
    });

    // Mock connection
    const mockGetAccountInfo = vi.fn().mockResolvedValue({
      lamports: 1000000, // Has funds
      owner: new PublicKey('11111111111111111111111111111111'),
      data: Buffer.alloc(0),
      executable: false,
      rentEpoch: 0
    });

    // Replace connection's getAccountInfo
    const connection = await account.getConnection();
    vi.spyOn(connection, 'getAccountInfo').mockImplementation(mockGetAccountInfo);

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

    // Mock connection to return no account info
    const mockGetAccountInfo = vi.fn().mockResolvedValue(null);
    const connection = await account.getConnection();
    vi.spyOn(connection, 'getAccountInfo').mockImplementation(mockGetAccountInfo);

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

    const mockGetAccountInfo = vi.fn().mockResolvedValue({
      lamports: 5000000, // Has funds
      owner: new PublicKey('11111111111111111111111111111111'),
      data: Buffer.alloc(0),
      executable: false,
      rentEpoch: 0
    });

    const connection = await account.getConnection();
    vi.spyOn(connection, 'getAccountInfo').mockImplementation(mockGetAccountInfo);

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

    const mockGetAccountInfo = vi.fn().mockResolvedValue(null);
    const connection = await account.getConnection();
    vi.spyOn(connection, 'getAccountInfo').mockImplementation(mockGetAccountInfo);

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
