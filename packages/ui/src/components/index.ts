/**
 * @salmon/ui - Shared web UI components
 *
 * React DOM + MUI components for apps/extension.
 * All components use design tokens from @salmon/shared for consistent styling.
 */

// Button components - Primary, Secondary, and Text action buttons
export { PrimaryButton, SecondaryButton, TextButton } from './Button';
export type { PrimaryButtonProps, SecondaryButtonProps, TextButtonProps } from './Button';

// Icon components - Common SVG icons
export {
  ActivityIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  ReceiveIcon,
  RefreshIcon,
  SendIcon,
  SettingsIcon,
  SolanaSvgIcon,
  WalletIcon,
} from './Icon';
export type { IconProps } from './Icon';

// Icon - Unified icon component
export { Icon } from './Icon';
export type { UnifiedIconProps } from './Icon';

// WalletHeader - Account info and settings navigation
export { WalletHeader } from './WalletHeader';
export type { WalletHeaderProps } from './WalletHeader';

// TokenList - Token list display components
export { TokenList, TokenListItem, TokenListSkeleton, TokenLogo } from './TokenList';
export type {
  TokenListItemProps,
  TokenListProps,
  TokenListSkeletonProps,
  TokenLogoProps,
} from './TokenList';

// LoadingScreen - Animated loading overlay
export { LoadingScreen } from './LoadingScreen';
export type { LoadingScreenProps } from './LoadingScreen';

// PriceChart - Token price history chart with time period selector
export { PriceChart } from './PriceChart';
export type { PriceChartProps } from './PriceChart';

// TokenInfo - Token information display (description, market stats, contract)
export { TokenInfo } from './TokenInfo';
export type { TokenInfoProps } from './TokenInfo';

// TokenAbout - Token description/about section with glassmorphism
export { TokenAbout } from './TokenAbout';
export type { TokenAboutProps } from './TokenAbout';

// TokenMarketData - Token market statistics with glassmorphism
export { TokenMarketData } from './TokenMarketData';
export type { MarketData, TokenMarketDataProps } from './TokenMarketData';

// TokenFeatures - Token characteristics/features badges
export { TokenFeatures } from './TokenFeatures';
export type { TokenFeaturesProps } from './TokenFeatures';

// SettingsPanelStack - Stacking panel system for settings navigation
export { SettingsPanelStack } from './SettingsPanelStack';
export type {
  SettingsPanelStackProps,
  PanelContentProps,
  PanelRenderer,
  PanelRegistry,
} from './SettingsPanelStack';

// WatchOnlyBadge - Marks a wallet that can be read but not operated
export { WatchOnlyBadge } from './WatchOnlyBadge';
export type { WatchOnlyBadgeProps } from './WatchOnlyBadge';

// WalletSwitcherSheet - Account selection dialog
export { WalletSwitcherSheet } from './WalletSwitcherSheet';
export type { AccountListItemProps, WalletSwitcherSheetProps } from './WalletSwitcherSheet';

// BrandMark - the salmon mark, drawn from the vector rather than Logo.png
export { BrandMark, Wordmark } from './BrandMark';
export type { BrandMarkProps, WordmarkProps } from './BrandMark';

// OnboardingLayout - the DOM half of the onboarding slot grid
export {
  OnboardingLayout,
  OnboardingTitle,
  OnboardingDescription,
  ReservedSlot,
} from './OnboardingLayout';
export type {
  OnboardingLayoutProps,
  OnboardingTextProps,
  ReservedSlotProps,
} from './OnboardingLayout';

// LockScreen - the shared unlock screen for web and extension
export { LockScreen } from './LockScreen';
export type { LockScreenProps } from './LockScreen';

// ScreenHeader - Common header for onboarding/auth screens
export { ScreenHeader } from './ScreenHeader';
export type { ScreenHeaderProps } from './ScreenHeader';

// StepIndicator - Progress indicator for multi-step flows
export { StepIndicator } from './StepIndicator';
export type { StepIndicatorProps } from './StepIndicator';

// GradientBackground - Linear gradient container component
export { GradientBackground } from './GradientBackground';
export type { GradientBackgroundProps } from './GradientBackground';

// BlurContainer - Blur effect container with backdrop-filter
export { BlurContainer } from './BlurContainer';
export type { BlurContainerProps, BlurTint } from './BlurContainer';

// FadeThrough - keyed top-level content swap under a persistent frame
export { FadeThrough } from './FadeThrough';
export type { FadeThroughProps } from './FadeThrough';

// SinkFloat - keyed content swap that speaks the transition verb: sink, beat, float
export { SinkFloat } from './SinkFloat';
export type { SinkFloatProps } from './SinkFloat';

// PendingValue - a value being recalculated inside a container that stays put
export { PendingValue } from './PendingValue';
export type { PendingValueProps } from './PendingValue';

