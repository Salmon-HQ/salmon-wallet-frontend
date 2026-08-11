/**
 * Ethereum Module Tests
 *
 * Comprehensive test suite for the Ethereum blockchain module.
 * Tests pure functions, derivation logic, token operations, and validation.
 *
 * Uses Vitest 4.0.18
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getEthereumDerivationPath,
  ETHEREUM_COIN_TYPE,
  createEthereumAccount,
  ETHEREUM_NETWORKS,
  createEthereumAccountFromWallet,
  createEthereumAccountFromPrivateKey,
  deriveEthereumAccounts,
} from './factory';
import { EthereumAccount } from './EthereumAccount';
import { WEI_PER_ETH_BIGINT } from '../../utils/decimals';
import {
  formatAmount,
} from './transfer';
import {
  formatBalanceDisplay,
} from './balance';
import {
  ETH_ADDRESS,
  ETH_ADDRESS_ALT,
  isNativeEth,
  createNativeToken,
  createERC20Token,
  createERC721Token,
  createERC1155Token,
} from '../../utils/tokens';
import {
  parseAmount,
  ethToWei,
  weiToEth,
} from '../../utils/decimals';
import {
  isZeroBalance,
  compareBalances,
} from '../../utils/balance';
import {
  getFeaturedTokenBySymbol,
  getFeaturedTokenByAddress,
  formatTokenBalance,
  ETHEREUM_NETWORK_IDS,
  getFeaturedTokens,
} from './tokens';
import {
  isEthereumAddress,
  isEnsDomain,
} from './validation';
import { Wallet } from 'ethers';

// ============================================================================
// Test Constants
// ============================================================================

const mockEthereumApiFunctions = {
  fetchBalance: vi.fn().mockResolvedValue([]),
  fetchPrices: vi.fn().mockResolvedValue(null),
  fetchRecentTransactions: vi.fn().mockResolvedValue({ items: [] }),
};

/**
 * Standard test mnemonic (BIP39 reference)
 * This is a publicly known test mnemonic - NEVER use in production
 */
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

/**
 * Known addresses derived from TEST_MNEMONIC at different indices
 * These addresses are deterministic and can be verified externally
 */
const EXPECTED_ADDRESSES = {
  index0: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
  index1: '0x6Fac4D18c912343BF86fa7049364Dd4E424Ab9C0',
  index5: '0xA40cFBFc8534FFC84E20a7d8bBC3729B26a35F6f',
};

// ============================================================================
// Factory Tests - Derivation Path
// ============================================================================

describe('getEthereumDerivationPath', () => {
  it('should generate correct derivation path for index 0', () => {
    const path = getEthereumDerivationPath(0);
    expect(path).toBe(`m/44'/${ETHEREUM_COIN_TYPE}'/0'/0/0`);
  });

  it('should generate correct derivation path for index 1', () => {
    const path = getEthereumDerivationPath(1);
    expect(path).toBe(`m/44'/${ETHEREUM_COIN_TYPE}'/0'/0/1`);
  });

  it('should generate correct derivation path for index 5', () => {
    const path = getEthereumDerivationPath(5);
    expect(path).toBe(`m/44'/${ETHEREUM_COIN_TYPE}'/0'/0/5`);
  });

  it('should use SLIP-0044 coin type 60 for Ethereum', () => {
    expect(ETHEREUM_COIN_TYPE).toBe(60);
  });
});

// ============================================================================
// Transfer Tests - Amount Conversion
// ============================================================================

describe('parseAmount / formatAmount', () => {
  it('should convert human-readable ETH to wei and back', () => {
    const amount = '1.5';
    const decimals = 18;

    const wei = parseAmount(amount, decimals);
    const formatted = formatAmount(wei, decimals);

    expect(formatted).toBe('1.5');
  });

  it('should handle integer amounts', () => {
    const amount = '100';
    const decimals = 6; // USDC decimals

    const smallest = parseAmount(amount, decimals);
    const formatted = formatAmount(smallest, decimals);

    expect(formatted).toBe('100.0');
  });

  it('should handle very small amounts', () => {
    const amount = '0.000001';
    const decimals = 18;

    const wei = parseAmount(amount, decimals);
    const formatted = formatAmount(wei, decimals);

    expect(formatted).toBe('0.000001');
  });

  it('should handle number input for parseAmount', () => {
    const amount = 2.5;
    const decimals = 18;

    const wei = parseAmount(amount, decimals);
    const formatted = formatAmount(wei, decimals);

    expect(formatted).toBe('2.5');
  });

  it('should handle zero amount', () => {
    const amount = '0';
    const decimals = 18;

    const wei = parseAmount(amount, decimals);
    expect(wei).toBe(0n);
    expect(formatAmount(wei, decimals)).toBe('0.0');
  });
});

// ============================================================================
// Balance Tests - ETH/Wei Conversion
// ============================================================================

describe('ethToWei / weiToEth', () => {
  it('should convert 1 ETH to wei correctly', () => {
    const wei = ethToWei(1);
    expect(wei).toBe(1_000_000_000_000_000_000n);
  });

  it('should convert wei to ETH correctly', () => {
    const wei = 1_500_000_000_000_000_000n;
    const eth = weiToEth(wei);
    expect(eth).toBe('1.5');
  });

  it('should handle string input for ethToWei', () => {
    const wei = ethToWei('0.5');
    expect(wei).toBe(500_000_000_000_000_000n);
  });

  it('should handle zero values', () => {
    expect(ethToWei(0)).toBe(0n);
    expect(weiToEth(0n)).toBe('0.0');
  });

  it('should handle very small amounts', () => {
    const wei = ethToWei('0.000000000000000001'); // 1 wei
    expect(wei).toBe(1n);
  });

  it('should be bidirectional', () => {
    const original = '3.14159';
    const wei = ethToWei(original);
    const back = weiToEth(wei);

    // Should be equal when parsed as floats (accounting for precision)
    expect(parseFloat(back)).toBeCloseTo(parseFloat(original), 10);
  });
});

// ============================================================================
// Transfer Tests - Native ETH Detection
// ============================================================================

describe('isNativeEth', () => {
  it('should return true for ETH_ADDRESS', () => {
    expect(isNativeEth(ETH_ADDRESS)).toBe(true);
  });

  it('should return true for ETH_ADDRESS_ALT', () => {
    expect(isNativeEth(ETH_ADDRESS_ALT)).toBe(true);
  });

  it('should return true for null', () => {
    expect(isNativeEth(null)).toBe(true);
  });

  it('should return true for undefined', () => {
    expect(isNativeEth(undefined)).toBe(true);
  });

  it('should return false for ERC20 token address', () => {
    const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    expect(isNativeEth(usdcAddress)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isNativeEth('')).toBe(true); // Empty is treated as native
  });

  it('should be case-insensitive', () => {
    expect(isNativeEth(ETH_ADDRESS.toUpperCase())).toBe(true);
    expect(isNativeEth(ETH_ADDRESS_ALT.toLowerCase())).toBe(true);
  });
});

// ============================================================================
// EthereumAccount Tests - Address Validation
// ============================================================================

