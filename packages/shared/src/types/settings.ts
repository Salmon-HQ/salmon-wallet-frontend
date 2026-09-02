/**
 * Shared Settings Types for Salmon Wallet
 * Used by both mobile and extension settings components
 */

import { neutral } from '../theme/palette';

/**
 * Available settings screens that can be navigated to
 */
export type SettingsScreen =
  | 'security'
  | 'network'
  | 'language'
  | 'currency'
  | 'appearance'
  | 'about'
  | 'backup'
  | 'privateKey'
  | 'support'
  | 'addressBook'
  | 'address-book-add'
  | 'address-book-edit'
  | 'explorer'
  | 'trustedApps'
  | 'removeWallet'
  | 'removeAll'
  | 'avatar'
  | 'accounts'
  | 'account-edit'
  | 'account-name'
  | 'account-add';

/**
 * An entry in the settings panel stack.
 */
export interface SettingsPanelEntry {
  /** The screen to render */
  screen: SettingsScreen;
  /** Optional props to pass to the screen component */
  props?: Record<string, unknown>;
}

/**
 * Base props shared between mobile and extension SettingsSheet
 */
export interface SettingsSheetBaseProps {
  /**
   * Whether the settings sheet is visible.
   */
  visible: boolean;

  /**
   * Callback when the sheet should close.
   */
  onClose: () => void;

  /**
   * Whether developer networks (testnets/devnets) are enabled.
   */
  developerNetworksEnabled?: boolean;

  /**
   * Callback when developer networks toggle is changed.
   */
  onDeveloperNetworksToggle?: (enabled: boolean) => void;

  /**
   * Whether unverified (spam-flagged) tokens are shown in the lists. Its own
   * toggle since spec 026 D4 — developer mode only offers networks.
   */
  unverifiedTokensEnabled?: boolean;

  /**
   * Callback when the unverified-tokens toggle is changed.
   */
  onUnverifiedTokensToggle?: (enabled: boolean) => void;

  /**
   * Whether anonymous usage analytics is enabled (opt-in, default off).
   */
  analyticsEnabled?: boolean;

  /**
   * Callback when the anonymous usage-analytics toggle is changed.
   */
  onAnalyticsToggle?: (enabled: boolean) => void;

  /**
   * Callback when remove wallet action is triggered.
   */
  onRemoveWallet?: () => void;

  /**
   * Callback when remove all wallets action is triggered.
   */
  onRemoveAllWallets?: () => void;
}

// ============================================================================
// Network Selector
// ============================================================================

/**
 * A network item as displayed in the network selector UI.
 */
export interface NetworkSelectorItem {
  /** Network identifier (e.g. 'solana-mainnet') */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Blockchain family (e.g. 'solana', 'bitcoin', 'ethereum') */
  blockchain: string;
}

/**
 * Base props shared between mobile and extension NetworkSelector components.
 */
export interface NetworkSelectorBaseProps {
  /** Available networks to display */
  networks: NetworkSelectorItem[];
  /** Currently active network id */
  activeNetworkId: string;
  /** Called when the user selects a network */
  onSelectNetwork: (networkId: string) => void;
  /** Called when the user navigates back */
  onBack: () => void;
  /** Whether the data is still loading */
  loading?: boolean;
}

// ============================================================================
// Explorer Selector
// ============================================================================

/**
 * An explorer item as displayed in the explorer selector UI.
 */
export interface ExplorerSelectorItem {
  /** Explorer key identifier */
  key: string;
  /** Human-readable explorer name */
  name: string;
}

/**
 * Base props shared between mobile and extension ExplorerSelector components.
 */
export interface ExplorerSelectorBaseProps {
  /** Available explorers to display */
  explorers: ExplorerSelectorItem[];
  /** Name of the currently active explorer */
  activeExplorerName: string;
  /** Called when the user selects an explorer */
  onSelectExplorer: (explorerKey: string) => void;
  /** Called when the user navigates back */
  onBack: () => void;
  /** Whether the data is still loading */
  loading?: boolean;
}

// ============================================================================
// Language Selector
// ============================================================================

/**
 * A language item as displayed in the language selector UI.
 */
export interface LanguageSelectorItem {
  /** Language code (e.g. 'en', 'es') */
  code: string;
  /** Native name of the language (e.g. 'English', 'Español') */
  nativeName: string;
}

/**
 * Base props shared between mobile and extension LanguageSelector components.
 */
export interface LanguageSelectorBaseProps {
  /** Available languages to display */
  languages: LanguageSelectorItem[];
  /** Currently active language code */
  activeLanguageCode: string;
  /** Called when the user selects a language */
  onSelectLanguage: (code: string) => void;
  /** Called when the user navigates back */
  onBack: () => void;
}

// ============================================================================
// Appearance Selector
// ============================================================================

/** A theme preference option as displayed in the appearance selector UI. */
export type AppearancePreference = 'system' | 'light' | 'dark';

