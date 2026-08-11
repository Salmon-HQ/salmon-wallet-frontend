/**
 * API Services
 *
 * Core adapter services for connecting to the Salmon backend API.
 *
 * Services re-exported from this barrel:
 * - Price Service (./price)
 * - Exchange Rates Service (./exchangeRates)
 * - Token Service (./tokens)
 * - NFT Burn Service (./nft-burn)
 * - Bitcoin Service (./bitcoin)
 * - Solana Service (./solana)
 * - DApp Service (./dapp)
 * - Bridge Service (./bridge)
 * - Ethereum Service (./ethereum)
 * - Solana NFT Service (./solana-nft)
 * - Network Service (./network)
 */

// ============================================================================
// Price Service
// ============================================================================

export {
  // Functions
  getMarketChart,
  getCoinInfo,
} from './price';

// ============================================================================
// Exchange Rates Service
// ============================================================================

export {
  getExchangeRates,
  clearExchangeRateCache,
} from './exchangeRates';

// ============================================================================
// Token Service
// ============================================================================

export {
  // Functions
  getTokenList,
  searchTokens,
  clearTokenListCache,
} from './tokens';

// ============================================================================
// NFT Burn Service
// ============================================================================

export {
  // Functions
  createBurnTransaction,
} from './nft-burn';

export {
  createNftTransferTransaction,
  type TransferNftParams,
} from './nft-transfer';

// ============================================================================
// Bitcoin Service
// ============================================================================

export {
  // DI adapters (transfer)
  fetchUtxos,
  broadcastTransaction,
  // DI adapters (account)
  fetchBitcoinAccountBalance,
  fetchBitcoinAccountRecentTransactions,
  bitcoinApiFunctions,
} from './bitcoin';

// ============================================================================
// Solana Service
// ============================================================================

export {
  // Types - Transaction (backend-transformed format)
  // Note: SolanaTransaction uses TransactionTokenAmount, TransactionFee,
  // TransactionDisplayStatus, TransactionType from types/transaction.ts
  type SolanaTransaction,
  // Types - Transaction (legacy/raw format for blockchain module)
  type SolanaTokenTransfer,
  type SolanaNativeTransfer,
  type SolanaAccountData,
  type SolanaInstruction,
  type SolanaTransactionStatus,
  type SolanaTransactionType,
  // Types - Pagination
  type SolanaPagingParams,
  type SolanaTransactionsResponse,
  // Note: Swap types (SwapOrderParams, SwapExecuteRequest, ApiSwapExecuteResponse)
  // are in types/swap.ts - import from @salmon/shared
  // Functions - Transactions
  getSolanaTransactions,
  // Functions - Swap
  getSwapOrder,
  executeSwapApi,
  // DI adapter
  solanaApiFunctions,
} from './solana';

// ============================================================================
// DApp Service
// ============================================================================

export {
  // Functions
  getMetadata as getDappMetadata,
} from './dapp';

// ============================================================================
// Bridge Service
// ============================================================================

export {
  // Functions
  getBridgeAvailableTokens,
  getBridgeEstimatedAmount,
  getBridgeMinimalAmount,
  createBridgeExchange,
  getBridgeTransaction,
} from './bridge';

// ============================================================================
// Ethereum Service (ERC-20 Token Detection)
// ============================================================================

export {
  // Types
  type AlchemyTokenBalance,
  type AlchemyTokenMetadata,
  type DetectedERC20Token,
  // Functions
  getERC20TokenBalances,
  getTokenMetadataBatch,
  // DI adapter (account)
  ethereumApiFunctions,
} from './ethereum';

// ============================================================================
// Solana NFT Service
// ============================================================================

export {
  // Functions
  getSolanaNfts,
} from './solana-nft';

// ============================================================================
// Network Service
// ============================================================================

export {
  // Functions
  getNetworks,
  getNetwork,
  getEnabledNetworkIds,
  isBackendNetworkEnabled,
  clearNetworksCache,
} from './network';
