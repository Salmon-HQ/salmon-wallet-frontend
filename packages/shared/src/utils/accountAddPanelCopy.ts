import type { AccountAddStep } from '../types/ui/account-add';

/**
 * The add-account "select method" step's row copy — both twins render one
 * `ListRow` per entry, mapping `id` to their own icon component and to the
 * matching `useAccountAddFlow` selector. `derive` is filtered out by
 * callers when `!canDerive` — there is no phrase to derive from yet.
 */
export type AccountAddMethodId = 'derive' | 'import' | 'private-key' | 'watch-only';

export interface AccountAddMethodCopy {
  id: AccountAddMethodId;
  titleKey: string;
  descriptionKey: string;
}

export const ACCOUNT_ADD_METHODS: readonly AccountAddMethodCopy[] = [
  {
    id: 'derive',
    titleKey: 'settings.account_add.create_new',
    descriptionKey: 'settings.account_add.create_new_description',
  },
  {
    id: 'import',
    titleKey: 'settings.account_add.import_seed',
    descriptionKey: 'settings.account_add.import_seed_description',
  },
  {
    id: 'private-key',
    titleKey: 'settings.account_add.import_private_key',
    descriptionKey: 'settings.account_add.import_private_key_description',
  },
  {
    id: 'watch-only',
    titleKey: 'settings.account_add.import_watch_only',
    descriptionKey: 'settings.account_add.import_watch_only_description',
  },
];

/** `settings.account_add.title`-style translation key per step, single-arg `t(key)`. */
export const ACCOUNT_ADD_STEP_TITLE_KEYS: Record<AccountAddStep, string> = {
  'select-method': 'settings.account_add.title',
  'derive-scan': 'settings.account_add.create_new',
  'import-seed': 'settings.account_add.import_seed',
  'import-private-key': 'wallet.import.title',
  'import-watch-only': 'wallet.watchOnly.title',
  'set-name': 'settings.account_add.set_name',
  reauth: 'settings.account_add.reauth_title',
  complete: 'settings.account_add.title',
};

/**
 * `[key, fallback]` per step subtitle — call `t(...ACCOUNT_ADD_STEP_SUBTITLE_KEYS[step])`.
 * `complete`'s fallback repeats its own key: i18next returns the key itself
 * when a translation is missing and no default is given, so this matches
 * the original single-arg `t(key)` call byte for byte.
 */
export const ACCOUNT_ADD_STEP_SUBTITLE_KEYS: Record<AccountAddStep, readonly [string, string]> = {
  'select-method': [
    'settings.account_add.select_method_subtitle',
    'Choose how you want to add this account.',
  ],
  'derive-scan': [
    'settings.account_add.create_new_description',
    'Derive a new account from your existing seed phrase',
  ],
  'import-seed': [
    'settings.account_add.import_seed_description',
    'Import an account using a different seed phrase',
  ],
  'import-private-key': [
    'settings.account_add.import_private_key_description',
    'Add a wallet you already own using its private key',
  ],
  'import-watch-only': [
    'settings.account_add.watch_only_subtitle',
    "Follow a wallet's address without moving its funds",
  ],
  'set-name': [
    'settings.account_add.set_name_subtitle',
    "Give this account a name you'll recognize",
  ],
  reauth: ['settings.account_add.reauth_subtitle', 'Enter your password to keep going.'],
  complete: ['settings.account_add.title', 'settings.account_add.title'],
};
