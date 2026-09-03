/**
 * The settings screens' contracts — one contract, two renderings (spec 028).
 *
 * The selector and address-book contracts already lived in `../settings` under
 * their `*BaseProps` names; the `*PropsBase` names here are the same types,
 * named the way every kit contract is named so a twin pair reads one
 * identifier on both platforms. The rest are the props mobile kept app-local
 * until the DOM grew its twin.
 */
import type { ReactNode } from 'react';

import type { UseAddressBookFormResult } from '../../hooks/useAddressBookForm';

import type {
  AddressBookAddBaseProps,
  AddressBookEditBaseProps,
  AddressBookSelectorBaseProps,
  AppearanceSelectorBaseProps,
  CurrencySelectorBaseProps,
  ExplorerSelectorBaseProps,
  LanguageSelectorBaseProps,
  SupportSelectorBaseProps,
  TrustedAppsSelectorBaseProps,
} from '../settings';
import type { Testable } from './testable';

// ---------------------------------------------------------------------------
// The selectors and the address book, under the kit's naming
// ---------------------------------------------------------------------------

export type AppearanceSelectorPropsBase = AppearanceSelectorBaseProps;
export type CurrencySelectorPropsBase = CurrencySelectorBaseProps;
export type ExplorerSelectorPropsBase = ExplorerSelectorBaseProps;
export type LanguageSelectorPropsBase = LanguageSelectorBaseProps;
export type SupportSelectorPropsBase = SupportSelectorBaseProps;
export type TrustedAppsSelectorPropsBase = TrustedAppsSelectorBaseProps;
export type AddressBookPanelPropsBase = AddressBookSelectorBaseProps;
export type AddressAddPanelPropsBase = AddressBookAddBaseProps;
export type AddressEditPanelPropsBase = AddressBookEditBaseProps;

// ---------------------------------------------------------------------------
// The layout every settings screen composes
// ---------------------------------------------------------------------------

/**
 * SettingsScreenLayout — the chrome every settings screen composes: the kit
 * header with a title and a subtitle, and the scrolling body that spaces the
 * blocks it is handed by the component gap. Each platform adds its own
 * scroll and safe-area concerns.
 */
export interface SettingsScreenLayoutPropsBase extends Testable {
  title: string;
  /** Supporting line under the title — every screen says what it is for. */
  subtitle?: string;
  onBack: () => void;
  /** Holds the back control while a commit is in flight. */
  backDisabled?: boolean;
  children: ReactNode;
  /** Whether the body scrolls on its own. Default true. */
  scrollable?: boolean;
  /** Pinned under the body, outside the scroll — a committing action. */
  footer?: ReactNode;
}

/**
 * SettingsSelectorList — the shared single-choice list (Language, Currency,
 * Explorer, Appearance): a row per choice, the chosen one marked by a
 * trailing check in the accent ink.
 */
export interface SettingsSelectorListPropsBase<T> {
  items: T[];
  getKey: (item: T) => string;
  isSelected: (item: T) => boolean;
  onSelect: (item: T) => void;
  getPrimaryText: (item: T) => string;
  /** Return `undefined` to omit the row's subtitle. */
  getSecondaryText?: (item: T) => string | undefined;
  /** Custom element before the text (a currency symbol, a glyph). */
  renderLeadingElement?: (item: T) => ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  /** Each row gets `${testIdPrefix}-${getKey(item)}`. */
  testIdPrefix?: string;
}

// ---------------------------------------------------------------------------
// The panels mobile kept app-local until the DOM grew its twin
// ---------------------------------------------------------------------------

/** AccountNamePanel — one field, one save. */
export interface AccountNamePanelPropsBase {
  currentName: string;
  onSave: (name: string) => void | Promise<void>;
  onBack: () => void;
}

/**
 * ConfirmSheet — the confirmation sheet for destructive and sensitive
 * actions. On a danger sheet the safe way out takes the primary fill.
 */
export interface ConfirmSheetPropsBase {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** A destructive action. */
  isDanger?: boolean;
  /**
   * One dismiss button instead of the cancel/confirm pair — for a sheet that
   * only reports something the user can do nothing about here.
   */
  acknowledgeOnly?: boolean;
  requirePassword?: boolean;
  validatePassword?: (password: string) => Promise<boolean>;
  /**
   * Receives the entered password when `requirePassword` is set — the sheet
   * has already checked it with `validatePassword` by then.
   */
  onConfirm: (password?: string) => void | Promise<void>;
}

/** DerivedAccountCard — a selectable account found by a derivation scan. */
export interface DerivedAccountCardPropsBase extends Testable {
  address: string;
  networkName: string;
  path: string;
  balanceFormatted: string;
  selected: boolean;
  /** A zero balance reads quieter. */
  dimmed: boolean;
  onToggle: () => void;
  blockchain?: 'solana' | 'bitcoin' | 'ethereum';
}

/** WatchOnlyBadge — marks a wallet the user can read but not operate. */
export interface WatchOnlyBadgePropsBase extends Testable {}

/**
 * AddressForm — the address-book form both the add and the edit panel draw:
 * label, address, the network it belongs to, save. The panel decides the
 * words and what saving does; the form owns nothing but the fields.
 */
export interface AddressFormPropsBase extends Testable {
  title: string;
  subtitle: string;
  /** The network the contact lives on, already worded ("Solana", "Bitcoin Testnet"). */
  networkLabel: string;
  /** The `useAddressBookForm` the panel seeded. */
  form: UseAddressBookFormResult;
  onSave: () => void | Promise<void>;
  onBack: () => void;
  /** A save that the panel's caller refused, surfaced under the button. */
  errorText?: string | null;
}

/**
 * RevealCover — the opaque bedrock gate over a secret that has not been
 * revealed yet (The Bedrock Rule): a translucent scrim would read as a
 * loading state and let the water through. Rendering only — the panel owns
 * the secret and decides what pressing it costs.
 */
export interface RevealCoverPropsBase extends Testable {
  label: string;
  onPress: () => void;
}

/**
 * AccountAvatar — the 44px identity well a wallet row carries: the account's
 * picture, or its initials when there is none or it fails to load.
 */
export interface AccountAvatarPropsBase extends Testable {
  name: string;
  avatarUrl?: string | null;
  /** The active wallet's well is ink; every other one is the accent tint. */
  active: boolean;
}