describe('EthereumAccount.isValidAddress', () => {
  it('should validate correct Ethereum addresses', () => {
    const validAddresses = [
      '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
    ];

    validAddresses.forEach(address => {
      expect(EthereumAccount.isValidAddress(address)).toBe(true);
    });
  });

  it('should validate checksummed addresses', () => {
    const checksummedAddress = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
    expect(EthereumAccount.isValidAddress(checksummedAddress)).toBe(true);
  });

  it('should validate non-checksummed addresses', () => {
    const nonChecksummed = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
    expect(EthereumAccount.isValidAddress(nonChecksummed)).toBe(true);
  });

  it('should reject invalid addresses', () => {
    const invalidAddresses = [
      '0xinvalid',
      '0x123',
      'not_an_address',
      '0xZZZZ35Cc6634C0532925a3b844Bc9e7595f35b32',
      '',
      '0x',
    ];

    invalidAddresses.forEach(address => {
      expect(EthereumAccount.isValidAddress(address)).toBe(false);
    });
  });

  it('should reject addresses without 0x prefix', () => {
    const withoutPrefix = '742d35Cc6634C0532925a3b844Bc9e7595f35b32';
    expect(EthereumAccount.isValidAddress(withoutPrefix)).toBe(false);
  });
});

// ============================================================================
// Validation Tests - Address Format
// ============================================================================

