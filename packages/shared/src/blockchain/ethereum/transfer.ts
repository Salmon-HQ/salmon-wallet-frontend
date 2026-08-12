/**
 * Ethereum Transfer Service
 * Migrated from salmon-wallet-v2/src/adapter/services/ethereum/ethereum-transfer-service.js
 *
 * Provides functionality for transferring ETH and tokens on Ethereum and EVM-compatible chains.
 * Supports native ETH, ERC20 tokens, ERC721 NFTs, and ERC1155 multi-tokens.
 *
 * Features:
 * - Native ETH transfers
 * - ERC20 token transfers
 * - ERC721 NFT transfers (safeTransferFrom)
 * - ERC1155 multi-token transfers
 * - Gas estimation
 * - Transaction confirmation
 * - Support for EIP-1559 transactions
 */

import {
  Contract,
  Wallet,
  Provider,
  TransactionResponse,
  TransactionReceipt,
  formatUnits,
  Interface,
} from 'ethers';
import { parseAmount } from '../../utils/decimals';
import { ETH_ADDRESS, isNativeEth, type TransferToken } from '../../utils/tokens';

// ============================================================================
// Minimal ABIs (inline to avoid separate files)
// ============================================================================

/** Minimal ERC20 ABI for transfers */
const ERC20_ABI = [
  'function transfer(address to, uint256 value) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

/** Minimal ERC721 ABI for transfers */
const ERC721_ABI = [
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
];

/** Minimal ERC1155 ABI for transfers */
const ERC1155_ABI = [
  'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
  'function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
];

// ============================================================================
// Constants
// ============================================================================

// Note: ETH_ADDRESS, ETH_ADDRESS_ALT are canonical in utils/tokens — import from there directly
// Note: TokenType, TransferToken are canonical in utils/tokens — import from there directly

/**
 * Options for transfer transactions
 */
export interface TransferOptions {
  /** Custom gas limit */
  gasLimit?: bigint;
  /** Legacy gas price (pre-EIP-1559) */
  gasPrice?: bigint;
  /** Max fee per gas (EIP-1559) */
  maxFeePerGas?: bigint;
  /** Max priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas?: bigint;
  /** Custom nonce */
  nonce?: number;
  /** Token ID for NFT transfers (ERC721/ERC1155) */
  tokenId?: string | bigint;
  /** Data bytes for ERC1155 transfers */
  data?: string;
}

/**
 * Result of a transfer operation
 */
export interface TransferResult {
  /** Transaction hash */
  txHash: string;
  /** Transaction receipt (available after confirmation) */
  receipt?: TransactionReceipt;
}

/**
 * Gas estimation result
 */
export interface GasEstimate {
  /** Estimated gas limit */
  gasLimit: bigint;
  /** Current gas price or max fee per gas */
  gasPrice: bigint;
  /** Max priority fee per gas (EIP-1559) */
  maxPriorityFeePerGas?: bigint;
  /** Max fee per gas (EIP-1559) */
  maxFeePerGas?: bigint;
  /** Estimated total fee in wei */
  estimatedFee: bigint;
}

// ============================================================================
// Utility Functions
// ============================================================================

// Note: isNativeEth is canonical in utils/tokens — import from there directly
// Note: parseAmount is canonical in utils/decimals — import from there directly

/**
 * Formats wei/smallest unit to human-readable amount
 *
 * @param amount - Amount in smallest unit
 * @param decimals - Token decimals
 * @returns Human-readable amount string
 */
export function formatAmount(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals);
}

// ============================================================================
// Gas Estimation
// ============================================================================

/**
 * Estimates the gas fee for a transfer
 *
 * @param provider - Ethereum provider
 * @param to - Recipient address
 * @param token - Token information
 * @param amount - Amount to transfer (human-readable for native/ERC20, ignored for NFTs)
 * @param opts - Transfer options
 * @returns Gas estimate with fee information
 *
 * @example
 * ```typescript
 * // Estimate ETH transfer fee
 * const estimate = await estimateTransferFee(
 *   provider,
 *   '0x...',
 *   { address: ETH_ADDRESS, decimals: 18, type: 'native' },
 *   '1.5'
 * );
 * console.log(`Estimated fee: ${formatAmount(estimate.estimatedFee, 18)} ETH`);
 *
 * // Estimate ERC20 transfer fee
 * const estimate = await estimateTransferFee(
 *   provider,
 *   '0x...',
 *   { address: '0xUSDC...', decimals: 6, type: 'erc20' },
 *   '100'
 * );
 * ```
 */
