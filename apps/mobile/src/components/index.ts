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
  WalletSvgIcon,
  ContentCopySvgIcon,
  SettingsSvgIcon,
  SolanaSvgIcon,
  BitcoinSvgIcon,
  EthereumSvgIcon,
  GridViewSvgIcon,
  HomeSvgIcon,
  SwapSvgIcon,
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

export { PendingValue } from './PendingValue';
export type { PendingValueProps } from './PendingValue';

export { default as QRCode } from './QRCode';
export type { QRCodeProps } from './QRCode';

export { QRScanner, default as QRScannerDefault } from './QRScanner';
export type { QRScannerProps, QRScanResult } from './QRScanner';

export {
  InputAddress,
  useAddressValidation,
  type InputAddressProps,
  type BlockchainType,
  type ValidationState,
  type ValidationCallbackResult,
  type UseAddressValidationResult,
  type UseAddressValidationParams,
} from './InputAddress';

export { SeedWordGrid, SeedWordInput, SeedPhraseEntry } from './SeedPhrase';
export type { SeedPhraseEntryProps } from './SeedPhrase';

export { DerivedAccountCard, DerivedAccountCardSkeleton } from './DerivedAccountCard';
export type {
  DerivedAccountCardProps,
  DerivedAccountCardSkeletonProps,
} from './DerivedAccountCard';

export { SubAccountSelector } from './SubAccountSelector';
export type { SubAccount, SubAccountSelectorProps } from './SubAccountSelector';

export { ConfirmSheet } from './ConfirmSheet';
export type { ConfirmSheetProps } from './ConfirmSheet';

export { WarningNotice } from './WarningNotice';
export type { WarningNoticeProps, WarningNoticeTone } from './WarningNotice';

// ---------------------------------------------------------------------------
// Layout & Background
// ---------------------------------------------------------------------------

export { GradientBackground } from './GradientBackground';
export type { GradientBackgroundProps } from './GradientBackground';

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

export { PowerupsFab } from './PowerupsFab';
export type { PowerupsFabProps } from './PowerupsFab';


export { TokenList, TokenListItem, TokenListSkeleton } from './TokenList';
export type {
  TokenListProps,
  TokenListItemProps,
  TokenListSkeletonProps,
} from './TokenList';

export { TokenSelector, TokenSelectorModal, useTokenSearch } from './TokenSelector';
export type {
  TokenSelectorToken,
  TokenSelectorProps,
  TokenSelectorModalProps,
  UseTokenSearchResult,
} from './TokenSelector';

export { TokenLogo } from './TokenLogo';

// ---------------------------------------------------------------------------
// Token Detail (TokenInformationSheet + sub-components)
// ---------------------------------------------------------------------------

export { TokenInformationSheet } from './TokenInformationSheet';
export type { TokenInformationSheetProps, CoinInfo } from './TokenInformationSheet';

export { TokenAbout } from './TokenInformationSheet/TokenAbout';
export type { TokenAboutProps } from './TokenInformationSheet/TokenAbout';

export { TokenMarketData } from './TokenInformationSheet/TokenMarketData';
export type { TokenMarketDataProps, MarketData } from './TokenInformationSheet/TokenMarketData';

export { TokenFeatures } from './TokenInformationSheet/TokenFeatures';
export type { TokenFeaturesProps } from './TokenInformationSheet/TokenFeatures';

export { TokenInfo } from './TokenInformationSheet/TokenInfo';
export type { TokenInfoProps } from './TokenInformationSheet/TokenInfo';

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

export { NftDetailSheet } from './NftDetailSheet';
export type { NftDetailSheetProps, NftDetailData } from './NftDetailSheet';

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

// ---------------------------------------------------------------------------
// Send / Swap / Bridge
// ---------------------------------------------------------------------------

// The send flow is four screens under `app/(app)/send` (spec 018); what is
// left here are the pieces those screens share.
export { RecipientInput, SendFailure, TokenSelectList } from './Send';
export type { RecipientInputProps, SendFailureProps } from './Send';

export {
  SwapScreen,
  SwapTabSelector,
  SwapAmountInput,
  SwapDetailRow,
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
  SwapTabSelectorProps,
  SwapAmountInputProps,
  SwapDetailRowProps,
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