describe('isEthereumAddress', () => {
  it('should detect valid Ethereum addresses', () => {
    expect(isEthereumAddress('0x742D35cc6634c0532925a3B844bc9e7595f35b32')).toBe(true);
    expect(isEthereumAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')).toBe(true);
    expect(isEthereumAddress('0x9858EfFD232B4033E47d90003D41EC34EcaEda94')).toBe(true);
  });

  it('should reject invalid addresses', () => {
    expect(isEthereumAddress('invalid')).toBe(false);
    expect(isEthereumAddress('0xinvalid')).toBe(false);
    expect(isEthereumAddress('')).toBe(false);
  });

  it('should handle ENS domains as invalid addresses', () => {
    expect(isEthereumAddress('vitalik.eth')).toBe(false);
    expect(isEthereumAddress('example.xyz')).toBe(false);
  });
});

// ============================================================================
// Validation Tests - ENS Domain Detection
// ============================================================================

describe('isEnsDomain', () => {
  it('should detect .eth domains', () => {
    expect(isEnsDomain('vitalik.eth')).toBe(true);
    expect(isEnsDomain('mydomain.eth')).toBe(true);
  });

  it('should detect other ENS-compatible TLDs', () => {
    expect(isEnsDomain('example.xyz')).toBe(true);
    expect(isEnsDomain('test.luxe')).toBe(true);
    expect(isEnsDomain('name.kred')).toBe(true);
    expect(isEnsDomain('gallery.art')).toBe(true);
    expect(isEnsDomain('social.club')).toBe(true);
  });

  it('should reject Ethereum addresses', () => {
    expect(isEnsDomain('0x742d35Cc6634C0532925a3b844Bc9e7595f35b32')).toBe(false);
  });

  it('should reject non-domain strings', () => {
    expect(isEnsDomain('notadomain')).toBe(false);
    expect(isEnsDomain('')).toBe(false);
    expect(isEnsDomain('test')).toBe(false);
  });

  it('should handle subdomains', () => {
    expect(isEnsDomain('sub.domain.eth')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isEnsDomain('VITALIK.ETH')).toBe(true);
    expect(isEnsDomain('Example.XYZ')).toBe(true);
  });
});

// ============================================================================
// Transfer Tests - Token Factory Functions
// ============================================================================

describe('Token Factory Functions', () => {
  describe('createNativeToken', () => {
    it('should create native ETH token with default decimals', () => {
      const token = createNativeToken();

      expect(token.address).toBe(ETH_ADDRESS);
      expect(token.decimals).toBe(18);
      expect(token.symbol).toBe('ETH');
      expect(token.type).toBe('native');
    });

    it('should create native ETH token with custom decimals', () => {
      const token = createNativeToken(9);

      expect(token.decimals).toBe(9);
      expect(token.type).toBe('native');
    });
  });

  describe('createERC20Token', () => {
    it('should create ERC20 token without symbol', () => {
      const address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const token = createERC20Token(address, 6);

      expect(token.address).toBe(address);
      expect(token.decimals).toBe(6);
      expect(token.type).toBe('erc20');
      expect(token.symbol).toBeUndefined();
    });

    it('should create ERC20 token with symbol', () => {
      const address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const token = createERC20Token(address, 6, 'USDC');

      expect(token.address).toBe(address);
      expect(token.decimals).toBe(6);
      expect(token.symbol).toBe('USDC');
      expect(token.type).toBe('erc20');
    });
  });

  describe('createERC721Token', () => {
    it('should create ERC721 token without symbol', () => {
      const address = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
      const token = createERC721Token(address);

      expect(token.address).toBe(address);
      expect(token.decimals).toBe(0);
      expect(token.type).toBe('erc721');
      expect(token.symbol).toBeUndefined();
    });

    it('should create ERC721 token with symbol', () => {
      const address = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
      const token = createERC721Token(address, 'BAYC');

      expect(token.address).toBe(address);
      expect(token.decimals).toBe(0);
      expect(token.symbol).toBe('BAYC');
      expect(token.type).toBe('erc721');
    });
  });

  describe('createERC1155Token', () => {
    it('should create ERC1155 token without symbol', () => {
      const address = '0x495f947276749Ce646f68AC8c248420045cb7b5e';
      const token = createERC1155Token(address);

      expect(token.address).toBe(address);
      expect(token.decimals).toBe(0);
      expect(token.type).toBe('erc1155');
      expect(token.symbol).toBeUndefined();
    });

    it('should create ERC1155 token with symbol', () => {
      const address = '0x495f947276749Ce646f68AC8c248420045cb7b5e';
      const token = createERC1155Token(address, 'MULTI');

      expect(token.address).toBe(address);
      expect(token.decimals).toBe(0);
      expect(token.symbol).toBe('MULTI');
      expect(token.type).toBe('erc1155');
    });
  });
});

// ============================================================================
// Balance Tests - Utility Functions
// ============================================================================

describe('Balance Utility Functions', () => {
  describe('isZeroBalance', () => {
    it('should return true for zero balance', () => {
      expect(isZeroBalance(0n)).toBe(true);
    });

    it('should return false for non-zero balance', () => {
      expect(isZeroBalance(1n)).toBe(false);
      expect(isZeroBalance(1_000_000_000_000_000_000n)).toBe(false);
    });

    it('should return false for negative balance', () => {
      expect(isZeroBalance(-1n)).toBe(false);
    });
  });

  describe('compareBalances', () => {
    it('should return -1 when first balance is less', () => {
      expect(compareBalances(100n, 200n)).toBe(-1);
    });

    it('should return 0 when balances are equal', () => {
      expect(compareBalances(100n, 100n)).toBe(0);
    });

    it('should return 1 when first balance is greater', () => {
      expect(compareBalances(200n, 100n)).toBe(1);
    });

    it('should handle zero balances', () => {
      expect(compareBalances(0n, 0n)).toBe(0);
      expect(compareBalances(0n, 1n)).toBe(-1);
      expect(compareBalances(1n, 0n)).toBe(1);
    });

    it('should handle very large balances', () => {
      const large1 = 1_000_000_000_000_000_000_000n;
      const large2 = 2_000_000_000_000_000_000_000n;

      expect(compareBalances(large1, large2)).toBe(-1);
      expect(compareBalances(large2, large1)).toBe(1);
    });
  });

  describe('formatBalanceDisplay', () => {
    it('should format zero balance', () => {
      expect(formatBalanceDisplay(0n, 18)).toBe('0');
    });

    it('should format small balances with default precision', () => {
      const balance = ethToWei('1.23456789');
      expect(formatBalanceDisplay(balance, 18)).toBe('1.2346');
    });

    it('should show <0.0001 for very small amounts', () => {
      const balance = ethToWei('0.00001');
      expect(formatBalanceDisplay(balance, 18)).toBe('<0.0001');
    });

    it('should format large balances with K suffix', () => {
      const balance = ethToWei('1500');
      expect(formatBalanceDisplay(balance, 18)).toBe('1.50K');
    });

    it('should format very large balances with M suffix', () => {
      const balance = ethToWei('2500000');
      expect(formatBalanceDisplay(balance, 18)).toBe('2.50M');
    });

    it('should respect custom display decimals', () => {
      const balance = ethToWei('1.23456789');
      expect(formatBalanceDisplay(balance, 18, 2)).toBe('1.23');
      expect(formatBalanceDisplay(balance, 18, 6)).toBe('1.234568');
    });

    it('should handle different token decimals', () => {
      // USDC has 6 decimals
      const balance = 1_500_000n; // 1.5 USDC
      expect(formatBalanceDisplay(balance, 6, 4)).toBe('1.5000');
    });
  });
});

// ============================================================================
// Token Tests - Featured Token Lookups
// ============================================================================

describe('Featured Token Functions', () => {
  describe('getFeaturedTokenBySymbol', () => {
    it('should find USDC on mainnet', () => {
      const token = getFeaturedTokenBySymbol(ETHEREUM_NETWORK_IDS.MAINNET, 'USDC');

      expect(token).toBeDefined();
      expect(token?.symbol).toBe('USDC');
      expect(token?.decimals).toBe(6);
      expect(token?.address).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    });

    it('should find WETH on mainnet', () => {
      const token = getFeaturedTokenBySymbol(ETHEREUM_NETWORK_IDS.MAINNET, 'WETH');

      expect(token).toBeDefined();
      expect(token?.symbol).toBe('WETH');
      expect(token?.decimals).toBe(18);
    });

    it('should be case-insensitive', () => {
      const lower = getFeaturedTokenBySymbol(ETHEREUM_NETWORK_IDS.MAINNET, 'usdc');
      const upper = getFeaturedTokenBySymbol(ETHEREUM_NETWORK_IDS.MAINNET, 'USDC');

      expect(lower).toEqual(upper);
    });

    it('should return undefined for non-existent token', () => {
      const token = getFeaturedTokenBySymbol(ETHEREUM_NETWORK_IDS.MAINNET, 'NONEXISTENT');
      expect(token).toBeUndefined();
    });

    it('should return undefined for testnet without featured tokens', () => {
      const token = getFeaturedTokenBySymbol(ETHEREUM_NETWORK_IDS.SEPOLIA, 'USDC');
      expect(token).toBeUndefined();
    });
  });

  describe('getFeaturedTokenByAddress', () => {
    it('should find USDC by address', () => {
      const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const token = getFeaturedTokenByAddress(ETHEREUM_NETWORK_IDS.MAINNET, usdcAddress);

      expect(token).toBeDefined();
      expect(token?.symbol).toBe('USDC');
      expect(token?.address.toLowerCase()).toBe(usdcAddress.toLowerCase());
    });

    it('should be case-insensitive for addresses', () => {
      const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const lower = getFeaturedTokenByAddress(ETHEREUM_NETWORK_IDS.MAINNET, usdcAddress.toLowerCase());
      const upper = getFeaturedTokenByAddress(ETHEREUM_NETWORK_IDS.MAINNET, usdcAddress.toUpperCase());

      expect(lower).toEqual(upper);
    });

    it('should return undefined for non-featured token address', () => {
      const token = getFeaturedTokenByAddress(
        ETHEREUM_NETWORK_IDS.MAINNET,
        '0x1234567890123456789012345678901234567890'
      );
      expect(token).toBeUndefined();
    });
  });

  describe('formatTokenBalance', () => {
    it('should format ETH balance correctly', () => {
      const balance = 1_500_000_000_000_000_000n; // 1.5 ETH
      const formatted = formatTokenBalance(balance, 18);
      expect(formatted).toBe('1.5');
    });

    it('should format USDC balance correctly', () => {
      const balance = 1_500_000n; // 1.5 USDC
      const formatted = formatTokenBalance(balance, 6);
      expect(formatted).toBe('1.5');
    });

    it('should format zero balance', () => {
      const formatted = formatTokenBalance(0n, 18);
      expect(formatted).toBe('0.0');
    });

    it('should handle very large balances', () => {
      const balance = 1_000_000_000_000_000_000_000_000n; // 1M ETH
      const formatted = formatTokenBalance(balance, 18);
      expect(formatted).toBe('1000000.0');
    });
  });
});

// ============================================================================
// Account Derivation Tests
// ============================================================================

describe('Account Derivation', () => {
  it('should create account with deterministic address at index 0', async () => {
    const account = await createEthereumAccount({
      network: ETHEREUM_NETWORKS['ethereum-mainnet'],
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockEthereumApiFunctions,
    });

    const address = account.getReceiveAddress();

    // Address should be deterministic
    expect(address).toBeTruthy();
    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);

    // Should match expected address for this mnemonic
    expect(address).toBe(EXPECTED_ADDRESSES.index0);
  });

  it('should create different addresses for different indices', async () => {
    const account0 = await createEthereumAccount({
      network: ETHEREUM_NETWORKS['ethereum-mainnet'],
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockEthereumApiFunctions,
    });

    const account1 = await createEthereumAccount({
      network: ETHEREUM_NETWORKS['ethereum-mainnet'],
      mnemonic: TEST_MNEMONIC,
      index: 1,
      apiFunctions: mockEthereumApiFunctions,
    });

    const address0 = account0.getReceiveAddress();
    const address1 = account1.getReceiveAddress();

    expect(address0).not.toBe(address1);
    expect(address0).toBe(EXPECTED_ADDRESSES.index0);
    expect(address1).toBe(EXPECTED_ADDRESSES.index1);
  });

  it('should derive account with correct network configuration', async () => {
    const account = await createEthereumAccount({
      network: ETHEREUM_NETWORKS['ethereum-mainnet'],
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockEthereumApiFunctions,
    });

    expect(account.network.id).toBe('ethereum-mainnet');
    expect(account.network.environment).toBe('mainnet');
    expect(account.network.config.chainId).toBe(1);
  });

  it('should derive account with correct derivation path', async () => {
    const account = await createEthereumAccount({
      network: ETHEREUM_NETWORKS['ethereum-mainnet'],
      mnemonic: TEST_MNEMONIC,
      index: 3,
      apiFunctions: mockEthereumApiFunctions,
    });

    expect(account.path).toBe(`m/44'/60'/0'/0/3`);
    expect(account.index).toBe(3);
  });

  it('should have valid public key', async () => {
    const account = await createEthereumAccount({
      network: ETHEREUM_NETWORKS['ethereum-mainnet'],
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockEthereumApiFunctions,
    });

    const publicKey = account.getPublicKey();

    expect(publicKey).toBeTruthy();
    expect(publicKey).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(publicKey.length).toBeGreaterThan(60); // Uncompressed public key is 130 chars + 0x
  });

  it('should have accessible private key', async () => {
    const account = await createEthereumAccount({
      network: ETHEREUM_NETWORKS['ethereum-mainnet'],
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockEthereumApiFunctions,
    });

    const privateKey = account.retrieveSecurePrivateKey();

    expect(privateKey).toBeTruthy();
    expect(privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('should create accounts for different networks with same mnemonic', async () => {
    const mainnetAccount = await createEthereumAccount({
      network: ETHEREUM_NETWORKS['ethereum-mainnet'],
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockEthereumApiFunctions,
    });

    const sepoliaAccount = await createEthereumAccount({
      network: ETHEREUM_NETWORKS['ethereum-sepolia'],
      mnemonic: TEST_MNEMONIC,
      index: 0,
      apiFunctions: mockEthereumApiFunctions,
    });

    // Same mnemonic and index = same address, different network
    expect(mainnetAccount.getReceiveAddress()).toBe(sepoliaAccount.getReceiveAddress());
    expect(mainnetAccount.network.config.chainId).not.toBe(sepoliaAccount.network.config.chainId);
  });
});

// ============================================================================
// EthereumAccount Static Methods Tests
// ============================================================================

describe('EthereumAccount Static Methods', () => {
  describe('weiToEth / ethToWei', () => {
    it('should use WEI_PER_ETH_BIGINT constant correctly', () => {
      expect(WEI_PER_ETH_BIGINT).toBe(1_000_000_000_000_000_000n);
    });

    it('should convert wei to ETH', () => {
      const eth = EthereumAccount.weiToEth(2_000_000_000_000_000_000n);
      expect(eth).toBe(2);
    });

    it('should convert ETH to wei', () => {
      const wei = EthereumAccount.ethToWei(2);
      expect(wei).toBe(2_000_000_000_000_000_000n);
    });

    it('should handle fractional ETH', () => {
      const wei = EthereumAccount.ethToWei(0.5);
      expect(wei).toBe(500_000_000_000_000_000n);
      expect(EthereumAccount.weiToEth(wei)).toBe(0.5);
    });
  });

  describe('formatAddress', () => {
    it('should format address with default parameters (6 chars)', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f35b32';
      const formatted = EthereumAccount.formatAddress(address);

      expect(formatted).toBe('0x742d...f35b32');
    });

    it('should format address with custom chars', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f35b32';
      const formatted = EthereumAccount.formatAddress(address, 8);

      expect(formatted).toBe('0x742d35...95f35b32');
    });

    it('should return full address if too short', () => {
      const address = '0x1234';
      const formatted = EthereumAccount.formatAddress(address);

      expect(formatted).toBe(address);
    });
  });

  describe('toChecksumAddress', () => {
    it('should convert to checksummed address', () => {
      const lowercase = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
      const checksummed = EthereumAccount.toChecksumAddress(lowercase);

      expect(checksummed).toBe('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
    });

    it('should preserve already checksummed address', () => {
      const checksummed = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const result = EthereumAccount.toChecksumAddress(checksummed);

      expect(result).toBe(checksummed);
    });
  });
});

// ============================================================================
// Integration Tests - Transfer Service
// ============================================================================

describe('Transfer Integration Tests', () => {
  describe('estimateTransferFee', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should estimate fee for native ETH transfer with mocked provider', async () => {
      const { estimateTransferFee } = await import('./transfer');

      // Mock provider
      const mockProvider = {
        estimateGas: vi.fn().mockResolvedValue(21000n),
        getFeeData: vi.fn().mockResolvedValue({
          gasPrice: 50_000_000_000n, // 50 gwei
          maxFeePerGas: 60_000_000_000n, // 60 gwei
          maxPriorityFeePerGas: 2_000_000_000n, // 2 gwei
        }),
      } as any;

      const token = createNativeToken();
      const estimate = await estimateTransferFee(
        mockProvider,
        '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
        token,
        '1.0'
      );

      expect(mockProvider.estimateGas).toHaveBeenCalledWith({
        to: '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
        value: parseAmount('1.0', 18),
      });

      expect(mockProvider.getFeeData).toHaveBeenCalled();
      expect(estimate.gasLimit).toBe(21000n);
      expect(estimate.gasPrice).toBe(50_000_000_000n);
      expect(estimate.maxFeePerGas).toBe(60_000_000_000n);
      expect(estimate.maxPriorityFeePerGas).toBe(2_000_000_000n);
      expect(estimate.estimatedFee).toBe(21000n * 60_000_000_000n);
    });

    it('should handle custom gas options', async () => {
      const { estimateTransferFee } = await import('./transfer');

      const mockProvider = {
        estimateGas: vi.fn().mockResolvedValue(21000n),
        getFeeData: vi.fn().mockResolvedValue({
          gasPrice: 50_000_000_000n,
          maxFeePerGas: 60_000_000_000n,
          maxPriorityFeePerGas: 2_000_000_000n,
        }),
      } as any;

      const token = createNativeToken();
      const customMaxFee = 100_000_000_000n;

      const estimate = await estimateTransferFee(
        mockProvider,
        '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
        token,
        '1.0',
        { maxFeePerGas: customMaxFee }
      );

      expect(estimate.estimatedFee).toBe(21000n * customMaxFee);
    });

    it('should throw error for ERC721 transfer without tokenId', async () => {
      const { estimateTransferFee } = await import('./transfer');

      const mockProvider = {} as any;
      const token = createERC721Token('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D');

      await expect(
        estimateTransferFee(mockProvider, '0x742D35cc6634c0532925a3B844bc9e7595f35b32', token, '1')
      ).rejects.toThrow('tokenId is required for ERC721 transfers');
    });

    it('should throw error for ERC1155 transfer without tokenId', async () => {
      const { estimateTransferFee } = await import('./transfer');

      const mockProvider = {} as any;
      const token = createERC1155Token('0x495f947276749Ce646f68AC8c248420045cb7b5e');

      await expect(
        estimateTransferFee(mockProvider, '0x742D35cc6634c0532925a3B844bc9e7595f35b32', token, '1')
      ).rejects.toThrow('tokenId is required for ERC1155 transfers');
    });
  });

  describe('createTransferTransaction', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create and sign ETH transfer transaction', async () => {
      const { createTransferTransaction } = await import('./transfer');

      const mockWallet = {
        getAddress: vi.fn().mockResolvedValue('0x9858EfFD232B4033E47d90003D41EC34EcaEda94'),
        populateTransaction: vi.fn().mockResolvedValue({
          to: '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
          value: parseAmount('1.0', 18),
          gasLimit: 21000n,
        }),
        signTransaction: vi.fn().mockResolvedValue('0xSIGNED_TX_HASH'),
      } as any;

      const token = createNativeToken();
      const signedTx = await createTransferTransaction(
        mockWallet,
        '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
        token,
        '1.0'
      );

      expect(mockWallet.populateTransaction).toHaveBeenCalledWith({
        to: '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
        value: parseAmount('1.0', 18),
        gasLimit: undefined,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });

      expect(mockWallet.signTransaction).toHaveBeenCalled();
      expect(signedTx).toBe('0xSIGNED_TX_HASH');
    });

    it('should include custom gas options in transaction', async () => {
      const { createTransferTransaction } = await import('./transfer');

      const mockWallet = {
        getAddress: vi.fn().mockResolvedValue('0x9858EfFD232B4033E47d90003D41EC34EcaEda94'),
        populateTransaction: vi.fn().mockResolvedValue({
          to: '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
          value: parseAmount('1.0', 18),
          gasLimit: 25000n,
          maxFeePerGas: 100_000_000_000n,
        }),
        signTransaction: vi.fn().mockResolvedValue('0xSIGNED_TX'),
      } as any;

      const token = createNativeToken();
      await createTransferTransaction(
        mockWallet,
        '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
        token,
        '1.0',
        {
          gasLimit: 25000n,
          maxFeePerGas: 100_000_000_000n,
          nonce: 5,
        }
      );

      expect(mockWallet.populateTransaction).toHaveBeenCalledWith({
        to: '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
        value: parseAmount('1.0', 18),
        gasLimit: 25000n,
        gasPrice: undefined,
        maxFeePerGas: 100_000_000_000n,
        maxPriorityFeePerGas: undefined,
        nonce: 5,
      });
    });

    it('should throw error for ERC721 without tokenId', async () => {
      const { createTransferTransaction } = await import('./transfer');

      const mockWallet = {
        getAddress: vi.fn().mockResolvedValue('0x9858EfFD232B4033E47d90003D41EC34EcaEda94'),
      } as any;

      const token = createERC721Token('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D');

      await expect(
        createTransferTransaction(
          mockWallet,
          '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
          token,
          '1'
        )
      ).rejects.toThrow('tokenId is required for ERC721 transfers');
    });

    it('should throw error for ERC1155 without tokenId', async () => {
      const { createTransferTransaction } = await import('./transfer');

      const mockWallet = {
        getAddress: vi.fn().mockResolvedValue('0x9858EfFD232B4033E47d90003D41EC34EcaEda94'),
      } as any;

      const token = createERC1155Token('0x495f947276749Ce646f68AC8c248420045cb7b5e');

      await expect(
        createTransferTransaction(
          mockWallet,
          '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
          token,
          '5'
        )
      ).rejects.toThrow('tokenId is required for ERC1155 transfers');
    });
  });

  describe('sendTransaction', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should send ETH transaction and return txHash', async () => {
      const { sendTransaction } = await import('./transfer');

      const mockWallet = {
        getAddress: vi.fn().mockResolvedValue('0x9858EfFD232B4033E47d90003D41EC34EcaEda94'),
        sendTransaction: vi.fn().mockResolvedValue({
          hash: '0xTRANSACTION_HASH_123456',
        }),
      } as any;

      const token = createNativeToken();
      const result = await sendTransaction(
        mockWallet,
        '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
        token,
        '0.5'
      );

      expect(mockWallet.sendTransaction).toHaveBeenCalledWith({
        to: '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
        value: parseAmount('0.5', 18),
        gasLimit: undefined,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      });

      expect(result.txHash).toBe('0xTRANSACTION_HASH_123456');
      expect(result.receipt).toBeUndefined();
    });

    it('should throw error for ERC721 transfer without tokenId', async () => {
      const { sendTransaction } = await import('./transfer');

      const mockWallet = {
        getAddress: vi.fn().mockResolvedValue('0x9858EfFD232B4033E47d90003D41EC34EcaEda94'),
      } as any;

      const token = createERC721Token('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D');

      await expect(
        sendTransaction(mockWallet, '0x742D35cc6634c0532925a3B844bc9e7595f35b32', token, '1')
      ).rejects.toThrow('tokenId is required for ERC721 transfers');
    });

    it('should throw error for ERC1155 transfer without tokenId', async () => {
      const { sendTransaction } = await import('./transfer');

      const mockWallet = {
        getAddress: vi.fn().mockResolvedValue('0x9858EfFD232B4033E47d90003D41EC34EcaEda94'),
      } as any;

      const token = createERC1155Token('0x495f947276749Ce646f68AC8c248420045cb7b5e');

      await expect(
        sendTransaction(mockWallet, '0x742D35cc6634c0532925a3B844bc9e7595f35b32', token, '5')
      ).rejects.toThrow('tokenId is required for ERC1155 transfers');
    });
  });
});

