/**
 * Hooks module for shared React hooks.
 *
 * Domain types (BlockchainType, Account, TokenInfo, etc.) are now exported
 * from '../types' rather than from individual hooks. Only hook-specific
 * contract types (Use* prefixed) are re-exported here.
 *
 * @module hooks
 */

// Account management hook
export { useAccounts } from './useAccounts';
export type {
  UseAccountsState,
  UseAccountsActions,
} from './useAccounts';

// User configuration hook
export { useUserConfig } from './useUserConfig';
export type {
  UseUserConfigParams,
  UseUserConfigResult,
} from './useUserConfig';


// Runtime detection hook
export { useRuntime } from './useRuntime';
export type { RuntimeInfo } from './useRuntime';
export { ADAPTER_PREFIXES } from './useRuntime';

// Language management hook
export { useLanguage } from './useLanguage';
export type { UseLanguageResult } from './useLanguage';

// Inactivity timeout hook
export { useInactivityTimeout } from './useInactivityTimeout';
export type {
  UseInactivityTimeoutParams,
  UseInactivityTimeoutResult,
} from './useInactivityTimeout';

// Available networks hook
export {
  useAvailableNetworks,
  fetchAndMergeNetworkConfigs,
} from './useAvailableNetworks';
export type {
  UseAvailableNetworksResult,
} from './useAvailableNetworks';

// Balance hook
export { useBalance } from './useBalance';
export type {
  UseBalanceParams,
  UseBalanceResult,
} from './useBalance';

// Transactions hook
export { useTransactions } from './useTransactions';
export type {
  UseTransactionsParams,
  UseTransactionsResult,
} from './useTransactions';

// Send transaction hook
export { useSendTransaction } from './useSendTransaction';
export type {
  UseSendTransactionParams,
  UseSendTransactionResult,
} from './useSendTransaction';

// Swap hook
export { useSwap } from './useSwap';
export type {
  UseSwapParams,
  UseSwapResult,
} from './useSwap';

// Bridge hook
export { useBridge } from './useBridge';
export type {
  UseBridgeParams,
  UseBridgeResult,
} from './useBridge';

export { useDAppMetadata } from './useDAppMetadata';
export type { UseDAppMetadataResult } from './useDAppMetadata';

// Coin market data hook (BTC + selected token detail in web/extension)
export { useCoinMarketData } from './useCoinMarketData';
export type {
  UseCoinMarketDataParams,
  UseCoinMarketDataResult,
  MarketChartPoint,
} from './useCoinMarketData';

// Jupiter token list hook (shared between mobile/web/extension swap entries)
export { useJupiterTokenList } from './useJupiterTokenList';
export type {
  UseJupiterTokenListParams,
  UseJupiterTokenListResult,
} from './useJupiterTokenList';

// Multi-chain tokens hook (for unified swap/bridge)
export {
  useMultiChainTokens,
} from './useMultiChainTokens';
export type {
  ChainType,
  UseMultiChainTokensParams,
  UseMultiChainTokensResult,
} from './useMultiChainTokens';

// Token search hook (used by TokenSelector in ui and ui-extension)
export { useTokenSearch } from './useTokenSearch';

// Address validation hook (used by InputAddress in ui and ui-extension)
export { useAddressValidation } from './useAddressValidation';
export type {
  UseAddressValidationResult,
  UseAddressValidationParams,
} from './useAddressValidation';

// Open link hook (used by settings screens)
export { useOpenLink } from './useOpenLink';

// NFT transfer hook (shared between mobile & extension)
export { useNftTransfer } from './useNftTransfer';
export type {
  UseNftTransferParams,
  UseNftTransferResult,
  NftTransferStatus,
} from './useNftTransfer';

export { useNftBurn } from './useNftBurn';
export type {
  UseNftBurnParams,
  UseNftBurnResult,
  NftBurnStatus,
} from './useNftBurn';

// SwapScreen logic hook (shared between mobile & extension)
export { useSwapScreenLogic } from './useSwapScreenLogic';
export type {
  UseSwapScreenLogicParams,
  UseSwapScreenLogicResult,
} from './useSwapScreenLogic';

// Send contacts hook (address book + own wallets for send flow)
export { useSendContacts } from './useSendContacts';

// Address book hook
export { useAddressbook, AddressbookError } from './useAddressbook';
export type {
  UseAddressbookParams,
  UseAddressbookState,
  UseAddressbookActions,
  UseAddressbookResult,
  AddressbookErrorKind,
} from './useAddressbook';

// Address book form hook (shared form logic for Add/Edit screens)
export { useAddressBookForm } from './useAddressBookForm';
export type {
  AddressBookFormInitial,
  UseAddressBookFormResult,
} from './useAddressBookForm';

// Avatar NFTs hook (shared between mobile & extension)
export { useAvatarNfts } from './useAvatarNfts';
export type {
  UseAvatarNftsParams,
  UseAvatarNftsResult,
} from './useAvatarNfts';

// Solana NFT list hook (shared between mobile, web, extension collectibles screens)
export { useSolanaNfts } from './useSolanaNfts';
export type {
  UseSolanaNftsParams,
  UseSolanaNftsResult,
} from './useSolanaNfts';

// Settings panel stack hook
export { useSettingsPanelStack } from './useSettingsPanelStack';
export type { UseSettingsPanelStackResult } from './useSettingsPanelStack';

// Anonymous usage-analytics consent
export { useAnalyticsConsent } from './useAnalyticsConsent';
export type { UseAnalyticsConsentResult } from './useAnalyticsConsent';

// Currency context (re-export for discoverability)
export { useCurrencyContext } from '../contexts/CurrencyContext';
export type { CurrencyState, CurrencyActions } from '../contexts/CurrencyContext';