/**
 * Base props shared between mobile and extension AppearanceSelector components.
 */
export interface AppearanceSelectorBaseProps {
  /** Currently active preference */
  activePreference: AppearancePreference;
  /** Called when the user selects a preference */
  onSelectPreference: (preference: AppearancePreference) => void;
  /** Called when the user navigates back */
  onBack: () => void;
}

// ============================================================================
// Trusted Apps Selector
// ============================================================================

/**
 * A trusted app item as displayed in the trusted apps selector UI.
 */
export interface TrustedAppItem {
  /** Domain/origin of the connected dApp */
  domain: string;
  /** Optional display name */
  name?: string;
  /** Optional icon URL */
  icon?: string;
}

/**
 * Base props shared between mobile and extension TrustedAppsSelector components.
 */
export interface TrustedAppsSelectorBaseProps {
  /** Connected dApps to display */
  apps: TrustedAppItem[];
  /** Called when the user revokes a dApp connection */
  onRevokeApp: (domain: string) => void;
  /** Called when the user navigates back */
  onBack: () => void;
  /** Whether the data is still loading */
  loading?: boolean;
}

// ============================================================================
// Support Selector
// ============================================================================

/**
 * A support option item as displayed in the support selector UI.
 */
export interface SupportOptionItem {
  /** Unique identifier */
  id: string;
  /** Translation key for the display title (resolved via t()) */
  title: string;
  /** Translation key for the short description (resolved via t()) */
  description: string;
  /** Link URL (https or mailto) */
  url: string;
}

/**
 * Base props shared between mobile and extension SupportSelector components.
 */
export interface SupportSelectorBaseProps {
  /** Support options to display */
  options: SupportOptionItem[];
  /** Called when the user taps a support link */
  onOpenLink: (url: string) => void;
  /** Called when the user navigates back */
  onBack: () => void;
}

/**
 * Default support options shared across platforms.
 * Icons are platform-specific and mapped by id in each component.
 */
export const SUPPORT_OPTIONS: SupportOptionItem[] = [
  {
    id: 'faq',
    title: 'settings.support.faq.title',
    description: 'settings.support.faq.description',
    url: 'https://salmonwallet.io/faq',
  },
  {
    id: 'docs',
    title: 'settings.support.docs.title',
    description: 'settings.support.docs.description',
    url: 'https://docs.salmonwallet.io',
  },
  {
    id: 'twitter',
    title: 'settings.support.twitter.title',
    description: 'settings.support.twitter.description',
    url: 'https://twitter.com/salmonwallet',
  },
  {
    id: 'email',
    title: 'settings.support.email.title',
    description: 'settings.support.email.description',
    url: 'mailto:support@salmonwallet.io',
  },
];

// ============================================================================
// Currency Selector
// ============================================================================

/**
 * A currency item as displayed in the currency selector UI.
 */
export interface CurrencySelectorItem {
  /** Lowercase currency code (e.g. 'usd') */
  code: string;
  /** Human-readable name (e.g. 'US Dollar') */
  name: string;
  /** Currency symbol (e.g. '$', '€') */
  symbol: string;
}

/**
 * Base props shared between mobile and extension CurrencySelector components.
 */
export interface CurrencySelectorBaseProps {
  /** Available currencies to display */
  currencies: CurrencySelectorItem[];
  /** Currently active currency code */
  activeCurrencyCode: string;
  /** Called when the user selects a currency */
  onSelectCurrency: (code: string) => void;
  /** Called when the user navigates back */
  onBack: () => void;
}

// ============================================================================
// Private Key Reveal
// ============================================================================

/**
 * Account key info extracted for display in the private key reveal UI.
 */
export interface AccountKeyInfo {
  /** BIP44 derivation path (e.g. "m/44'/501'/0'/0'") */
  path: string;
  /** Public receive address */
  address: string;
  /** Private key string (hex, base58, or WIF depending on blockchain) */
  privateKey: string;
}

// ============================================================================
// Settings Options
// ============================================================================

/**
 * Settings option/item configuration (mobile uses SettingsOption, extension uses SettingsItem)
 */
export interface SettingsOptionBase {
  /** Unique identifier for the option */
  id: SettingsScreen | 'developerNetworks' | 'analytics';
  /** Translation key for the label */
  labelKey: string;
  /** Optional description translation key */
  descriptionKey?: string;
  /** Whether this is a danger/destructive option */
  isDanger?: boolean;
}

/**
 * Settings section configuration (shared structure)
 */
export interface SettingsSectionBase {
  /** Section header translation key */
  titleKey: string;
  /** Whether this section contains danger items */
  isDanger?: boolean;
}

/**
 * Canonical kebab-case slug for each settings menu item.
 *
 * Keyed by the menu item id used in both the DOM (`SettingsPanelStack`) and
 * mobile (`SettingsSheet`) menus. The developer-networks toggle is keyed
 * `developerNetworks` on DOM and `network` on mobile, but both map to the same
 * slug so the two e2e suites share one selector vocabulary.
 */
