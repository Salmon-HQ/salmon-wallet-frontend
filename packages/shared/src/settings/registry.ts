/**
 * The Settings screen's information architecture — one table, two renderings.
 *
 * Mobile (`app/(app)/settings/index.tsx`) and the DOM (`SettingsPanelStack`)
 * draw the same groups, in the same order, with the same copy keys; this is
 * the table both read. Icons are names, not components: each platform maps a
 * name to its own glyph set (`SETTINGS_ICONS` on either side), so the table
 * stays free of React and of either platform.
 */
import { LANGUAGE_NAMES, type LanguageCode } from '../locales';
import type { SettingsScreen } from '../types/settings';

/** A glyph the row's leading well shows; resolved per platform. */
export type SettingsIconName =
  | 'users'
  | 'userCircle'
  | 'shieldCheck'
  | 'key'
  | 'lock'
  | 'translate'
  | 'money'
  | 'arrowSquareOut'
  | 'circleHalf'
  | 'addressBook'
  | 'squaresFour'
  | 'chartBar'
  | 'code'
  | 'eye'
  | 'question'
  | 'info'
  | 'trash'
  | 'signOut';

/** The three switches on the root list; each platform wires checked/onChange. */
export type SettingsToggleKey = 'analytics' | 'developerNetworks' | 'unverifiedTokens';

export type SettingsRowId = SettingsScreen | SettingsToggleKey;

interface SettingsRowBase {
  id: SettingsRowId;
  icon: SettingsIconName;
  labelKey: string;
  isDanger?: boolean;
}

/** A row that pushes its own screen. */
export interface SettingsPanelRow extends SettingsRowBase {
  id: SettingsScreen;
  kind: 'panel';
}

/** A row that flips a switch in place rather than pushing a screen. */
export interface SettingsToggleRow extends SettingsRowBase {
  id: SettingsToggleKey;
  kind: 'toggle';
  /** The line under the label that says what the switch decides. */
  descriptionKey: string;
  /** The e2e handle on the control itself, not the row. */
  testId: string;
}

/** A row that runs a destructive action rather than pushing a screen. */
export interface SettingsActionRow extends SettingsRowBase {
  id: 'removeWallet' | 'removeAll';
  kind: 'action';
  isDanger: true;
}

export type SettingsRowDef = SettingsPanelRow | SettingsToggleRow | SettingsActionRow;

export interface SettingsGroupDef {
  titleKey: string;
  isDanger?: boolean;
  rows: readonly SettingsRowDef[];
}

export const SETTINGS_GROUPS: readonly SettingsGroupDef[] = [
  {
    titleKey: 'settings.sections.account',
    rows: [
      { id: 'accounts', kind: 'panel', icon: 'users', labelKey: 'settings.accounts.title' },
      { id: 'avatar', kind: 'panel', icon: 'userCircle', labelKey: 'settings.profile_picture' },
      { id: 'security', kind: 'panel', icon: 'shieldCheck', labelKey: 'settings.security.title' },
      { id: 'backup', kind: 'panel', icon: 'key', labelKey: 'settings.backup' },
      { id: 'privateKey', kind: 'panel', icon: 'lock', labelKey: 'settings.private_key' },
    ],
  },
  {
    titleKey: 'settings.sections.preferences',
    rows: [
      { id: 'language', kind: 'panel', icon: 'translate', labelKey: 'settings.display_language' },
      { id: 'currency', kind: 'panel', icon: 'money', labelKey: 'settings.currency' },
      {
        id: 'explorer',
        kind: 'panel',
        icon: 'arrowSquareOut',
        labelKey: 'settings.select_explorer',
      },
      { id: 'appearance', kind: 'panel', icon: 'circleHalf', labelKey: 'settings.appearance' },
    ],
  },
  {
    titleKey: 'settings.sections.advanced',
    rows: [
      {
        id: 'addressBook',
        kind: 'panel',
        icon: 'addressBook',
        labelKey: 'settings.address_book',
      },
      {
        id: 'trustedApps',
        kind: 'panel',
        icon: 'squaresFour',
        labelKey: 'settings.trusted_apps',
      },
      {
        id: 'analytics',
        kind: 'toggle',
        icon: 'chartBar',
        labelKey: 'settings.analytics',
        descriptionKey: 'settings.analytics_description',
        testId: 'settings-analytics-toggle',
      },
      // Developer Networks decides which networks the carousel offers;
      // unverified tokens decide what the lists show — the two used to be the
      // same boolean (spec 026 D4).
      {
        id: 'developerNetworks',
        kind: 'toggle',
        icon: 'code',
        labelKey: 'settings.developer_networks',
        descriptionKey: 'settings.developer_networks_description',
        testId: 'settings-developer-networks-toggle',
      },
      {
        id: 'unverifiedTokens',
        kind: 'toggle',
        icon: 'eye',
        labelKey: 'settings.unverified_tokens',
        descriptionKey: 'settings.unverified_tokens_description',
        testId: 'settings-unverified-tokens-toggle',
      },
    ],
  },
  {
    titleKey: 'settings.sections.support',
    rows: [
      { id: 'support', kind: 'panel', icon: 'question', labelKey: 'settings.help_support' },
      { id: 'about', kind: 'panel', icon: 'info', labelKey: 'settings.about' },
    ],
  },
  {
    titleKey: 'settings.sections.danger_zone',
    isDanger: true,
    rows: [
      {
        id: 'removeWallet',
        kind: 'action',
        icon: 'trash',
        labelKey: 'settings.wallets.remove_wallet',
        isDanger: true,
      },
      {
        id: 'removeAll',
        kind: 'action',
        icon: 'signOut',
        labelKey: 'settings.wallets.remove_all_wallets',
        isDanger: true,
      },
    ],
  },
];

/** The rows whose trailing edge states the user's current choice. */
export type SettingsValueRowId = 'language' | 'currency' | 'explorer' | 'appearance';

export type SettingsRowValues = Partial<Record<SettingsValueRowId, string | undefined>>;

export interface SettingsRowValueInputs {
  language: string;
  currency?: string;
  explorerName?: string;
  appearance: string;
  /** The translated appearance option labels, keyed by preference. */
  appearanceLabels: Record<string, string>;
}

/**
 * What the four choosable rows currently read. Proper nouns and a currency
 * code — identical in both languages, so the list states the user's own
 * choice without inventing copy.
 */
export function settingsRowValues({
  language,
  currency,
  explorerName,
  appearance,
  appearanceLabels,
}: SettingsRowValueInputs): SettingsRowValues {
  return {
    language: LANGUAGE_NAMES[language as LanguageCode] || language,
    currency: currency?.toUpperCase(),
    explorer: explorerName,
    appearance: appearanceLabels[appearance],
  };
}
