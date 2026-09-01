// =============================================================================
// Mobile Components - Barrel Exports
// =============================================================================

// ---------------------------------------------------------------------------
// Foundation
// ---------------------------------------------------------------------------

// --- Primitive kit (redesign) ---------------------------------------------

export { Card } from './Card';
export type { CardPadding, CardProps, CardRadius, CardTone } from './Card';

export { KeyValueRow } from './KeyValueRow';
export type { KeyValueRowProps, KeyValueTone } from './KeyValueRow';

export { ListRow } from './ListRow';
export type { ListRowPadding, ListRowProps } from './ListRow';

export { IconBubble } from './IconBubble';
export type {
  IconBubbleProps,
  IconBubbleShape,
  IconBubbleSize,
  IconBubbleTone,
  IconGlyphProps,
} from './IconBubble';

export { Chip, ChipGroup } from './Chip';
export type { ChipGroupProps, ChipOption, ChipProps, ChipSize, ChipVariant } from './Chip';

export { SectionLabel } from './SectionLabel';
export type { SectionLabelProps, SectionLabelVariant } from './SectionLabel';

export { StateBlock } from './StateBlock';
export type { StateBlockProps, StateBlockTone } from './StateBlock';

export { PowerupBadge } from './PowerupBadge';
export type { PowerupBadgeProps, PowerupTier } from './PowerupBadge';

export { HoldToCopyButton, PrimaryButton, SecondaryButton, TextButton } from './Button';
export type {
  HoldToCopyButtonProps,
  PrimaryButtonProps,
  SecondaryButtonProps,
  TextButtonProps,
} from './Button';

export {
  ContentCopySvgIcon,
  SettingsSvgIcon,
  SolanaSvgIcon,
  BitcoinSvgIcon,
  EthereumSvgIcon,
} from './Icon';

export { PasswordInput, PasswordStrengthBar } from './PasswordInput';

export { StepIndicator } from './StepIndicator';
export type { StepIndicatorProps } from './StepIndicator';

export { BrandMark, Wordmark } from './BrandMark';
export type { BrandMarkProps, WordmarkProps } from './BrandMark';

export {
  OnboardingLayout,
  ReservedSlot,
  OnboardingTitle,
  OnboardingDescription,
} from './OnboardingLayout';
export type { OnboardingLayoutProps, ReservedSlotProps } from './OnboardingLayout';

export { ScreenHeader } from './ScreenHeader';
export type { ScreenHeaderProps } from './ScreenHeader';

export { LoadingScreen } from './LoadingScreen';
export type { LoadingScreenProps } from './LoadingScreen';

export { ShimmerRect } from './ShimmerRect';

export { SkeletonRow } from './Skeleton';
export type { SkeletonRowProps } from './Skeleton';

export { SearchField } from './SearchField';
export type { SearchFieldProps } from './SearchField';

export { PendingValue } from './PendingValue';
export type { PendingValueProps } from './PendingValue';

export { default as QRCode } from './QRCode';
export type { QRCodeProps } from './QRCode';

export { QRScanner } from './QRScanner';
export type { QRScannerProps, QRScanResult } from './QRScanner';

export {
  useAddressValidation,
  type BlockchainType,
  type ValidationState,
  type ValidationCallbackResult,
  type UseAddressValidationResult,
  type UseAddressValidationParams,
} from './InputAddress';

export { SeedWordGrid, SeedWordInput, SeedPhraseEntry } from './SeedPhrase';
export type { SeedPhraseEntryProps } from './SeedPhrase';

export { DerivedAccountCard } from './DerivedAccountCard';
export type { DerivedAccountCardProps } from './DerivedAccountCard';

export { SubAccountSelector } from './SubAccountSelector';
export type { SubAccount, SubAccountSelectorProps } from './SubAccountSelector';

export { ConfirmSheet } from './ConfirmSheet';
export type { ConfirmSheetProps } from './ConfirmSheet';

export { WarningNotice } from './WarningNotice';
export type { WarningNoticeProps, WarningNoticeTone } from './WarningNotice';

// ---------------------------------------------------------------------------
// Layout & Background
// ---------------------------------------------------------------------------

export { ScalesBackground } from './ScalesBackground';
export type { ScalesBackgroundProps } from './ScalesBackground';

export { DepthBackground } from './DepthBackground';
export type { DepthBackgroundProps } from './DepthBackground';