// PendingActivityBanner - Global in-flight transaction surface
export { PendingActivityBanner } from './PendingActivityBanner';
export type { PendingActivityBannerProps } from './PendingActivityBanner';

// WarningNotice - Icon-led alert banner for security/failure states
export { WarningNotice } from './WarningNotice';
export type { WarningNoticeProps, WarningNoticeTone } from './WarningNotice';

// WalletInitErrorScreen - blocking gate for failed wallet initialization
export { WalletInitErrorScreen } from './WalletInitErrorScreen';
export type { WalletInitErrorScreenProps } from './WalletInitErrorScreen';

// ScalesBackground - Repeating fish scales pattern background
export { ScalesBackground } from './ScalesBackground';
export type { ScalesBackgroundProps, ScalesVariant } from './ScalesBackground';

export { Thermocline } from './Thermocline';
export type { ThermoclineProps, ThermoclineTier } from './Thermocline';

// DepthBackground - the water column's ground: the depth ramp
export { DepthBackground } from './DepthBackground';
export type { DepthBackgroundProps } from './DepthBackground';

// WaterColumn - the ground the whole app stands in: ramp, deep field
export { WaterColumn, waterColumnHost } from './WaterColumn';

// FleshBackground - the myoseptal texture inside a salmon fill
export { FleshBackground } from './FleshBackground';
export type { FleshBackgroundProps } from './FleshBackground';

// PasswordInput - Secure password input with visibility toggle and strength indicator
export { PasswordInput, PasswordStrengthBar } from './PasswordInput';
export type { PasswordInputProps, PasswordStrengthBarProps } from './PasswordInput';

// QRCode - QR code display component
export { QRCode } from './QRCode';
export type { QRCodeProps } from './QRCode';

// InputAddress - Address input with validation
export { InputAddress, useAddressValidation } from './InputAddress';
export type {
  BlockchainType,
  InputAddressProps,
  UseAddressValidationParams,
  UseAddressValidationResult,
  ValidationCallbackResult,
  ValidationState,
} from './InputAddress';

// NftCard - NFT display card for grid layouts
export { NftCard, NftCardSkeleton } from './NftCard';
export type { NftCardProps, NftCardSkeletonProps, NftData } from './NftCard';

// NftDetailPage - Full-page NFT detail view with image, attributes, and actions
export { NftDetailPage } from './NftDetailPage';
export type { NftAttribute, NftDetailData, NftDetailPageProps } from './NftDetailPage';

// TokenSelector - Token selection with search and pagination
export { TokenSelector, TokenSelectorModal, useTokenSearch } from './TokenSelector';
export type {
  TokenSelectorModalProps,
  TokenSelectorProps,
  TokenSelectorToken,
  UseTokenSearchResult,
} from './TokenSelector';

// TokenDetailPage - Full-page token detail view with chart, market data, badges
export { TokenBadgesSection, TokenDetailContent, TokenDetailPage } from './TokenDetailPage';
export type {
  TokenBadgesSectionProps,
  TokenDetailContentProps,
  TokenDetailPageProps,
} from './TokenDetailPage';

// ReceiveSheet - Receive address dialog with QR code
export { ReceiveSheet } from './ReceiveSheet';
export type { ReceiveSheetProps } from './ReceiveSheet';

// TransactionDetail - one transaction's facts, as a step inside the Activity page
export { TransactionDetail } from './TransactionDetail';
export type { TransactionDetailProps } from './TransactionDetail';

// TransactionHistoryPage - the Activity page: list and detail steps
export {
  AddressCopyRow,
  ConversionRateDisplay,
  ExplorerLinkButton,
  PriceImpactBadge,
  TransactionHistoryPage,
  TransactionItem,
} from './TransactionHistoryPage';
export type {
  AddressCopyRowProps,
  ConversionRateDisplayProps,
  ExplorerLinkButtonProps,
  PriceImpactBadgeProps,
  SwapRoute,
  SwapRouteHop,
  Transaction,
  TransactionFee,
  TransactionHistoryPageProps,
  TransactionItemProps,
  TransactionTokenAmount,
  TransactionStatus as TxStatus,
  TransactionType as TxType,
} from './TransactionHistoryPage';

// SendPage - Full-page multi-step send flow
export { SendPage } from './SendPage';
export type {
  SendPageProps,
  SendStep,
  SendToken,
  StepAddressAmountProps,
  StepConfirmationProps,
  StepTokenSelectProps,
} from './SendPage';

// SwapScreen - Swap interface
export {
  SwapAmountInput,
  SwapDetailRow,
  SwapInputScreen,
  SwapReviewExchange,
  SwapReviewScreen,
  SwapScreen,
} from './SwapScreen';
export type {
  SwapAmountInputProps,
  SwapChainType,
  SwapDetailRowProps,
  SwapInputScreenProps,
  SwapQuote,
  SwapReviewExchangeProps,
  SwapReviewScreenProps,
  SwapScreenProps,
  SwapStep,
  SwapToken,
} from './SwapScreen';

