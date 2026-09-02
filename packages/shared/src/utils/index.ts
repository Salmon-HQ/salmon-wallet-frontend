// URL utilities
export { normalizeIpfsUrl, DEAD_DOMAINS, getExplorerUrl, getSolscanUrl, formatOrigin } from './url';
export {
  approveSolanaSignIn,
  approveSolanaSignMessage,
  approveSolanaSignOffchainMessage,
  approveSolanaTransactionRequest,
  buildTransactionFromEncodedMessage,
  decodeDAppMessage,
  getDAppTransactionRequestSummary,
  isSecureOrigin,
  isTransactionLookalike,
  loadSolanaTransactionApprovalDetails,
  parseOffchainMessageForApproval,
  previewSolanaApprovalEffects,
  serializeSignedTransactionFromApproval,
  serializeSignedTransactionsFromApproval,
  TransactionLookalikeMessageError,
} from './dapp-approval';
export type { SolanaTransactionApprovalDetails } from './dapp-approval';

// Account utilities
export {
  getPathIndex,
  getBlockchainFromNetworkId,
  getChainDisplayName,
  getAccountBlockchainType,
  isSolanaAccount,
  isSignableSolanaAccount,
  isSignableAccount,
  isBitcoinAccount,
  isEthereumAccount,
  generateAccountId,
  generateAccountName,
  createBlockchainAccountForNetwork,
  createBlockchainAccountFromPrivateKey,
  createBlockchainAccountForWatchOnly,
  collectSolanaAddresses,
  buildNetworkListFromAccount,
  getAccountKeysForNetwork,
  getAccountAddress,
  getActiveSolanaApprovalAccount,
} from './account';

// Account secret / vault serialization
export {
  toAccountSecret,
  toStoredSecret,
  buildSecretVault,
  getAccountMnemonic,
  isImportedAccount,
  isWatchOnlyAccount,
} from './account-secret';
export type { StoredSecret, SecretVault } from './account-secret';

// Native-fee requirements
export {
  getRequiredSol,
  getSolShortfall,
  SOLANA_BASE_FEE_LAMPORTS,
  SOLANA_TOKEN_ACCOUNT_RENT_LAMPORTS,
} from './sol-fees';
export type { SolRequirementParams } from './sol-fees';

// Avatar utilities
export {
  getAvatar,
  getRandomAvatar,
  getInitials,
  AVATAR_BASE_URL,
  PRESET_AVATAR_COUNT,
  PRESET_AVATAR_URLS,
  isPresetAvatar,
} from './avatar';

// Address utilities
export { chunkAddress, getShortAddress, truncateHash } from './address';
export { classifyTransactionError } from './transaction-errors';
export { sanitizeDecimalInput } from './decimal-input';

// How a pasted recovery phrase lays out across one-word boxes. Shared so the
// mobile grid, the DOM grid and both paste buttons cannot disagree.
export { distributePhrase, splitPhrase, LONG_PHRASE, SHORT_PHRASE } from './seed-phrase';
export type { DistributedPhrase } from './seed-phrase';

// Clipboard utilities (web only - use expo-clipboard for native)
export { copyToClipboard, pasteFromClipboard } from './clipboard';

// Responsive scaling utilities
export {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  scale,
  s,
  verticalScale,
  vs,
  moderateScale,
  ms,
  moderateVerticalScale,
  mvs,
} from './scaling';

// Formatting utilities
export {
  // Types
  type LabelType,
  type Currency,
  // Constants
  hiddenValue,
  // Amount formatting
  formatAmount,
  formatBaseUnits,
  formatTokenAmount,
  showAmount,
  showValue,
  // Percentage utilities
  isPositive,
  isNegative,
  isNeutral,
  getLabelValue,
  formatPercentage,
  showPercentage,
  // Currency formatting
  formatCurrency,
  // Change formatting
  showAbsoluteChange,
  // Display formatting
  formatLargeNumber,
  formatUSD,
  formatRawAmount,
  formatTokenBalance,
  formatUsdPrecise,
  formatAmountWithSymbol,
  formatPercentageCompact,
  formatPercent,
  formatSolFee,
  formatConversionRate,
  formatEffectiveRate,
  // Balance/price display formatting
  formatBalance,
  formatUsdValue,
  formatPercentChange,
  // Price impact
  type PriceImpactSeverity,
  PRICE_IMPACT_THRESHOLDS,
  getPriceImpactSeverity,
  // Price performance
  isPositivePerformance,
} from './formatting';

// Decimal & unit conversion utilities
export {
  // Constants
  SATOSHIS_PER_BTC,
  WEI_PER_ETH_BIGINT,
  // Generic conversions
  applyDecimals,
  removeDecimals,
  parseAmount,
  // ETH conversions
  ethToWei,
  weiToEth,
  weiToEthNumber,
  // BTC conversions
  btcToSatoshis,
  satoshisToBtc,
} from './decimals';

// Token utilities
export {
  // Token search
  filterTokensLocally,
  // CoinGecko
  KNOWN_COINGECKO_IDS,
  lookupCoingeckoId,
  hexToBalance,
  formatERC20TokenBalance,
  mergeTokenLists,
  getTokenKey,
  // ETH constants
  ETH_CONSTANTS,
  ETH_ADDRESS,
  ETH_ADDRESS_ALT,
  ERC20_ABI,
  // Native token checks
  isNativeSol,
  isNativeEth,
  // Ethereum transfer token types & factories
  type TokenType,
  type TransferToken,
  createNativeToken,
  createERC20Token,
  createERC721Token,
  createERC1155Token,
  // Feature badge colors
  DEFAULT_FEATURE_COLORS,
  getFeatureColor,
} from './tokens';

