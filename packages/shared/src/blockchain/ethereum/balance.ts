/**
 * Ethereum Balance Service
 * Migrated from salmon-wallet-v2/src/adapter/services/ethereum/ethereum-balance-service.js
 *
 * Provides balance retrieval for ETH and ERC20 tokens on Ethereum.
 * Uses ethers.js v6 for blockchain interactions.
 *
 * Features:
 * - Native ETH balance retrieval
 * - ERC20 token balance retrieval
 * - Batch token balance queries
 * - Combined wallet balance (ETH + tokens)
 * - Formatted balance display
 */

import { Contract, formatUnits, type Provider } from 'ethers';
import { ETH_CONSTANTS, ERC20_ABI } from '../../utils/tokens';
import { formatBalance } from '../../utils/formatting';
import type {
  EthereumOnChainTokenBalance,
  EthereumOnChainWalletBalance,
  BalanceLookupToken,
  EthereumTokenBalanceResult,
} from '../../types/balance';

// Re-export canonical types from types/balance
export type {
  EthereumOnChainTokenBalance,
  EthereumOnChainWalletBalance,
  BalanceLookupToken,
  EthereumTokenBalanceResult,
};

/** @deprecated Use `EthereumOnChainWalletBalance` from `types/balance` instead. */
export type EthereumWalletBalance = EthereumOnChainWalletBalance;

// Backwards-compatible aliases
/** @deprecated Use `EthereumOnChainTokenBalance` from `types/balance` instead. */
export type EthereumTokenBalance = EthereumOnChainTokenBalance;
/** @deprecated Use `BalanceLookupToken` from `types/balance` instead. */
export type TokenInfo = BalanceLookupToken;

// Note: ETH_CONSTANTS, ERC20_ABI are canonical in utils/tokens
// Note: WEI_PER_ETH_BIGINT is canonical in utils/decimals
// Note: ethToWei, weiToEth are canonical in utils/decimals
// Note: isZeroBalance, compareBalances are canonical in utils/balance

// ============================================================================
// Native ETH Balance Functions
// ============================================================================

/**
 * Get native ETH balance for an address
 *
 * @param provider - Ethers.js provider
 * @param address - Wallet address to query
 * @returns ETH balance with raw and formatted values
 *
 * @example
 * ```typescript
 * const provider = new JsonRpcProvider('https://mainnet.infura.io/v3/...');
 * const balance = await getEthBalance(provider, '0x...');
 * console.log(balance.formattedBalance); // '1.5'
 * console.log(balance.balance); // 1500000000000000000n
 * ```
 */
export async function getEthBalance(
  provider: Provider,
  address: string
): Promise<EthereumTokenBalance> {
  const balance = await provider.getBalance(address);

  return {
    address: ETH_CONSTANTS.ADDRESS,
    symbol: ETH_CONSTANTS.SYMBOL,
    decimals: ETH_CONSTANTS.DECIMALS,
    balance,
    formattedBalance: formatUnits(balance, ETH_CONSTANTS.DECIMALS),
  };
}

// ============================================================================
// ERC20 Token Balance Functions
// ============================================================================

/**
 * Get ERC20 token balance for an address
 *
 * Fetches the token balance using the balanceOf function.
 * If symbol or decimals are not provided, they are fetched from the contract.
 *
 * @param provider - Ethers.js provider
 * @param walletAddress - Wallet address to query
 * @param tokenAddress - ERC20 token contract address
 * @param tokenInfo - Optional token info (symbol, decimals)
 * @returns Token balance result with raw and formatted values
 *
 * @example
 * ```typescript
 * // With known token info
 * const balance = await getEthereumTokenBalance(
 *   provider,
 *   '0xWalletAddress...',
 *   '0xTokenAddress...',
 *   { symbol: 'USDC', decimals: 6 }
 * );
 *
 * // Without token info (fetches from contract)
 * const balance = await getEthereumTokenBalance(
 *   provider,
 *   '0xWalletAddress...',
 *   '0xTokenAddress...'
 * );
 * ```
 */
