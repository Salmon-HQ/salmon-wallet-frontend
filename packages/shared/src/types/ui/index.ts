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

// Action Button Row
export type { ActionButtonBase, ActionButtonRowPropsBase } from './action-button-row';

// Step Indicator
export type { StepIndicatorProps } from './step-indicator';

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

// Wallet Switcher Sheet
export type {
  WalletSwitcherSheetPropsBase,
  AccountListItemPropsBase,
} from './wallet-switcher-sheet';

// Avatar Picker
export type { NftAvatarItem, AvatarPickerPropsBase } from './avatar-picker';

// Accounts Panel
export type { AccountsPanelPropsBase } from './accounts-panel';

// Account Edit Panel
export type { AccountEditPanelPropsBase } from './account-edit-panel';

// Account Add Panel
export type { AccountAddStep, AccountAddPanelPropsBase } from './account-add';

// Security Panel
export type { SecurityPanelPropsBase, SecurityPanelPropsMobile } from './security-panel';

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
