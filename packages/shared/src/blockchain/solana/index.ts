// Solana Account
export { SolanaAccount } from './SolanaAccount';
export type {
  SolanaAccountOptions,
  SolanaBalance,
  SolanaSigningKey,
} from './SolanaAccount';

// Factory functions and utilities
export {
  createSolanaAccount,
  createSolanaAccountFromKeyPair,
  createSolanaAccountFromSecretKey,
  deriveSolanaAccounts,
  generateKeyPair,
  getSolanaDerivationPath,
  SOLANA_COIN_TYPE,
  SOLANA_NETWORKS,
} from './factory';
export type {
  CreateSolanaAccountOptions,
  DeriveSolanaAccountsOptions,
} from './factory';

// Transfer functions
export {
  createTransfer,
  createSolTransaction,
  createSplTransaction,
  estimateFee,
  calculateTransferFee,
  requiresMemo,
  confirmTransaction,
  airdrop,
  SOL_ADDRESS,
} from './transfer';
// Note: applyDecimals, removeDecimals, isNativeSol are now canonical in utils/
export type {
  TransferOptions,
  TransferResult,
  EstimateFeeOptions,
  TransferFeeInfo,
} from './transfer';

// NFT functions
export {
  getAll as getAllNfts,
  getAllPaginated as getAllNftsPaginated,
  getAllGroupedByCollection,
  getNftByAddress,
  getCollections,
  getNftsByCollection,
  getNftsWithoutCollection,
  isCollection,
  isMoreThanOne,
  isBlacklisted,
} from './nft';
// NFT types are defined in types/nft.ts — import from there directly

// Domain name services
export {
  getSolDomain,
  resolveSolDomain,
  getAllDomain,
  resolveAllDomain,
  getDomain,
  getDomainFromPublicKey,
  getPublicKeyFromDomain,
} from './domains';

// Swap functions
export {
  getSwapQuote,
  executeSwap,
  swap,
  getExpectedOutput,
  getMinimumOutput,
  getPriceImpact,
  parseQuoteInfo,
} from './swap';
// Swap types are defined in types/swap.ts — import from there directly
// DI function types (GetSwapOrderFn, ExecuteSwapApiFn, GetTokenListFn) remain in ./swap

// Transaction history functions
export {
  getPreparedSolanaTransactions,
  signAndSendPreparedSolanaTransactions,
} from './prepared-transactions';
export type {
  SignAndSendPreparedSolanaTransactionsOptions,
} from './prepared-transactions';

export {
  getRecentTransactions,
  isTransferTransaction,
  isSwapTransaction,
  isNftTransaction,
  isSuccessful,
  isFailed,
  getNetTokenAmount,
  getInvolvedTokens,
  getTransactionDate,
  getTimeAgo,
  isStakingTransaction,
  isTokenMintOrBurn,
} from './transactions';
// Note: getExplorerUrl, getSolscanUrl are now canonical in utils/
export type {
  // Solana transaction types
  SolanaTransactionPaging,
  SolanaTransactionListResponse,
  GetSolanaTransactionsFn,
  // Re-exported from API service (backend-transformed format)
  SolanaTransaction,
  SolanaTransactionsResponse,
  SolanaPagingParams,
  TransactionTokenAmount,
  TransactionFee,
  TransactionType,
  TransactionDisplayStatus,
} from './transactions';

// Validation functions
export { validateDestinationAccount } from './validation';
export type {
  ValidationResult,
  ValidationResultType,
  ValidationResultCode,
  AddressType,
} from './validation';

// OCMS (Off-Chain Message Signing) v1
export {
  buildOffchainMessageV1,
  signOffchainMessage,
  verifyOffchainMessage,
  parseOffchainMessageV1,
} from './offchain-message';
export type { SignedOffchainMessage } from './offchain-message';

// Sign-In-With-Solana (`solana:signIn`)
export {
  buildSiwsMessageText,
  getSiwsDomain,
  prepareSignInMessage,
  signSiwsMessage,
  SiwsDomainMismatchError,
} from './sign-in';
export type {
  PreparedSignInMessage,
  ResolvedSiwsFields,
  SignedSignInMessage,
  SolanaSignInInputFields,
} from './sign-in';