// DAppApproval - Shared approval views for web and extension
export {
  DAppConnectApprovalView,
  DAppSignInApprovalView,
  DAppSignMessageApprovalView,
  DAppTransactionApprovalView,
} from './DAppApproval';
export type {
  DAppConnectApprovalViewProps,
  DAppSignInApprovalViewProps,
  DAppSignMessageApprovalViewProps,
  DAppTransactionApprovalViewProps,
} from './DAppApproval';

// AuthFlow - Shared auth screens for web and extension
export {
  AnalyticsConsentPage,
  CreateWalletPage,
  DerivedAccountsPage,
  PasswordPage,
  RecoverWalletPage,
  SelectOptionsPage,
  SuccessPage,
} from './AuthFlow';
export type {
  AnalyticsConsentPageProps,
  CreateWalletPageProps,
  DerivedAccountsPageProps,
  PasswordPageProps,
  RecoverWalletPageProps,
  SelectOptionsPageProps,
  SuccessPageProps,
} from './AuthFlow';

// BaseDialog - Base compound component for MUI dialogs
export { BaseDialog, MessageText } from './BaseDialog';
export type {
  ActionButtonProps,
  ActionsProps,
  BaseDialogProps,
  TextFieldProps as BaseDialogTextFieldProps,
  CancelButtonProps,
  ContentProps,
  HeaderProps,
} from './BaseDialog';

// BaseSheetDialog - Base compound component for sheet-style dialogs
export { BaseSheetDialog } from './BaseSheetDialog';

// PageShell - Shared page layout wrapper for full-page views
export { PageShell } from './PageShell';
export type { PageShellProps } from './PageShell';

// ConfirmDialog - Reusable confirmation dialog for destructive actions
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';

// NftSendDialog - Dialog for sending NFTs to another address
export { NftSendDialog } from './NftSendDialog';
export type { NftSendDialogProps } from './NftSendDialog';

// SeedPhrase - Seed word display grid and validation input
export { SeedPhraseEntry, SeedWordGrid, SeedWordInput } from './SeedPhrase';
export type { SeedPhraseEntryProps, SeedWordGridProps, SeedWordInputProps } from './SeedPhrase';

// ExplorerSelector - Block explorer selection for settings
export { ExplorerSelector } from './ExplorerSelector';

// LanguageSelector - Language selection for settings
export { LanguageSelector } from './LanguageSelector';

// AppearanceSelector - System / Light / Dark for settings
export { AppearanceSelector } from './AppearanceSelector';

// TrustedAppsSelector - Connected dApps management for settings
export { TrustedAppsSelector } from './TrustedAppsSelector';

// SupportSelector - Help & Support for settings
export { SupportSelector } from './SupportSelector';

// CurrencySelector - Currency selection for settings
export { CurrencySelector } from './CurrencySelector';

// SettingsSelectorList - Generic settings selection list
export { SettingsSelectorList } from './SettingsSelectorList';

// SettingsPanelContent - Settings panel content layout wrapper
export { SettingsPanelContent } from './SettingsPanelContent';
export type { SettingsPanelContentProps } from './SettingsPanelContent';

// DerivedAccountCard - Selectable account card for derived account discovery
export { DerivedAccountCard, DerivedAccountCardSkeleton } from './DerivedAccountCard';
export type {
  DerivedAccountCardProps,
  DerivedAccountCardSkeletonProps,
} from './DerivedAccountCard';

// TransactionSuccessScreen - Success screen after transaction
export { TransactionSuccessScreen } from './TransactionSuccessScreen';

// AccountsPanel - Account list management
export { AccountsPanel } from './AccountsPanel';
export type { AccountsPanelProps } from './AccountsPanel';

// AccountEditPanel - Account edit menu
export { AccountEditPanel } from './AccountEditPanel';
export type { AccountEditPanelProps } from './AccountEditPanel';

// AccountNamePanel - Account name editing
export { AccountNamePanel } from './AccountNamePanel';
export type { AccountNamePanelProps } from './AccountNamePanel';

// AccountAvatarPanel - Account avatar/profile picture selection
export { AccountAvatarPanel } from './AccountAvatarPanel';
export type { AccountAvatarPanelProps } from './AccountAvatarPanel';

// AccountAddPanel - Multi-step account creation flow
export { AccountAddPanel } from './AccountAddPanel';
export type { AccountAddPanelProps } from './AccountAddPanel';

// SecurityPanel - Change password with strength indicator
export { SecurityPanel } from './SecurityPanel';
export type { SecurityPanelProps } from './SecurityPanel';