export async function getEthereumTokenBalance(
  provider: Provider,
  walletAddress: string,
  tokenAddress: string,
  tokenInfo?: Partial<TokenInfo>
): Promise<EthereumTokenBalanceResult> {
  try {
    const contract = new Contract(tokenAddress, ERC20_ABI, provider);

    // Fetch balance and optionally symbol/decimals
    const [balance, decimals, symbol] = await Promise.all([
      contract.balanceOf(walletAddress) as Promise<bigint>,
      tokenInfo?.decimals !== undefined
        ? Promise.resolve(tokenInfo.decimals)
        : (contract.decimals() as Promise<number>),
      tokenInfo?.symbol !== undefined
        ? Promise.resolve(tokenInfo.symbol)
        : (contract.symbol() as Promise<string>),
    ]);

    return {
      address: tokenAddress,
      symbol,
      decimals,
      balance,
      formattedBalance: formatUnits(balance, decimals),
      success: true,
    };
  } catch (error) {
    return {
      address: tokenAddress,
      symbol: tokenInfo?.symbol || 'UNKNOWN',
      decimals: tokenInfo?.decimals || 18,
      balance: 0n,
      formattedBalance: '0',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get multiple ERC20 token balances for an address
 *
 * Fetches balances for multiple tokens in parallel.
 * Failed fetches are included in the result with success: false.
 *
 * @param provider - Ethers.js provider
 * @param walletAddress - Wallet address to query
 * @param tokenAddresses - Array of token addresses or token info objects
 * @returns Array of token balance results
 *
 * @example
 * ```typescript
 * const balances = await getEthereumTokenBalances(
 *   provider,
 *   '0xWalletAddress...',
 *   [
 *     '0xUSDCAddress...',
 *     '0xDAIAddress...',
 *     { address: '0xWETHAddress...', symbol: 'WETH', decimals: 18 }
 *   ]
 * );
 * ```
 */
export async function getEthereumTokenBalances(
  provider: Provider,
  walletAddress: string,
  tokenAddresses: (string | TokenInfo)[]
): Promise<EthereumTokenBalanceResult[]> {
  const balancePromises = tokenAddresses.map((token) => {
    const address = typeof token === 'string' ? token : token.address;
    const tokenInfo = typeof token === 'string' ? undefined : token;

    return getEthereumTokenBalance(provider, walletAddress, address, tokenInfo);
  });

  return Promise.all(balancePromises);
}

// ============================================================================
// Combined Balance Functions
// ============================================================================

/**
 * Get complete wallet balance (ETH + tokens)
 *
 * Fetches native ETH balance and optionally ERC20 token balances.
 * Combines results into a unified wallet balance structure.
 *
 * @param provider - Ethers.js provider
 * @param walletAddress - Wallet address to query
 * @param tokenAddresses - Optional array of token addresses to query
 * @returns Complete wallet balance with native ETH and tokens
 *
 * @example
 * ```typescript
 * // Get ETH balance only
 * const balance = await getBalance(provider, '0xWalletAddress...');
 *
 * // Get ETH + specific tokens
 * const balance = await getBalance(
 *   provider,
 *   '0xWalletAddress...',
 *   ['0xUSDCAddress...', '0xDAIAddress...']
 * );
 * ```
 */
export async function getBalance(
  provider: Provider,
  walletAddress: string,
  tokenAddresses?: (string | TokenInfo)[]
): Promise<EthereumOnChainWalletBalance> {
  // Fetch ETH balance and token balances in parallel
  const [ethBalance, tokenBalances] = await Promise.all([
    getEthBalance(provider, walletAddress),
    tokenAddresses
      ? getEthereumTokenBalances(provider, walletAddress, tokenAddresses)
      : Promise.resolve([]),
  ]);

  // Convert successful token balances to EthereumTokenBalance format
  const tokens: EthereumTokenBalance[] = tokenBalances
    .filter((result) => result.success)
    .map((result) => ({
      address: result.address,
      symbol: result.symbol,
      decimals: result.decimals,
      balance: result.balance,
      formattedBalance: result.formattedBalance,
    }));

  return {
    native: ethBalance,
    tokens,
    // Note: totalUsd would require price service integration
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format balance for display with appropriate precision
 *
 * @param balance - Raw balance in smallest unit
 * @param decimals - Token decimals
 * @param displayDecimals - Number of decimals to show (default: 4)
 * @returns Formatted balance string
 */
export function formatBalanceDisplay(
  balance: bigint,
  decimals: number,
  displayDecimals: number = 4
): string {
  const numValue = parseFloat(formatUnits(balance, decimals));
  return formatBalance(numValue, displayDecimals);
}