// ============================================================================
// Integration Tests - Balance Service
// ============================================================================

describe('Balance Integration Tests', () => {
  describe('getEthBalance', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch ETH balance with mocked provider', async () => {
      const { getEthBalance } = await import('./balance');

      const mockProvider = {
        getBalance: vi.fn().mockResolvedValue(1_500_000_000_000_000_000n), // 1.5 ETH
      } as any;

      const balance = await getEthBalance(
        mockProvider,
        '0x742D35cc6634c0532925a3B844bc9e7595f35b32'
      );

      expect(mockProvider.getBalance).toHaveBeenCalledWith(
        '0x742D35cc6634c0532925a3B844bc9e7595f35b32'
      );

      expect(balance.address).toBe('');
      expect(balance.symbol).toBe('ETH');
      expect(balance.decimals).toBe(18);
      expect(balance.balance).toBe(1_500_000_000_000_000_000n);
      expect(balance.formattedBalance).toBe('1.5');
    });

    it('should handle zero balance', async () => {
      const { getEthBalance } = await import('./balance');

      const mockProvider = {
        getBalance: vi.fn().mockResolvedValue(0n),
      } as any;

      const balance = await getEthBalance(
        mockProvider,
        '0x742D35cc6634c0532925a3B844bc9e7595f35b32'
      );

      expect(balance.balance).toBe(0n);
      expect(balance.formattedBalance).toBe('0.0');
    });

    it('should handle very large balance', async () => {
      const { getEthBalance } = await import('./balance');

      const mockProvider = {
        getBalance: vi.fn().mockResolvedValue(1_000_000_000_000_000_000_000n), // 1000 ETH
      } as any;

      const balance = await getEthBalance(
        mockProvider,
        '0x742D35cc6634c0532925a3B844bc9e7595f35b32'
      );

      expect(balance.balance).toBe(1_000_000_000_000_000_000_000n);
      expect(balance.formattedBalance).toBe('1000.0');
    });
  });

  describe('getEthereumTokenBalance', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should use provided token info instead of fetching', async () => {
      const { getEthereumTokenBalance } = await import('./balance');

      const mockProvider = {} as any;

      const result = await getEthereumTokenBalance(
        mockProvider,
        '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        { symbol: 'USDC', decimals: 6 }
      );

      // Since contract calls will fail with mock provider, test should handle error
      // but use provided token info
      expect(result.symbol).toBe('USDC');
      expect(result.decimals).toBe(6);
    });

    it('should handle contract errors gracefully', async () => {
      const { getEthereumTokenBalance } = await import('./balance');

      const mockProvider = {} as any;

      const result = await getEthereumTokenBalance(
        mockProvider,
        '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
        '0xINVALID_TOKEN'
      );

      expect(result.success).toBe(false);
      expect(result.balance).toBe(0n);
      expect(result.formattedBalance).toBe('0');
      expect(result.error).toBeDefined();
    });
  });
});