// BackupPanel - Seed phrase reveal and copy
export { BackupPanel } from './BackupPanel';
export type { BackupPanelProps } from './BackupPanel';

// PrivateKeyPanel - Private key reveal per network
export { PrivateKeyPanel } from './PrivateKeyPanel';
export type { PrivateKeyPanelProps } from './PrivateKeyPanel';

// AddressBookPanel - Contact list management
export { AddressBookPanel } from './AddressBookPanel';

// AddressAddPanel - Add new contact
export { AddressAddPanel } from './AddressAddPanel';

// AddressEditPanel - Edit existing contact
export { AddressEditPanel } from './AddressEditPanel';

// AboutPanel - App info and external links
export { AboutPanel } from './AboutPanel';
export type { AboutPanelProps } from './AboutPanel';

// ---------------------------------------------------------------------------
// The kit on the DOM — the mobile kit's twins (spec 028, lot 2)
// ---------------------------------------------------------------------------

// Card - the one content container the redesign composes everything from
export { Card } from './Card';
export type { CardPadding, CardProps, CardRadius, CardTone } from './Card';

// ListRow - a Card laid out as leading mark / title stack / trailing slot
export { ListRow } from './ListRow';
export type { ListRowEmphasis, ListRowPadding, ListRowProps } from './ListRow';

// SectionLabel - the three sizes of heading that sit above a block
export { SectionLabel } from './SectionLabel';
export type { SectionLabelProps, SectionLabelVariant } from './SectionLabel';

// KeyValueRow - a label and its value, with an optional trailing action
export { KeyValueRow } from './KeyValueRow';
export type { KeyValueRowProps, KeyValueTone } from './KeyValueRow';

// Chip - the pill: a badge, an action, or a filter with a selected state
export { Chip, ChipGroup } from './Chip';
export type { ChipGroupProps, ChipOption, ChipProps, ChipSize, ChipVariant } from './Chip';

// UnderlineTabs - mutually exclusive options under a travelling underline
export { UnderlineTabs } from './UnderlineTabs';
export type { UnderlineTab, UnderlineTabsProps, UnderlineTabsSize } from './UnderlineTabs';

// SearchField - the one search input the kit draws
export { SearchField } from './SearchField';
export type { SearchFieldProps } from './SearchField';

// IconBubble - the well every glyph in the redesign sits inside
export { IconBubble } from './IconBubble';
export type {
  IconBubbleProps,
  IconBubbleRadius,
  IconBubbleShape,
  IconBubbleSize,
  IconBubbleTone,
  IconGlyphProps,
} from './IconBubble';

// ShimmerRect / SkeletonRow - the placeholder atoms, and the row they compose
export { ShimmerRect } from './ShimmerRect';
export type { ShimmerRectProps } from './ShimmerRect';
export { SkeletonRow } from './SkeletonRow';
export type { SkeletonRowProps } from './SkeletonRow';

// StateBlock - the empty and failed answer for a list or section, one shape
export { StateBlock } from './StateBlock';
export type { StateBlockProps, StateBlockTone } from './StateBlock';

// PortfolioSubTabs - the Home sub-tab row plus its order button
export { PortfolioSubTabs } from './PortfolioSubTabs';
export type { PortfolioSubTab, PortfolioSubTabsProps } from './PortfolioSubTabs';

// BottomSheetContainer - the sheet, on <dialog>: Escape and backdrop close it
export { BottomSheetContainer, SheetTitle, SHEET_EXIT_MS } from './BottomSheetContainer';
export type { BottomSheetContainerProps, SheetTitleProps } from './BottomSheetContainer';

// ReceiptScreen - the transfer and exchange receipts, one entry point
export { ReceiptScreen } from './ReceiptScreen';
export type {
  ExchangeReceiptScreenProps,
  ReceiptScreenAction,
  ReceiptScreenProps,
  TransferReceiptScreenProps,
} from './ReceiptScreen';

// BalanceHeader - the balance block of the redesigned Home: chain pages, the
// two money circles, the Activity pill
export { BalanceHeader } from './BalanceHeader';
export type { BalanceHeaderProps } from './BalanceHeader';

// HomeTabOrderSheet - where the user arranges Home's sub-tabs
export { HomeTabOrderSheet } from './HomeTabOrderSheet';
export type { HomeTabOrderSheetProps } from './HomeTabOrderSheet';

// DerivedAccountsSheet - which of a seed's funded paths become wallets
export { DerivedAccountsSheet } from './DerivedAccountsSheet';
export type { DerivedAccountsSheetProps } from './DerivedAccountsSheet';

// NftsTab - the NFTs sub-tab of Home: one grid, on the active network
export { NftsTab } from './NftsTab';
export type { NftsTabProps } from './NftsTab';
