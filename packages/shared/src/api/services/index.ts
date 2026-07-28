/**
 * API Services
 *
 * Core adapter services for connecting to the Salmon backend API.
 *
 * Services re-exported from this barrel:
 * - Price Service (./price)
 * - Exchange Rates Service (./exchangeRates)
 * - Token Service (./tokens)
 * - Balance Service (./balance)
 * - NFT Burn Service (./nft-burn)
 * - Bitcoin Service (./bitcoin)
 * - Solana Service (./solana)
 * - DApp Service (./dapp)
 * - Bridge Service (./bridge)
 * - Ethereum Service (./ethereum)
 * - Multi-chain Transaction Service (./transactions)
 * - Solana NFT Service (./solana-nft)
 * - Network Service (./network)
 */

// ============================================================================
// Price Service
// ============================================================================

export {
  // Functions
  getPricesByPlatform,
  getPricesByIds,
  getMarketChart,
  getCoinInfo,
  clearPriceCache,
  getPriceCacheStatus,
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
  getTokenMetadataByMints,
  getVerifiedTokens,
  searchTokens,
  getTokenByAddress,
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
  // Types
  type BitcoinBalance,
  type BitcoinUtxo,
  type BitcoinTransactionInput,
  type BitcoinTransactionOutput,
  type BitcoinTransaction,
  type BitcoinPagingParams,
  type BitcoinTransactionsResponse,
  type BroadcastTransactionRequest,
  type BroadcastTransactionResponse,
  // Functions
  getBitcoinBalance,
  getBitcoinUtxos,
  getBitcoinTransactions,
  getBitcoinTransaction,
  broadcastBitcoinTransaction,
  // DI adapters (transfer)
  fetchUtxos,
  broadcastTransaction,
  // DI adapters (account)
  fetchBitcoinAccountBalance,
  fetchBitcoinAccountTransaction,
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
  getSolanaTransaction,
  getAllSolanaTransactions,
  getRecentSolanaTransactions,
  getTransactionsByType,
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
// Multi-chain Transaction Service
// ============================================================================

export {
  // Types
  type TransactionItem,
  type TransactionPagingParams,
  type TransactionsResponse,
  // Functions - aliased to avoid conflicts with chain-specific services
  getTransactions as getMultichainTransactions,
} from './transactions';

// ============================================================================
// Solana NFT Service
// ============================================================================

export {
  // Functions
  getSolanaNfts,
  getSolanaNftByAddress,
} from './solana-nft';

// ============================================================================
// Network Service
// ============================================================================

export {
  // Functions
  getNetworks,
  getNetwork,
  getEnabledNetworkIds,
  getEnabledBlockchains,
  isBackendNetworkEnabled,
  clearNetworksCache,
} from './network';
