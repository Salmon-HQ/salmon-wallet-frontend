// Ethereum Account
export { EthereumAccount } from './EthereumAccount';
// Note: WEI_PER_ETH removed — use WEI_PER_ETH_BIGINT from utils/decimals
export type { EthereumAccountOptions, EthereumBalance } from './EthereumAccount';

// Factory functions and utilities
export {
  createEthereumAccount,
  createEthereumAccountFromWallet,
  createEthereumAccountFromPrivateKey,
  deriveEthereumAccounts,
  getEthereumDerivationPath,
  ETHEREUM_COIN_TYPE,
  ETHEREUM_NETWORKS,
} from './factory';
export type { CreateEthereumAccountOptions, DeriveEthereumAccountsOptions } from './factory';

// Balance functions
export {
  getEthBalance,
  getEthereumTokenBalance,
  getEthereumTokenBalances,
  getBalance,
  formatBalanceDisplay,
} from './balance';
// Note: ETH_CONSTANTS, ERC20_ABI → utils/tokens
// Note: WEI_PER_ETH_BIGINT, ethToWei, weiToEth → utils/decimals
// Note: isZeroBalance, compareBalances → utils/balance
export type {
  EthereumTokenBalance as BalanceEthereumTokenBalance,
  EthereumOnChainWalletBalance,
  EthereumWalletBalance as BalanceEthereumWalletBalance,
  TokenInfo as BalanceTokenInfo,
  EthereumTokenBalanceResult,
} from './balance';

// Token functions
export {
  getTokenInfo,
  getTokensByOwner,
  getFeaturedTokens,
  getFeaturedTokenBySymbol,
  getFeaturedTokenByAddress,
  isErc20Token,
  formatTokenBalance,
  detectAllTokens,
  getAllTokensForOwner,
  ETHEREUM_NETWORK_IDS,
} from './tokens';
export type {
  EthereumToken,
  EthereumTokenBalance,
  TokenDetectionResult,
  DetectedERC20Token,
} from './tokens';
// Note: EthereumNetworkId is canonical in types/blockchain — import from there directly

// Validation functions
export {
  validateDestinationAccount as validateEthereumDestinationAccount,
  isEthereumAddress,
  isEnsDomain,
} from './validation';
export type {
  ValidationResult as EthereumValidationResult,
  ValidationResultType as EthereumValidationResultType,
  ValidationResultCode as EthereumValidationResultCode,
} from './validation';

// Transfer functions
export {
  estimateTransferFee as estimateEthereumTransferFee,
  createTransferTransaction as createEthereumTransferTransaction,
  sendTransaction as sendEthereumTransaction,
  confirmTransaction as confirmEthereumTransaction,
  formatAmount as formatEthereumAmount,
} from './transfer';
// Note: isNativeEth, createNativeToken, createERC20Token, createERC721Token,
// createERC1155Token, ETH_ADDRESS, ETH_ADDRESS_ALT → utils/tokens
// Note: TokenType, TransferToken → utils/tokens
// Note: parseAmount → utils/decimals
export type {
  TransferOptions as EthereumTransferOptions,
  TransferResult as EthereumTransferResult,
  GasEstimate as EthereumGasEstimate,
} from './transfer';