export async function estimateTransferFee(
  provider: Provider,
  to: string,
  token: TransferToken,
  amount: string | number,
  opts: TransferOptions = {}
): Promise<GasEstimate> {
  let gasLimit: bigint;

  if (isNativeEth(token.address) || token.type === 'native') {
    // Native ETH transfer
    const value = parseAmount(amount, token.decimals);
    gasLimit = await provider.estimateGas({
      to,
      value,
    });
  } else if (token.type === 'erc721') {
    // ERC721 NFT transfer
    if (!opts.tokenId) {
      throw new Error('tokenId is required for ERC721 transfers');
    }
    const iface = new Interface(ERC721_ABI);
    const data = iface.encodeFunctionData('safeTransferFrom(address,address,uint256)', [
      ETH_ADDRESS, // Placeholder, will be replaced with actual from address
      to,
      opts.tokenId,
    ]);
    gasLimit = await provider.estimateGas({
      to: token.address,
      data,
    });
  } else if (token.type === 'erc1155') {
    // ERC1155 multi-token transfer
    if (!opts.tokenId) {
      throw new Error('tokenId is required for ERC1155 transfers');
    }
    const iface = new Interface(ERC1155_ABI);
    const data = iface.encodeFunctionData('safeTransferFrom', [
      ETH_ADDRESS, // Placeholder
      to,
      opts.tokenId,
      amount,
      opts.data || '0x',
    ]);
    gasLimit = await provider.estimateGas({
      to: token.address,
      data,
    });
  } else {
    // ERC20 token transfer
    const contract = new Contract(token.address, ERC20_ABI, provider);
    const value = parseAmount(amount, token.decimals);
    gasLimit = await contract.transfer.estimateGas(to, value);
  }

  // Get fee data
  const feeData = await provider.getFeeData();

  // Calculate estimated fee
  const maxFeePerGas = opts.maxFeePerGas ?? feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
  const estimatedFee = gasLimit * maxFeePerGas;

  return {
    gasLimit,
    gasPrice: feeData.gasPrice ?? 0n,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
    maxFeePerGas: feeData.maxFeePerGas ?? undefined,
    estimatedFee,
  };
}

// ============================================================================
// Transaction Creation
// ============================================================================

/**
 * Populates a contract transaction with gas options and signs it.
 */
async function populateAndSign(
  wallet: Wallet,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  opts: TransferOptions
): Promise<string> {
  const populatedTx = await wallet.populateTransaction({
    ...tx,
    gasLimit: opts.gasLimit,
    gasPrice: opts.gasPrice,
    maxFeePerGas: opts.maxFeePerGas,
    maxPriorityFeePerGas: opts.maxPriorityFeePerGas,
    nonce: opts.nonce,
  });
  return wallet.signTransaction(populatedTx);
}

/**
 * Creates and signs a transfer transaction without sending it
 *
 * @param wallet - Ethers wallet with signer
 * @param to - Recipient address
 * @param token - Token information
 * @param amount - Amount to transfer
 * @param opts - Transfer options
 * @returns Signed transaction string
 *
 * @example
 * ```typescript
 * const signedTx = await createTransferTransaction(
 *   wallet,
 *   '0x...',
 *   { address: ETH_ADDRESS, decimals: 18, type: 'native' },
 *   '1.0'
 * );
 * // Can be broadcast later with provider.broadcastTransaction(signedTx)
 * ```
 */
export async function createTransferTransaction(
  wallet: Wallet,
  to: string,
  token: TransferToken,
  amount: string | number,
  opts: TransferOptions = {}
): Promise<string> {
  const from = await wallet.getAddress();

  if (isNativeEth(token.address) || token.type === 'native') {
    // Native ETH transfer
    const value = parseAmount(amount, token.decimals);
    const tx = await wallet.populateTransaction({
      to,
      value,
      gasLimit: opts.gasLimit,
      gasPrice: opts.gasPrice,
      maxFeePerGas: opts.maxFeePerGas,
      maxPriorityFeePerGas: opts.maxPriorityFeePerGas,
      nonce: opts.nonce,
    });
    return wallet.signTransaction(tx);
  }

  if (token.type === 'erc721') {
    // ERC721 NFT transfer
    if (!opts.tokenId) {
      throw new Error('tokenId is required for ERC721 transfers');
    }
    const contract = new Contract(token.address, ERC721_ABI, wallet);
    const tx = await contract['safeTransferFrom(address,address,uint256)'].populateTransaction(
      from,
      to,
      opts.tokenId
    );
    return populateAndSign(wallet, tx, opts);
  }

  if (token.type === 'erc1155') {
    // ERC1155 multi-token transfer
    if (!opts.tokenId) {
      throw new Error('tokenId is required for ERC1155 transfers');
    }
    const contract = new Contract(token.address, ERC1155_ABI, wallet);
    const tx = await contract.safeTransferFrom.populateTransaction(
      from,
      to,
      opts.tokenId,
      amount,
      opts.data || '0x'
    );
    return populateAndSign(wallet, tx, opts);
  }

  // ERC20 token transfer
  const contract = new Contract(token.address, ERC20_ABI, wallet);
  const value = parseAmount(amount, token.decimals);
  const tx = await contract.transfer.populateTransaction(to, value);
  return populateAndSign(wallet, tx, opts);
}

// ============================================================================
// Send Transaction
// ============================================================================