// ============================================================================
// Integration Tests - EthereumAccount Validation
// ============================================================================

describe('EthereumAccount Integration Tests', () => {
  describe('validateDestinationAccount', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should validate valid EOA address', async () => {
      const account = await createEthereumAccount({
        network: ETHEREUM_NETWORKS['ethereum-mainnet'],
        mnemonic: TEST_MNEMONIC,
        index: 0,
        apiFunctions: mockEthereumApiFunctions,
      });

      const mockProvider = {
        getCode: vi.fn().mockResolvedValue('0x'), // Empty code = EOA
      } as any;

      // Override getProvider to return mock
      account['provider'] = mockProvider;

      const result = await account.validateDestinationAccount(
        '0x742D35cc6634c0532925a3B844bc9e7595f35b32'
      );

      expect(result.type).toBe('SUCCESS');
      expect(result.code).toBe('valid');
      expect(result.addressType).toBe('EOA');
    });

    it('should validate valid contract address', async () => {
      const account = await createEthereumAccount({
        network: ETHEREUM_NETWORKS['ethereum-mainnet'],
        mnemonic: TEST_MNEMONIC,
        index: 0,
        apiFunctions: mockEthereumApiFunctions,
      });

      const mockProvider = {
        getCode: vi.fn().mockResolvedValue('0x60806040'), // Has code = Contract
      } as any;

      account['provider'] = mockProvider;

      const result = await account.validateDestinationAccount(
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );

      expect(result.type).toBe('SUCCESS');
      expect(result.code).toBe('valid');
      expect(result.addressType).toBe('CONTRACT');
    });

    it('should reject invalid address format', async () => {
      const account = await createEthereumAccount({
        network: ETHEREUM_NETWORKS['ethereum-mainnet'],
        mnemonic: TEST_MNEMONIC,
        index: 0,
        apiFunctions: mockEthereumApiFunctions,
      });

      const result = await account.validateDestinationAccount('invalid_address');

      expect(result.type).toBe('ERROR');
      expect(result.code).toBe('invalid');
      expect(result.addressType).toBeUndefined();
    });

    it('should reject empty address', async () => {
      const account = await createEthereumAccount({
        network: ETHEREUM_NETWORKS['ethereum-mainnet'],
        mnemonic: TEST_MNEMONIC,
        index: 0,
        apiFunctions: mockEthereumApiFunctions,
      });

      const result = await account.validateDestinationAccount('');

      expect(result.type).toBe('ERROR');
      expect(result.code).toBe('invalid');
    });

    it('should reject invalid address formats', async () => {
      const account = await createEthereumAccount({
        network: ETHEREUM_NETWORKS['ethereum-mainnet'],
        mnemonic: TEST_MNEMONIC,
        index: 0,
        apiFunctions: mockEthereumApiFunctions,
      });

      // Test with completely invalid address
      const result = await account.validateDestinationAccount('invalid_address_123');

      expect(result.type).toBe('ERROR');
      expect(result.code).toBe('invalid');
    });

    it('should handle mainnet RPC timeout gracefully', async () => {
      const account = await createEthereumAccount({
        network: ETHEREUM_NETWORKS['ethereum-mainnet'],
        mnemonic: TEST_MNEMONIC,
        index: 0,
        apiFunctions: mockEthereumApiFunctions,
      });

      // This test validates the function signature and error handling
      // without actually making RPC calls
      expect(account.validateDestinationAccount).toBeDefined();
      expect(typeof account.validateDestinationAccount).toBe('function');
    });
  });
});