export { FleshBackground } from './FleshBackground';
export type { FleshBackgroundProps } from './FleshBackground';

export { BlurContainer, BlurTargetProvider } from './BlurContainer';
export type { BlurContainerProps, BlurTint } from './BlurContainer';

export { BottomSheetTitleHeader } from './BottomSheetTitleHeader';
export type { BottomSheetTitleHeaderProps } from './BottomSheetTitleHeader';

export { BottomSheetContainer, SheetTitle } from './BottomSheetContainer';
export type { BottomSheetContainerProps, SheetTitleProps } from './BottomSheetContainer';

export { Thermocline } from './Thermocline';
export type { ThermoclineProps, ThermoclineTier } from './Thermocline';

// ---------------------------------------------------------------------------
// Sheets & Modals
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Wallet shell chrome
// ---------------------------------------------------------------------------

export { WalletHeader } from './WalletHeader';
export type { WalletHeaderProps } from './WalletHeader';

export { LockOverlay, LockContent } from './LockOverlay';
export type { LockOverlayProps, LockContentProps } from './LockOverlay';

export { ReceiveSheet } from './ReceiveSheet';
export type { ReceiveSheetProps } from './ReceiveSheet';

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export { BalanceHeader } from './BalanceHeader';
export type { BalanceHeaderProps } from './BalanceHeader';
// The chain shapes the balance block speaks are shared contracts; they used to
// reach consumers through `./BalanceCard`, which the redesign deleted.
export type { BlockchainId, BlockchainBalance, BlockchainNetworkInfo } from '@salmon/shared';

export { PortfolioSubTabs } from './PortfolioSubTabs';
export type { PortfolioSubTab, PortfolioSubTabsProps } from './PortfolioSubTabs';
export { UnderlineTabs } from './UnderlineTabs';
export type { UnderlineTab, UnderlineTabsProps, UnderlineTabsSize } from './UnderlineTabs';

export { PowerupsFab } from './PowerupsFab';
export type { PowerupsFabProps } from './PowerupsFab';


export { TokenList, TokenListItem } from './TokenList';
export type { TokenListProps, TokenListItemProps } from './TokenList';

export { TokenSelectorModal, useTokenSearch } from './TokenSelector';
export type {
  TokenSelectorToken,
  TokenSelectorModalProps,
  UseTokenSearchResult,
} from './TokenSelector';

export { TokenLogo } from './TokenLogo';

// ---------------------------------------------------------------------------
// Token Detail
//
// TokenInformationSheet is gone (spec 019 — token detail is a screen,
// `app/(app)/token/[id].tsx`, not a sheet, DESIGN.md §Sheets' state rule).
// TokenAbout and TokenMarketData survive here because Home's Bitcoin column
// still renders them; the screen composes its own Card/KeyValueRow sections
// instead of reusing this BlurContainer-based pair.
// ---------------------------------------------------------------------------

export { TokenAbout } from './TokenDetail/TokenAbout';
export type { TokenAboutProps } from './TokenDetail/TokenAbout';

export { TokenMarketData } from './TokenDetail/TokenMarketData';
export type { TokenMarketDataProps, MarketData } from './TokenDetail/TokenMarketData';

export { PriceChart } from './PriceChart';
export type { PriceChartProps } from './PriceChart';

// ---------------------------------------------------------------------------
// NFT
// ---------------------------------------------------------------------------

export { NftCard, NftCardSkeleton } from './NftCard';
export type {
  NftCardProps,
  NftCardSkeletonProps,
  NftData,
  NftDataBase,
  NftDataSimple,
  NftBlockchain,
  NftAttribute,
  SolanaNftData,
  BitcoinNftData,
} from './NftCard';


export { NftsTab } from './NftsTab';
export type { NftSectionKey, NftSection, NftsTabProps } from './NftsTab';

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

export {
  ACTIVITY_FILTER_KEYS,
  GROUP_LABEL_KEYS,
  groupByDay,
  matchesFilter,
  TransactionItem,
  EmptyState as ActivityEmptyState,
  ErrorState as ActivityErrorState,
  TransactionListSkeleton,
} from './Activity';
export type { ActivityFilter, ActivityGroup, ActivityRow } from './Activity';
export type {
  TransactionItemProps,
  Transaction,
  TransactionType,
  TransactionStatus,
  TransactionTokenAmount,
  TransactionFee,
} from './Activity';