export const SETTINGS_ITEM_SLUGS: Record<string, string> = {
  accounts: 'accounts',
  avatar: 'profile-picture',
  security: 'security',
  backup: 'backup-seed',
  privateKey: 'private-key',
  language: 'display-language',
  currency: 'display-currency',
  appearance: 'appearance',
  explorer: 'block-explorer',
  addressBook: 'address-book',
  trustedApps: 'trusted-apps',
  developerNetworks: 'developer-networks',
  network: 'developer-networks',
  analytics: 'analytics',
  about: 'about',
  support: 'support',
  removeWallet: 'remove-wallet',
  removeAll: 'remove-all',
};

/**
 * Stable e2e test id for a settings menu item, e.g. `settings-item-security`.
 * Falls back to the raw id when no slug is registered.
 */
export function getSettingsItemTestId(id: string): string {
  return `settings-item-${SETTINGS_ITEM_SLUGS[id] ?? id}`;
}

/**
 * Avatar color palette for deterministic account colors.
 * Used by WalletSwitcherSheet components.
 *
 * Depth-ramp neutrals rather than a second rainbow palette: each step is a
 * tone from the theme's cold neutral ramp, so avatars read as depths of the
 * same water instead of competing hues. Every step carries `text.primary`
 * initials at >= 4.5:1 (asserted in `theme/contrast.test.ts`). `neutral-900`
 * and `neutral-950` are skipped — they are the card surfaces avatars sit on.
 */
export const AVATAR_COLORS = [
  neutral[600], // shallowest
  neutral[700],
  neutral[800],
  neutral[850],
  neutral[925], // deepest
] as const;

/**
 * Get a deterministic color from the palette based on a string (e.g., account ID)
 */
export function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

// ============================================================================
// Address Book
// ============================================================================

/**
 * A contact item as displayed in the address book UI.
 */
export interface AddressBookItem {
  name: string;
  address: string;
  networkId: string;
  networkName: string;
  domain?: string | null;
}

/**
 * Base props shared between mobile and extension AddressBookSelector components.
 */
export interface AddressBookSelectorBaseProps {
  contacts: AddressBookItem[];
  activeNetworkId: string;
  onAddContact: () => void;
  onEditContact: (contact: AddressBookItem) => void;
  onRemoveContact: (address: string) => Promise<void>;
  onBack: () => void;
  loading?: boolean;
  /** Load-failure message key/state from useAddressbook — renders an error state instead of the empty state */
  error?: string | null;
  /** Re-runs the address book load after a failure */
  onRetry?: () => void;
}

/**
 * Base props for the Add Address screen.
 */
export interface AddressBookAddBaseProps {
  activeNetworkId: string;
  activeNetworkName: string;
  activeBlockchain: string;
  onSave: (input: import('./address').AddressInput) => Promise<void>;
  onBack: () => void;
}

/**
 * Base props for the Edit Address screen.
 */
export interface AddressBookEditBaseProps {
  contact: AddressBookItem;
  activeBlockchain: string;
  onSave: (originalAddress: string, input: import('./address').AddressInput) => Promise<void>;
  onBack: () => void;
}

// ============================================================================
// Network capability types (from backend GET /v1/networks)
// ============================================================================

/**
 * Capability flags within a network section.
 */
export interface NetworkSectionFeatures {
  send?: boolean;
  receive?: boolean;
  list_tokens?: boolean;
  import_tokens?: boolean;
  collectibles?: boolean;
}

/**
 * A capability section within a network catalog entry.
 */
export interface NetworkSection {
  active: boolean;
  features?: NetworkSectionFeatures;
  [key: string]: unknown;
}

/**
 * Capability configuration embedded in a single backend network entry.
 */
export interface NetworkCapabilities {
  enable: boolean;
  sections: {
    overview: NetworkSection;
    token_detail: NetworkSection;
    collectibles: NetworkSection;
    swap: { active: boolean };
    exchange: { active: boolean };
    transactions: { active: boolean };
  };
}

/**
 * @deprecated Legacy alias kept for internal compatibility during cleanup.
 */
export type NetworkSwitch = NetworkCapabilities;

/**
 * @deprecated Legacy alias kept for internal compatibility during cleanup.
 */
export interface SwitchSectionFeatures extends NetworkSectionFeatures {}

/**
 * @deprecated Legacy alias kept for internal compatibility during cleanup.
 */
export interface SwitchSection extends NetworkSection {}

/**
 * @deprecated Legacy alias kept for internal compatibility during cleanup.
 */
export type SwitchesResponse = Record<string, NetworkCapabilities>;

/**
 * Enabled-state lookup derived from the backend network catalog.
 */
export type NetworkEnabledMap = Record<string, boolean>;

/**
 * @deprecated Legacy alias kept for internal compatibility during cleanup.
 */
export type SwitchMap = NetworkEnabledMap;