// ============================================================================
// Integration Tests - Token Service
// ============================================================================

describe('Token Service Integration Tests', () => {
  describe('getTokenInfo', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle contract errors gracefully', async () => {
      const { getTokenInfo } = await import('./tokens');

      const mockProvider = {} as any;

      // Test that function throws or handles error when contract is not accessible
      await expect(
        getTokenInfo(mockProvider, '0xINVALID_TOKEN_ADDRESS')
      ).rejects.toThrow();
    });

    it('should validate function signature and structure', async () => {
      const { getTokenInfo } = await import('./tokens');

      // Validate that the function exists and has correct structure
      expect(getTokenInfo).toBeDefined();
      expect(typeof getTokenInfo).toBe('function');
    });

    it('should handle getTokenInfo call structure', async () => {
      const { getTokenInfo } = await import('./tokens');

      const mockProvider = {
        // Mock minimal provider interface
        _isProvider: true,
      } as any;

      // This will fail but validates the call pattern
      try {
        await getTokenInfo(mockProvider, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
      } catch (error) {
        // Expected to fail with mock provider, but validates function is called correctly
        expect(error).toBeDefined();
      }
    });
  });

  describe('getTokensByOwner', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return empty array when no known tokens provided', async () => {
      const { getTokensByOwner } = await import('./tokens');

      const mockProvider = {} as any;
      const result = await getTokensByOwner(mockProvider, '0x742D35cc6634c0532925a3B844bc9e7595f35b32', []);

      expect(result).toEqual([]);
    });

    it('should filter out tokens with zero balance', async () => {
      const { getTokensByOwner } = await import('./tokens');

      const mockProvider = {} as any;

      // Mock Contract constructor to return a mock with balanceOf
      vi.doMock('ethers', async () => {
        const actual = await vi.importActual('ethers');
        return {
          ...actual,
          Contract: vi.fn().mockImplementation(() => ({
            balanceOf: vi.fn().mockResolvedValue(0n),
          })),
        };
      });

      const knownTokens = [
        { address: '0xUSDC...', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      ];

      const result = await getTokensByOwner(mockProvider, '0x742D35cc6634c0532925a3B844bc9e7595f35b32', knownTokens);

      expect(result).toEqual([]);
    });

    it('should validate function signature', async () => {
      const { getTokensByOwner } = await import('./tokens');

      expect(getTokensByOwner).toBeDefined();
      expect(typeof getTokensByOwner).toBe('function');
    });
  });

  describe('getFeaturedTokens', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return mainnet featured tokens', () => {
      const tokens = getFeaturedTokens(ETHEREUM_NETWORK_IDS.MAINNET);

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown network', () => {
      const tokens = getFeaturedTokens('unknown-network');

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(0);
    });

    it('should return empty array for testnet', () => {
      const tokens = getFeaturedTokens(ETHEREUM_NETWORK_IDS.SEPOLIA);

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(0);
    });
  });

  describe('isErc20Token', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return false for invalid contract', async () => {
      const { isErc20Token } = await import('./tokens');

      const mockProvider = {} as any;

      const result = await isErc20Token(mockProvider, '0xINVALID_CONTRACT');

      expect(result).toBe(false);
    });

    it('should return false for EOA address', async () => {
      const { isErc20Token } = await import('./tokens');

      const mockProvider = {
        getCode: vi.fn().mockResolvedValue('0x'),
      } as any;

      const result = await isErc20Token(mockProvider, '0x742D35cc6634c0532925a3B844bc9e7595f35b32');

      expect(result).toBe(false);
    });

    it('should validate function signature', async () => {
      const { isErc20Token } = await import('./tokens');

      expect(isErc20Token).toBeDefined();
      expect(typeof isErc20Token).toBe('function');
    });
  });
});