// Currency formatting utilities
export {
  getCurrencySymbol,
  getCurrencyLabel,
  formatFiatValue,
  formatFiatPrice,
  formatFiatLarge,
  formatFiatChange,
  formatFiatPrecise,
  formatFiatIntl,
} from './currencyFormatting';

// Date utilities
export {
  formatRelativeTime,
  formatDate,
  formatTime,
  formatDateTime,
  formatBlockNumber,
  formatRelativeTimeCompact,
  formatDateString,
} from './date';

// Balance decoration & calculation utilities
export {
  // Types
  type TokenBalance,
  type TokenBalanceWithPrice,
  type WalletBalance,
  // Constants
  SOL_CONSTANTS,
  LAMPORTS_PER_SOL,
  // Bigint helpers
  isZeroBalance,
  compareBalances,
} from './balance';

// Cache utilities
export { SmartCache } from './cache';
export type { SmartCacheOptions } from './cache';

// Platform detection utilities
export { isReactNative, isWebEnvironment, isExtension } from './platform';

// Network utilities
export {
  MAINNET_NETWORK_IDS,
  MAINNET_NETWORK_ID,
  MIRROR_NETWORK_IDS,
  sortNetworks,
  getNetworkLabel,
  getNetworkName,
  isMainnetNetworkId,
  getMainnetSibling,
  visibleNetworkIds,
} from './network';
export type { VisibleNetworkIdsParams } from './network';

// Validation utilities
export { VALIDATION_MESSAGES, getValidationState, getMessageType } from './validation';

// Swap utilities
export { isSameChain, mapToSwapToken, unifiedToSwapToken } from './swap';

// Transaction transform utilities
export {
  transformSolanaTransaction,
  transformMultichainTransaction,
  getTransactionDescription,
} from './transactions';

// Content loader (platform-split: native uses react-content-loader/native, web uses SVG)
export { ContentLoader, Rect, Circle } from './ContentLoader';

// NFT utilities
export {
  isImageContent,
  isSvgImage,
  isAnimatedImage,
  getNftImageType,
  bitcoinOrdinalToNftData,
  solanaNftToNftData,
  canonicalNftToSolanaNftData,
  isSolanaNft,
  isBitcoinNft,
  getNftBlockchainLabel,
  getSatRarityColor,
  getNftSectionTitle,
  SECTION_TO_NETWORK,
  INITIAL_NFT_SECTIONS,
} from './nft';

// Unlock throttling (failed-password backoff)
export {
  getUnlockPenalty,
  recordFailedUnlock,
  clearUnlockPenalty,
  unlockDelayMs,
  UNLOCK_FREE_ATTEMPTS,
  UNLOCK_DELAY_SCHEDULE_MS,
} from './unlock-throttle';
export type { UnlockPenalty } from './unlock-throttle';

// Legacy migration (v2 -> v3)
export { migrateLegacyWallets } from './legacy-migration';
export type { MigrationDeps, MigrationResult } from './legacy-migration';

// Price constants & helpers
export { BLOCKCHAIN_TO_COINGECKO, PERIOD_TO_DAYS, coinInfoToMarketData } from './price-constants';

// Legacy local blockchain config helpers.
// Backend `/v1/networks` is the runtime source of truth for enablement.
export { ENABLED_BLOCKCHAINS, isBlockchainEnabled } from '../config/blockchains';

// Derived-accounts scanning utilities (shared between mobile and extension)
export {
  // Constants
  GAP_LIMIT,
  NETWORK_DISPLAY,
  // Types
  type NetworkDisplayInfo,
  type DerivedAccountInfo,
  type ScanDerivedAccountsResult,
  // Functions
  getAccountBalance,
  getScanNetworks,
  getMirrorNetworks,
  getScanNetworksWithMirrors,
  ensureMirrorNetworks,
  formatDerivedAccountBalance,
  getMirrorNetworkId,
  scanDerivedAccounts,
} from './derived-accounts';
export { ACTIVITY_FILTER_KEYS, GROUP_LABEL_KEYS, groupByDay, matchesFilter } from './activityRows';
export { balanceCues } from './balanceCues';
export type { BalanceCue, BalanceCues } from './balanceCues';
export {
  CONFIRMATION_CONFIG,
  CONFIRMATION_LABEL_KEYS,
  COUNTERPARTY_ADDRESS_CHARS,
  STATUS_LABEL_KEYS,
  TYPE_LABEL_KEYS,
  conversionRateFor,
  describeTransactionRow,
  transactionCounterparty,
  transactionStatusDisplayFor,
  transactionTypeDisplayFor,
} from './transactionDisplay';
export type {
  ConfirmationTone,
  ConversionRate,
  TransactionSentence,
  TransactionStatusDisplay,
  TransactionStatusGlyph,
  TransactionTypeDisplay,
  TransactionTypeGlyph,
} from './transactionDisplay';
export { orderWalletCards } from './walletCards';
export type { WalletCard } from './walletCards';
export { MAX_RECENTS, recipientOptions } from './recipientOptions';
export type { RecipientOption, RecipientOptions } from './recipientOptions';
export { RESAMPLE_POINTS, buildLinePath, getDataBounds, resampleYs } from './priceChartPath';
export type { ChartBounds } from './priceChartPath';
export { APPEARANCE_OPTIONS } from './appearanceOptions';
export type { AppearanceOption } from './appearanceOptions';
export type { ActivityFilter, ActivityGroup, ActivityRow } from './activityRows';
export type {
  NftBlockchain,
  // NftAttribute is exported from blockchain/solana/nft
  NftDataBase,
  NftData,
  NftDataSimple,
  SolanaNftData,
  BitcoinNftData,
  SolanaNftFromHelius,
  NftSectionKey,
  NftSection,
  NftsBySection,
} from './nft';