export { TransactionDetail } from './TransactionDetail';
export type { TransactionDetailProps } from './TransactionDetail';

export { TransactionSuccessScreen } from './TransactionSuccessScreen';

export { ReceiptScreen } from './ReceiptScreen';
export type {
  ExchangeReceiptScreenProps,
  ReceiptScreenAction,
  ReceiptScreenProps,
  TransferReceiptScreenProps,
} from './ReceiptScreen';

// ---------------------------------------------------------------------------
// Send / Swap / Bridge
// ---------------------------------------------------------------------------

// The send flow is four screens under `app/(app)/send` (spec 018); what is
// left here are the pieces those screens share.
export { RecipientInput, SendFailure, TokenPickerSheet, TokenSelectList } from './Send';
export type { RecipientInputProps, SendFailureProps, TokenPickerSheetProps } from './Send';

export {
  SwapScreen,
  SwapAmountInput,
  SwapReviewExchange,
  SwapInputScreen,
  SwapReviewScreen,
} from './SwapScreen';
export type {
  SwapToken,
  SwapQuote,
  SwapTab,
  SwapStep,
  SwapChainType,
  SwapScreenProps,
  SwapAmountInputProps,
  SwapReviewExchangeProps,
  SwapInputScreenProps,
  SwapReviewScreenProps,
  BridgeTokenSimple,
  BridgeEstimateSimple,
  BridgeExchangeSimple,
} from './SwapScreen';

export { BridgeRecipientScreen, BridgeReviewScreen, RecipientAddressInput } from './BridgeScreen';
export type {
  BridgeChain,
  BridgeToken,
  BridgeEstimate,
  BridgeExchange,
  BridgeRecipientScreenProps,
  BridgeReviewScreenProps,
  RecipientAddressInputProps,
} from './BridgeScreen';

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export { SettingsScreenLayout } from './SettingsScreenLayout';
export type { SettingsScreenLayoutProps } from './SettingsScreenLayout';

// Settings Selectors
export { LanguageSelector } from './SettingsSelectors/LanguageSelector';
export { NetworkSelector } from './SettingsSelectors/NetworkSelector';
export { CurrencySelector } from './SettingsSelectors/CurrencySelector';
export { ExplorerSelector } from './SettingsSelectors/ExplorerSelector';
export { SettingsSelectorList } from './SettingsSelectors/SettingsSelectorList';
export type { SettingsSelectorListProps } from './SettingsSelectors/SettingsSelectorList';

export { TrustedAppsSelector } from './TrustedAppsSelector';
export { SupportSelector } from './SupportSelector';

// ---------------------------------------------------------------------------
// Account Management
// ---------------------------------------------------------------------------

export { AccountsPanel } from './AccountPanels/AccountsPanel';
export type { AccountsPanelProps } from './AccountPanels/AccountsPanel';

export { WatchOnlyBadge } from './WatchOnlyBadge';
export type { WatchOnlyBadgeProps } from './WatchOnlyBadge';

export { AccountEditPanel } from './AccountPanels/AccountEditPanel';
export type { AccountEditPanelProps } from './AccountPanels/AccountEditPanel';

export { AccountNamePanel } from './AccountPanels/AccountNamePanel';
export type { AccountNamePanelProps } from './AccountPanels/AccountNamePanel';

export { AccountAddPanel } from './AccountPanels/AccountAddPanel';
export type { AccountAddPanelProps } from './AccountPanels/AccountAddPanel';

export { AccountAvatarPanel } from './AccountPanels/AccountAvatarPanel';
export type { AccountAvatarPanelProps } from './AccountPanels/AccountAvatarPanel';

// ---------------------------------------------------------------------------
// Address Book
// ---------------------------------------------------------------------------

export { AddressBookPanel } from './AddressPanels/AddressBookPanel';
export { AddressAddPanel } from './AddressPanels/AddressAddPanel';
export { AddressEditPanel } from './AddressPanels/AddressEditPanel';

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export { SecurityPanel } from './SecurityPanel';
export type { SecurityPanelProps } from './SecurityPanel';

export { PrivateKeyPanel } from './PrivateKeyPanel';
export type { PrivateKeyPanelProps } from './PrivateKeyPanel';

export { BackupPanel } from './BackupPanel';
export { AboutPanel } from './AboutPanel';

export { PendingActivityBanner } from './PendingActivityBanner';
export type { PendingActivityBannerProps } from './PendingActivityBanner';