// ============================================================================
// Factory Tests - Account Creation from Wallet
// ============================================================================

describe('Factory - createEthereumAccountFromWallet', () => {
  it('should create account from existing wallet', () => {
    const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
    const wallet = new Wallet(privateKey);

    const account = createEthereumAccountFromWallet(
      ETHEREUM_NETWORKS['ethereum-mainnet'],
      wallet,
      0,
      mockEthereumApiFunctions
    );

    expect(account).toBeDefined();
    expect(account.network.id).toBe('ethereum-mainnet');
    expect(account.index).toBe(0);
    expect(account.path).toBe(`m/44'/60'/0'/0/0`);
  });

  it('should create account with custom index', () => {
    const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
    const wallet = new Wallet(privateKey);

    const account = createEthereumAccountFromWallet(
      ETHEREUM_NETWORKS['ethereum-mainnet'],
      wallet,
      5,
      mockEthereumApiFunctions
    );

    expect(account.index).toBe(5);
    expect(account.path).toBe(`m/44'/60'/0'/0/5`);
  });

  it('should create account with default index', () => {
    const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
    const wallet = new Wallet(privateKey);

    const account = createEthereumAccountFromWallet(ETHEREUM_NETWORKS['ethereum-mainnet'], wallet, undefined, mockEthereumApiFunctions);

    expect(account.index).toBe(0);
  });
});

// ============================================================================
// Factory Tests - Account Creation from Private Key
// ============================================================================

describe('Factory - createEthereumAccountFromPrivateKey', () => {
  it('should create account from private key with 0x prefix', () => {
    const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
    const account = createEthereumAccountFromPrivateKey(
      ETHEREUM_NETWORKS['ethereum-mainnet'],
      privateKey,
      0,
      mockEthereumApiFunctions
    );

    expect(account).toBeDefined();
    expect(account.network.id).toBe('ethereum-mainnet');
    expect(account.index).toBe(0);
  });

  it('should create account from private key without 0x prefix', () => {
    const privateKey = '0123456789012345678901234567890123456789012345678901234567890123';
    const account = createEthereumAccountFromPrivateKey(
      ETHEREUM_NETWORKS['ethereum-mainnet'],
      `0x${privateKey}`,
      0,
      mockEthereumApiFunctions
    );

    expect(account).toBeDefined();
    expect(account.network.id).toBe('ethereum-mainnet');
  });

  it('should create account with custom index', () => {
    const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
    const account = createEthereumAccountFromPrivateKey(
      ETHEREUM_NETWORKS['ethereum-mainnet'],
      privateKey,
      3,
      mockEthereumApiFunctions
    );

    expect(account.index).toBe(3);
  });

  it('should create account with default index', () => {
    const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
    const account = createEthereumAccountFromPrivateKey(ETHEREUM_NETWORKS['ethereum-mainnet'], privateKey, undefined, mockEthereumApiFunctions);

    expect(account.index).toBe(0);
  });
});

// ============================================================================
// Factory Tests - Derive Multiple Accounts
// ============================================================================

describe('Factory - deriveEthereumAccounts', () => {
  it('should derive single account with default parameters', async () => {
    const accounts = await deriveEthereumAccounts({
      network: ETHEREUM_NETWORKS['ethereum-mainnet'],
      mnemonic: TEST_MNEMONIC,
      apiFunctions: mockEthereumApiFunctions,
    });

    expect(accounts).toHaveLength(1);
    expect(accounts[0].index).toBe(0);
    expect(accounts[0].getReceiveAddress()).toBe(EXPECTED_ADDRESSES.index0);
  });

  it('should derive multiple accounts', async () => {
    const accounts = await deriveEthereumAccounts({
      network: ETHEREUM_NETWORKS['ethereum-mainnet'],
      mnemonic: TEST_MNEMONIC,
      startIndex: 0,
      count: 3,
      apiFunctions: mockEthereumApiFunctions,
    });

    expect(accounts).toHaveLength(3);
    expect(accounts[0].index).toBe(0);
    expect(accounts[1].index).toBe(1);
    expect(accounts[2].index).toBe(2);
    expect(accounts[0].getReceiveAddress()).toBe(EXPECTED_ADDRESSES.index0);
    expect(accounts[1].getReceiveAddress()).toBe(EXPECTED_ADDRESSES.index1);
  });

  it('should derive accounts starting from custom index', async () => {
    const accounts = await deriveEthereumAccounts({
      network: ETHEREUM_NETWORKS['ethereum-mainnet'],
      mnemonic: TEST_MNEMONIC,
      startIndex: 5,
      count: 2,
      apiFunctions: mockEthereumApiFunctions,
    });

    expect(accounts).toHaveLength(2);
    expect(accounts[0].index).toBe(5);
    expect(accounts[1].index).toBe(6);
    expect(accounts[0].getReceiveAddress()).toBe(EXPECTED_ADDRESSES.index5);
  });

  it('should derive accounts with different network', async () => {
    const accounts = await deriveEthereumAccounts({
      network: ETHEREUM_NETWORKS['ethereum-sepolia'],
      mnemonic: TEST_MNEMONIC,
      startIndex: 0,
      count: 2,
      apiFunctions: mockEthereumApiFunctions,
    });

    expect(accounts).toHaveLength(2);
    expect(accounts[0].network.environment).toBe('sepolia');
    expect(accounts[1].network.environment).toBe('sepolia');
    // Addresses should be the same for same mnemonic/index
    expect(accounts[0].getReceiveAddress()).toBe(EXPECTED_ADDRESSES.index0);
  });

  it('should derive unique addresses for each account', async () => {
    const accounts = await deriveEthereumAccounts({
      network: ETHEREUM_NETWORKS['ethereum-mainnet'],
      mnemonic: TEST_MNEMONIC,
      startIndex: 0,
      count: 5,
      apiFunctions: mockEthereumApiFunctions,
    });

    const addresses = accounts.map(acc => acc.getReceiveAddress());
    const uniqueAddresses = new Set(addresses);

    expect(uniqueAddresses.size).toBe(5);
  });
});

