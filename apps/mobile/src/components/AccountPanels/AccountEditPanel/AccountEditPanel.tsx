/**
 * AccountEditPanel - account editing options for mobile.
 *
 * A `ListRow` group, same idiom as Settings' own section list: each row
 * pushes a sub-panel, so none of them carries a chevron (a push sinks and
 * floats on the vertical, a right caret would promise a slide).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

import { KeyIcon, LockIcon, TextTIcon, UserCircleIcon, iconSize } from '../../../icons';
import type { IconComponent } from '../../../icons';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { IconBubble } from '../../IconBubble';
import { ListRow } from '../../ListRow';
import type { AccountEditPanelProps } from './types';

/** The leading well every row carries — Settings' own row bubble size. */
const ROW_BUBBLE_SIZE = 40;

interface SectionItem {
  labelKey: string;
  icon: IconComponent;
  onPress: () => void;
  testID: string;
}

export function AccountEditPanel({
  account,
  onEditName,
  onEditAvatar,
  onBackupSeed,
  onExportPrivateKey,
  onBack,
}: AccountEditPanelProps): React.ReactElement {
  const { t } = useTranslation();

  const sections: SectionItem[] = [
    {
      labelKey: 'settings.account_edit.name_section',
      icon: TextTIcon,
      onPress: onEditName,
      testID: 'account-edit-name',
    },
    {
      labelKey: 'settings.account_edit.avatar_section',
      icon: UserCircleIcon,
      onPress: onEditAvatar,
      testID: 'account-edit-avatar',
    },
    {
      labelKey: 'settings.account_edit.backup_section',
      icon: KeyIcon,
      onPress: onBackupSeed,
      testID: 'account-edit-backup',
    },
    {
      labelKey: 'settings.account_edit.private_key_section',
      icon: LockIcon,
      onPress: onExportPrivateKey,
      testID: 'account-edit-private-key',
    },
  ];

  return (
    <SettingsScreenLayout
      title={t('settings.account_edit.title')}
      subtitle={account.name}
      onBack={onBack}
    >
      {sections.map((item) => (
        <ListRow
          key={item.labelKey}
          testID={item.testID}
          leading={
            <IconBubble
              size={ROW_BUBBLE_SIZE}
              shape="rounded"
              tone="surface"
              icon={item.icon}
              iconSize={iconSize.md}
            />
          }
          title={t(item.labelKey)}
          onPress={item.onPress}
          // No trailing node: these rows push a panel, and the push sinks
          // and floats on the vertical — a right caret would promise a slide.
        />
      ))}
    </SettingsScreenLayout>
  );
}
