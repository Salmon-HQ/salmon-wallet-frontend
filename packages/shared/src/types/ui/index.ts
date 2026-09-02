/**
 * UI Component Types (Platform-Agnostic)
 *
 * This module exports base types for UI components that are used across
 * both mobile (apps/mobile) and web (apps/extension) apps.
 *
 * Platform-specific versions (with ViewStyle or CSSProperties) should
 * extend these base types in their respective packages.
 */

// Testable (shared test-label contract)
export type { Testable } from './testable';

// Token Selector
export type {
  TokenSelectorToken,
  TokenSelectorPropsBase,
  TokenSelectorModalPropsBase,
  UseTokenSearchResult,
} from './token-selector';

// Token Market Data
export type { MarketData, TokenMarketDataPropsBase } from './token-market-data';

// Token Info
export type { TokenInfoPropsBase } from './token-info';

// Price Chart
export type { PriceChartPropsBase } from './price-chart';

// Pending Value
export type { PendingValuePropsBase } from './pending-value';

// Send Sheet
export type {
  SendStep,
  SendToken,
  StepTokenSelectProps,
  StepAddressAmountPropsBase,
  StepConfirmationProps,
  SendContact,
  SendOwnWallet,
  UseSendContactsResult,
} from './send-sheet';

// Warning Notice
export type { WarningNoticeTone, WarningNoticePropsBase } from './warning-notice';

// Transaction History
export type { TransactionItemPropsBase } from './transaction-history';

// Input Address
export type { InputAddressPropsBase } from './input-address';

// Balance Card
export type {
  BlockchainId,
  BlockchainNetworkInfo,
  BlockchainBalance,
  BalanceCardPropsBase,
  BalanceCardCarouselPropsBase,
} from './balance-card';

// Balance Header — the carousel contract plus the money controls
export type { BalanceHeaderPropsBase } from './balance-header';

// Derived Accounts Sheet — which funded paths become wallets
export type { DerivedAccountsSheetPropsBase } from './derived-accounts-sheet';

// Step Indicator
export type { StepIndicatorProps, StepIndicatorPropsBase } from './step-indicator';

// QR Code
export type { QRCodePropsBase } from './qr-code';

// Receive Sheet
export type { ReceiveSheetPropsBase } from './receive-sheet';

// Token About
export type { TokenAboutPropsBase } from './token-about';

// Token Features
export type { TokenFeaturesPropsBase } from './token-features';

// Blur Container
export type { BlurTint, BlurContainerPropsBase } from './blur-container';

// Gradient Background
export type { GradientBackgroundPropsBase } from './gradient-background';

// Token Badges (formerly co-located with the retired TokenInformationSheet
// contract — see AGENTS.md's ownership rules on removing shared exports)
export type { TokenBadgesSectionPropsBase } from './token-information-sheet';

// Transaction Detail Modal
export type { TransactionDetailModalPropsBase } from './transaction-detail-modal';

// Wallet Header
export type { WalletHeaderPropsBase } from './wallet-header';

// Avatar Picker
export type { NftAvatarItem, AvatarPickerPropsBase } from './avatar-picker';

// Accounts Panel
export type { AccountsPanelPropsBase } from './accounts-panel';

// Account Edit Panel
export type { AccountEditPanelPropsBase } from './account-edit-panel';

// Account Add Panel
export type { AccountAddStep, AccountAddPanelPropsBase } from './account-add';

// Security Panel
export type { SecurityPanelPropsBase } from './security-panel';

// Transaction Success Screen
export type { TransactionSuccessScreenProps } from './transaction-success-screen';

// Backup Panel
export type { BackupPanelPropsBase } from './backup-panel';

// Private Key Panel
export type { PrivateKeyPanelPropsBase } from './private-key-panel';

// About Panel
export type { AboutPanelPropsBase } from './about-panel';

// Pending Activity Banner
export type { PendingActivityBannerPropsBase } from './pending-activity-banner';

// Onboarding Layout
export type { OnboardingLayoutPropsBase } from './onboarding-layout';

// Settings panels — the selectors, the layout, the confirm sheet and the
// small twins that grew a DOM half in lot 4B
export type {
  AppearanceSelectorPropsBase,
  CurrencySelectorPropsBase,
  ExplorerSelectorPropsBase,
  LanguageSelectorPropsBase,
  SupportSelectorPropsBase,
  TrustedAppsSelectorPropsBase,
  AddressBookPanelPropsBase,
  AddressAddPanelPropsBase,
  AddressEditPanelPropsBase,
  SettingsScreenLayoutPropsBase,
  SettingsSelectorListPropsBase,
  AccountNamePanelPropsBase,
  ConfirmSheetPropsBase,
  DerivedAccountCardPropsBase,
  WatchOnlyBadgePropsBase,
} from './settings-panels';

// Home Tab Order Sheet
export type { HomeTabOrderTab, HomeTabOrderSheetPropsBase } from './home-tab-order-sheet';

// ---------------------------------------------------------------------------
// The kit — the contracts mobile and the DOM both implement (spec 028, lot 2)
// ---------------------------------------------------------------------------

// Card
export type { CardTone, CardPadding, CardRadius, CardPropsBase } from './card';

// List Row
export type { ListRowPadding, ListRowEmphasis, ListRowPropsBase } from './list-row';

// Icon Bubble
export type {
  IconBubbleSize,
  IconBubbleShape,
  IconBubbleRadius,
  IconBubbleTone,
  IconGlyphProps,
  IconBubblePropsBase,
} from './icon-bubble';

// Key Value Row
export type { KeyValueTone, KeyValueRowPropsBase } from './key-value-row';

// Section Label
export type { SectionLabelVariant, SectionLabelPropsBase } from './section-label';

// Chip
export type { ChipSize, ChipVariant, ChipPropsBase, ChipOption, ChipGroupPropsBase } from './chip';

// Underline Tabs
export type { UnderlineTab, UnderlineTabsSize, UnderlineTabsPropsBase } from './underline-tabs';

// Search Field
export type { SearchFieldPropsBase } from './search-field';

// State Block
export type { StateBlockTone, StateBlockPropsBase } from './state-block';

// Button
export type { ButtonPropsBase, TextButtonPropsBase } from './button';

// Screen Header
export type { ScreenHeaderPropsBase } from './screen-header';

// Sheet
export type { SheetTitlePropsBase, BottomSheetContainerPropsBase } from './sheet';

// Thermocline
export type { ThermoclineTier, ThermoclinePropsBase } from './thermocline';

// Portfolio Sub Tabs
export type { PortfolioSubTab, PortfolioSubTabsPropsBase } from './portfolio-sub-tabs';

// Skeleton
export type { ShimmerRectPropsBase, SkeletonRowPropsBase } from './skeleton';

// Receipt Screen
export type {
  ReceiptScreenAction,
  TransferReceiptScreenPropsBase,
  ExchangeReceiptScreenPropsBase,
  ReceiptScreenPropsBase,
} from './receipt-screen';

// Brand Mark
export type { BrandMarkPropsBase, WordmarkPropsBase } from './brand-mark';

// Lock Screen
export type { LockScreenPropsBase } from './lock-screen';

// Password Input
export type { PasswordInputPropsBase, PasswordStrengthBarPropsBase } from './password-input';

// Seed Phrase
export type {
  SeedWordValidationState,
  SeedWordGridPropsBase,
  SeedWordInputPropsBase,
  SeedPhraseEntryPropsBase,
} from './seed-phrase';

// Press Specular
export { SPECULAR_RADIUS, SPECULAR_OPACITY } from './press-specular';
export type { PressSpecularPropsBase } from './press-specular';
