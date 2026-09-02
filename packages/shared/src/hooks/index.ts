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
export type { UseAccountsState, UseAccountsActions } from './useAccounts';

// User configuration hook
export { useUserConfig } from './useUserConfig';
export type {
  ToggleDeveloperNetworksOptions,
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

// Unlock throttling (failed-password backoff, for the lock screens)
export { useUnlockThrottle } from './useUnlockThrottle';
export type { UseUnlockThrottleResult } from './useUnlockThrottle';

// Available networks hook
export { useAvailableNetworks, fetchAndMergeNetworkConfigs } from './useAvailableNetworks';
export type { UseAvailableNetworksResult } from './useAvailableNetworks';

// Balance hook
export { useBalance } from './useBalance';
export type { UseBalanceParams, UseBalanceResult, BalanceLoadState } from './useBalance';
export { usePrefetchBalances } from './usePrefetchBalances';
export type { UsePrefetchBalancesParams } from './usePrefetchBalances';

// Transactions hook
export { useTransactions } from './useTransactions';
export type { UseTransactionsParams, UseTransactionsResult } from './useTransactions';

// Wait-screen gate — 400ms before a wait screen may mount, 600ms minimum once
// it has. Keeps a short wait from flickering a screen at the user.
export { useWaitGate } from './useWaitGate';
export type { UseWaitGateOptions } from './useWaitGate';
export { useWaitExit } from './useWaitExit';
export type { WaitExit } from './useWaitExit';

// Copied-confirmation state for copy buttons — the call site does the actual
// clipboard write, then calls trigger(); the hook holds `copied` for
// motionMs.feedbackHold and reverts.
export { useCopyFeedback } from './useCopyFeedback';
export type { CopyFeedbackKey, UseCopyFeedbackResult } from './useCopyFeedback';

// Send transaction hook
export { usePendingActivity } from './usePendingActivity';
export type {
  PendingActivityItem,
  PendingActivityKind,
  UsePendingActivityResult,
} from './usePendingActivity';

export { useSendTransaction } from './useSendTransaction';
export type { UseSendTransactionParams, UseSendTransactionResult } from './useSendTransaction';

// The send flow's state (token, recipient, amount, fee, submit) — one
// implementation; mobile wraps it in a provider, the DOM calls it directly.
export { useSendFlowState } from './useSendFlowState';
export type { UseSendFlowStateParams, SendFlowState } from './useSendFlowState';

// The NFT flow's state (recipient, transfer, burn preview, receipt) — the
// transaction hooks are the same ones both platforms always called
export { useNftFlowState } from './useNftFlowState';
export type { UseNftFlowStateParams, NftFlowState, NftSuccessKind } from './useNftFlowState';

// Completes an older wallet's mirror addresses when Developer Networks asks
export { useEnsureMirrorNetworks } from './useEnsureMirrorNetworks';

// Private-key import hook
export { useImportPrivateKey } from './useImportPrivateKey';
export type { UseImportPrivateKeyParams, UseImportPrivateKeyResult } from './useImportPrivateKey';
export { useImportWatchOnly } from './useImportWatchOnly';
export type { UseImportWatchOnlyParams, UseImportWatchOnlyResult } from './useImportWatchOnly';

// Swap hook
export { useSwap } from './useSwap';
export type { UseSwapParams, UseSwapResult } from './useSwap';

export { useDAppMetadata } from './useDAppMetadata';
export type { UseDAppMetadataResult } from './useDAppMetadata';

export { useSolanaTransactionApproval } from './useSolanaTransactionApproval';
export type {
  UseSolanaTransactionApprovalParams,
  UseSolanaTransactionApprovalResult,
} from './useSolanaTransactionApproval';

// Coin market data hook (BTC + selected token detail in web/extension)
export { useCoinMarketData } from './useCoinMarketData';
export type {
  UseCoinMarketDataParams,
  UseCoinMarketDataResult,
  MarketChartPoint,
} from './useCoinMarketData';

// Jupiter token list hook (shared between mobile/web/extension swap entries)
export { useJupiterTokenList } from './useJupiterTokenList';
export type { UseJupiterTokenListParams, UseJupiterTokenListResult } from './useJupiterTokenList';

// Multi-chain tokens hook
export { useMultiChainTokens } from './useMultiChainTokens';
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
export type { UseNftBurnParams, UseNftBurnResult, NftBurnStatus } from './useNftBurn';

// SwapScreen logic hook (shared between mobile & extension)
export { useSwapScreenLogic } from './useSwapScreenLogic';
export type { UseSwapScreenLogicParams, UseSwapScreenLogicResult } from './useSwapScreenLogic';

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
export type { AddressBookFormInitial, UseAddressBookFormResult } from './useAddressBookForm';

// Avatar NFTs hook (shared between mobile & extension)
export { useAvatarNfts } from './useAvatarNfts';
export type { UseAvatarNftsParams, UseAvatarNftsResult } from './useAvatarNfts';

// Solana NFT list hook (shared between mobile, web, extension collectibles screens)
export { useSolanaNfts } from './useSolanaNfts';
export type { UseSolanaNftsParams, UseSolanaNftsResult } from './useSolanaNfts';

// Settings panel stack hook
export { useWalletTotals, sumIncludedTotals } from './useWalletTotals';
export type { UseWalletTotalsParams, UseWalletTotalsResult } from './useWalletTotals';

export { useSettingsPanelStack } from './useSettingsPanelStack';
export type { UseSettingsPanelStackResult } from './useSettingsPanelStack';

// Anonymous usage-analytics consent
export { useAnalyticsConsent } from './useAnalyticsConsent';
export type { UseAnalyticsConsentResult } from './useAnalyticsConsent';

// Currency context (re-export for discoverability)
export { useCurrencyContext } from '../contexts/CurrencyContext';
export type { CurrencyState, CurrencyActions } from '../contexts/CurrencyContext';

// Home sub-tab order (persisted arrangement + reconciliation)
export { useHomeTabOrder, reconcileTabOrder } from './useHomeTabOrder';
export type { UseHomeTabOrderResult } from './useHomeTabOrder';

// Derived-account scan (finds a seed's funded paths; the user picks)
export { useDerivedAccountsScan, findDerivedAccounts } from './useDerivedAccountsScan';
export type { DerivedAccountFind, UseDerivedAccountsScanResult } from './useDerivedAccountsScan';

// Form state the kit renders on both platforms; the vault calls are injected
export { usePasswordConfirm } from './usePasswordConfirm';
export type { PasswordConfirmState, UsePasswordConfirmParams } from './usePasswordConfirm';
export { useChangePassword } from './useChangePassword';
export type { UseChangePasswordParams } from './useChangePassword';

// Home shell (page index, per-page balances, offered sub-tabs, the swap's owner)
export {
  useHomeShell,
  HOME_TAB_KEYS,
  blockchainIdOf,
  mapBalanceToToken,
  buildBitcoinToken,
} from './useHomeShell';
export type {
  HomeSubTabKey,
  HomeSwapCause,
  UseHomeShellParams,
  UseHomeShellResult,
} from './useHomeShell';
