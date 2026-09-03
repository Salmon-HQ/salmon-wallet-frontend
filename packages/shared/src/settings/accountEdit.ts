/**
 * The account-edit screen's rows — what a wallet can change about itself.
 * Both platforms draw this table; each maps `icon` to its own glyph and
 * `action` to the callback its panel received.
 */
export type AccountEditAction = 'name' | 'avatar' | 'backup' | 'privateKey';
export type AccountEditIconName = 'textT' | 'userCircle' | 'key' | 'lock';

export interface AccountEditSection {
  action: AccountEditAction;
  labelKey: string;
  icon: AccountEditIconName;
  testID: string;
}

export const ACCOUNT_EDIT_SECTIONS: readonly AccountEditSection[] = [
  {
    action: 'name',
    labelKey: 'settings.account_edit.name_section',
    icon: 'textT',
    testID: 'account-edit-name',
  },
  {
    action: 'avatar',
    labelKey: 'settings.account_edit.avatar_section',
    icon: 'userCircle',
    testID: 'account-edit-avatar',
  },
  {
    action: 'backup',
    labelKey: 'settings.account_edit.backup_section',
    icon: 'key',
    testID: 'account-edit-backup',
  },
  {
    action: 'privateKey',
    labelKey: 'settings.account_edit.private_key_section',
    icon: 'lock',
    testID: 'account-edit-private-key',
  },
];