/**
 * Creates, signs, and sends a transfer transaction
 *
 * @param wallet - Ethers wallet with signer
 * @param to - Recipient address
 * @param token - Token information
 * @param amount - Amount to transfer
 * @param opts - Transfer options
 * @returns Transfer result with transaction hash
 *
 * @example
 * ```typescript
 * // Send ETH
 * const result = await sendTransaction(
 *   wallet,
 *   '0xRecipient...',
 *   { address: ETH_ADDRESS, decimals: 18, type: 'native' },
 *   '0.5'
 * );
 * console.log(`TX: ${result.txHash}`);
 *
 * // Send ERC20 token
 * const result = await sendTransaction(
 *   wallet,
 *   '0xRecipient...',
 *   { address: '0xUSDC...', decimals: 6, symbol: 'USDC', type: 'erc20' },
 *   '100'
 * );
 *
 * // Send ERC721 NFT
 * const result = await sendTransaction(
 *   wallet,
 *   '0xRecipient...',
 *   { address: '0xNFTContract...', decimals: 0, type: 'erc721' },
 *   '1', // amount is ignored for ERC721
 *   { tokenId: '123' }
 * );
 *
 * // Send ERC1155 token
 * const result = await sendTransaction(
 *   wallet,
 *   '0xRecipient...',
 *   { address: '0xMultiToken...', decimals: 0, type: 'erc1155' },
 *   '5', // amount of tokens to send
 *   { tokenId: '1' }
 * );
 * ```
 */
export async function sendTransaction(
  wallet: Wallet,
  to: string,
  token: TransferToken,
  amount: string | number,
  opts: TransferOptions = {}
): Promise<TransferResult> {
  const from = await wallet.getAddress();
  let response: TransactionResponse;

  if (isNativeEth(token.address) || token.type === 'native') {
    // Native ETH transfer
    const value = parseAmount(amount, token.decimals);
    response = await wallet.sendTransaction({
      to,
      value,
      gasLimit: opts.gasLimit,
      gasPrice: opts.gasPrice,
      maxFeePerGas: opts.maxFeePerGas,
      maxPriorityFeePerGas: opts.maxPriorityFeePerGas,
      nonce: opts.nonce,
    });
  } else if (token.type === 'erc721') {
    // ERC721 NFT transfer
    if (!opts.tokenId) {
      throw new Error('tokenId is required for ERC721 transfers');
    }
    const contract = new Contract(token.address, ERC721_ABI, wallet);
    response = await contract['safeTransferFrom(address,address,uint256)'](from, to, opts.tokenId, {
      gasLimit: opts.gasLimit,
      gasPrice: opts.gasPrice,
      maxFeePerGas: opts.maxFeePerGas,
      maxPriorityFeePerGas: opts.maxPriorityFeePerGas,
      nonce: opts.nonce,
    });
  } else if (token.type === 'erc1155') {
    // ERC1155 multi-token transfer
    if (!opts.tokenId) {
      throw new Error('tokenId is required for ERC1155 transfers');
    }
    const contract = new Contract(token.address, ERC1155_ABI, wallet);
    response = await contract.safeTransferFrom(from, to, opts.tokenId, amount, opts.data || '0x', {
      gasLimit: opts.gasLimit,
      gasPrice: opts.gasPrice,
      maxFeePerGas: opts.maxFeePerGas,
      maxPriorityFeePerGas: opts.maxPriorityFeePerGas,
      nonce: opts.nonce,
    });
  } else {
    // ERC20 token transfer
    const contract = new Contract(token.address, ERC20_ABI, wallet);
    const value = parseAmount(amount, token.decimals);
    response = await contract.transfer(to, value, {
      gasLimit: opts.gasLimit,
      gasPrice: opts.gasPrice,
      maxFeePerGas: opts.maxFeePerGas,
      maxPriorityFeePerGas: opts.maxPriorityFeePerGas,
      nonce: opts.nonce,
    });
  }

  return { txHash: response.hash };
}

// ============================================================================
// Transaction Confirmation
// ============================================================================

/**
 * Waits for a transaction to be confirmed and returns the receipt
 *
 * @param provider - Ethereum provider
 * @param txHash - Transaction hash to confirm
 * @param confirmations - Number of confirmations to wait for (default: 1)
 * @returns Transaction receipt
 *
 * @example
 * ```typescript
 * const result = await sendTransaction(wallet, to, token, amount);
 * const receipt = await confirmTransaction(provider, result.txHash);
 * if (receipt.status === 1) {
 *   console.log('Transaction successful!');
 * }
 * ```
 */
export async function confirmTransaction(
  provider: Provider,
  txHash: string,
  confirmations: number = 1
): Promise<TransactionReceipt> {
  const receipt = await provider.waitForTransaction(txHash, confirmations);
  if (!receipt) {
    throw new Error(`Transaction ${txHash} not found`);
  }
  return receipt;
}

// Note: createNativeToken, createERC20Token, createERC721Token, createERC1155Token
// are canonical in utils/tokens — import from there directly
