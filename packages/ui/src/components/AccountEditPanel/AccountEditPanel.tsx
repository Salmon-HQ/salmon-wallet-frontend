/**
 * AccountEditPanel — account editing options, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AccountPanels/AccountEditPanel`:
 * a `ListRow` group, same idiom as Settings' own section list. Each row pushes
 * a sub-panel, so none of them carries a chevron (a push sinks and floats on
 * the vertical, a right caret would promise a slide).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { IconGlyphProps } from '@salmon/shared';

import { KeyIcon, LockIcon, TextTIcon, UserCircleIcon, iconSize } from '../../icons';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { SettingsPanelContent } from '../SettingsPanelContent';
import type { AccountEditPanelProps } from './types';

/** The leading well every row carries — Settings' own row bubble size. */
const ROW_BUBBLE_SIZE = 40;

interface SectionItem {
  labelKey: string;
  icon: React.ComponentType<IconGlyphProps>;
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
    <SettingsPanelContent
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
        />
      ))}
    </SettingsPanelContent>
  );
}