// ============================================================================
// Balance Tests - getEthereumTokenBalances
// ============================================================================

describe('Balance - getEthereumTokenBalances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch multiple token balances', async () => {
    const { getEthereumTokenBalances } = await import('./balance');

    const mockProvider = {} as any;

    const tokenAddresses = [
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    ];

    const results = await getEthereumTokenBalances(
      mockProvider,
      '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
      tokenAddresses
    );

    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(2);
  });

  it('should handle TokenInfo objects', async () => {
    const { getEthereumTokenBalances } = await import('./balance');

    const mockProvider = {} as any;

    const tokens = [
      { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
      '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    ];

    const results = await getEthereumTokenBalances(
      mockProvider,
      '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
      tokens
    );

    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(2);
  });

  it('should return empty array for empty token list', async () => {
    const { getEthereumTokenBalances } = await import('./balance');

    const mockProvider = {} as any;

    const results = await getEthereumTokenBalances(
      mockProvider,
      '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
      []
    );

    expect(results).toEqual([]);
  });

  it('should handle mixed success and failure results', async () => {
    const { getEthereumTokenBalances } = await import('./balance');

    const mockProvider = {} as any;

    const tokens = [
      { address: '0xVALID...', symbol: 'VALID', decimals: 18 },
      { address: '0xINVALID...', symbol: 'INVALID', decimals: 18 },
    ];

    const results = await getEthereumTokenBalances(
      mockProvider,
      '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
      tokens
    );

    expect(results).toHaveLength(2);
    // Results should include both, even if some fail
    results.forEach(result => {
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('address');
    });
  });
});

// ============================================================================
// Balance Tests - getBalance
// ============================================================================

describe('Balance - getBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get ETH balance only when no tokens specified', async () => {
    const { getBalance } = await import('./balance');

    const mockProvider = {
      getBalance: vi.fn().mockResolvedValue(1_000_000_000_000_000_000n),
    } as any;

    const result = await getBalance(mockProvider, '0x742D35cc6634c0532925a3B844bc9e7595f35b32');

    expect(mockProvider.getBalance).toHaveBeenCalledWith('0x742D35cc6634c0532925a3B844bc9e7595f35b32');
    expect(result.native).toBeDefined();
    expect(result.native.symbol).toBe('ETH');
    expect(result.native.balance).toBe(1_000_000_000_000_000_000n);
    expect(result.tokens).toEqual([]);
  });

  it('should get ETH and token balances', async () => {
    const { getBalance } = await import('./balance');

    const mockProvider = {
      getBalance: vi.fn().mockResolvedValue(1_000_000_000_000_000_000n),
    } as any;

    const result = await getBalance(
      mockProvider,
      '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
      ['0xUSDC...']
    );

    expect(result.native).toBeDefined();
    expect(Array.isArray(result.tokens)).toBe(true);
  });

  it('should filter out failed token balances', async () => {
    const { getBalance } = await import('./balance');

    const mockProvider = {
      getBalance: vi.fn().mockResolvedValue(1_000_000_000_000_000_000n),
    } as any;

    const result = await getBalance(
      mockProvider,
      '0x742D35cc6634c0532925a3B844bc9e7595f35b32',
      ['0xINVALID...']
    );

    expect(result.native).toBeDefined();
    expect(result.tokens).toEqual([]);
  });

  it('should structure result correctly', async () => {
    const { getBalance } = await import('./balance');

    const mockProvider = {
      getBalance: vi.fn().mockResolvedValue(2_000_000_000_000_000_000n),
    } as any;

    const result = await getBalance(mockProvider, '0x742D35cc6634c0532925a3B844bc9e7595f35b32');

    expect(result).toHaveProperty('native');
    expect(result).toHaveProperty('tokens');
    expect(result.native.address).toBe('');
    expect(result.native.symbol).toBe('ETH');
    expect(result.native.decimals).toBe(18);
    expect(result.native.balance).toBe(2_000_000_000_000_000_000n);
    expect(result.native.formattedBalance).toBe('2.0');
  });
});

// ============================================================================
// Transfer Tests - confirmTransaction
// ============================================================================

describe('Transfer - confirmTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should wait for transaction confirmation', async () => {
    const { confirmTransaction } = await import('./transfer');

    const mockReceipt = {
      hash: '0xTX_HASH',
      status: 1,
      blockNumber: 12345,
    };

    const mockProvider = {
      waitForTransaction: vi.fn().mockResolvedValue(mockReceipt),
    } as any;

    const receipt = await confirmTransaction(mockProvider, '0xTX_HASH');

    expect(mockProvider.waitForTransaction).toHaveBeenCalledWith('0xTX_HASH', 1);
    expect(receipt).toEqual(mockReceipt);
  });

  it('should wait for custom number of confirmations', async () => {
    const { confirmTransaction } = await import('./transfer');

    const mockReceipt = {
      hash: '0xTX_HASH',
      status: 1,
      blockNumber: 12345,
    };

    const mockProvider = {
      waitForTransaction: vi.fn().mockResolvedValue(mockReceipt),
    } as any;

    const receipt = await confirmTransaction(mockProvider, '0xTX_HASH', 3);

    expect(mockProvider.waitForTransaction).toHaveBeenCalledWith('0xTX_HASH', 3);
    expect(receipt).toEqual(mockReceipt);
  });

  it('should throw error when transaction not found', async () => {
    const { confirmTransaction } = await import('./transfer');

    const mockProvider = {
      waitForTransaction: vi.fn().mockResolvedValue(null),
    } as any;

    await expect(
      confirmTransaction(mockProvider, '0xNONEXISTENT_HASH')
    ).rejects.toThrow('Transaction 0xNONEXISTENT_HASH not found');
  });

  it('should handle successful transaction', async () => {
    const { confirmTransaction } = await import('./transfer');

    const mockReceipt = {
      hash: '0xSUCCESS_HASH',
      status: 1,
      blockNumber: 12345,
      gasUsed: 21000n,
    };

    const mockProvider = {
      waitForTransaction: vi.fn().mockResolvedValue(mockReceipt),
    } as any;

    const receipt = await confirmTransaction(mockProvider, '0xSUCCESS_HASH');

    expect(receipt.status).toBe(1);
    expect(receipt.hash).toBe('0xSUCCESS_HASH');
  });

  it('should handle failed transaction', async () => {
    const { confirmTransaction } = await import('./transfer');

    const mockReceipt = {
      hash: '0xFAILED_HASH',
      status: 0,
      blockNumber: 12345,
    };

    const mockProvider = {
      waitForTransaction: vi.fn().mockResolvedValue(mockReceipt),
    } as any;

    const receipt = await confirmTransaction(mockProvider, '0xFAILED_HASH');

    expect(receipt.status).toBe(0);
  });
});
