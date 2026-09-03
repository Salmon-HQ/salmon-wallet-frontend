/**
 * AccountEditPanel - account editing options for mobile.
 *
 * A `ListRow` group, same idiom as Settings' own section list: each row
 * pushes a sub-panel, so none of them carries a chevron (a push sinks and
 * floats on the vertical, a right caret would promise a slide).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ACCOUNT_EDIT_SECTIONS,
  type AccountEditAction,
  type AccountEditIconName,
} from '@salmon/shared';

import { KeyIcon, LockIcon, TextTIcon, UserCircleIcon, iconSize } from '../../../icons';
import type { IconComponent } from '../../../icons';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { IconBubble } from '../../IconBubble';
import { ListRow } from '../../ListRow';
import type { AccountEditPanelProps } from './types';

/** The leading well every row carries — Settings' own row bubble size. */
const ROW_BUBBLE_SIZE = 40;

/** The shared table's icon names, as this platform's glyphs. */
const ICONS: Record<AccountEditIconName, IconComponent> = {
  textT: TextTIcon,
  userCircle: UserCircleIcon,
  key: KeyIcon,
  lock: LockIcon,
};

export function AccountEditPanel({
  account,
  onEditName,
  onEditAvatar,
  onBackupSeed,
  onExportPrivateKey,
  onBack,
}: AccountEditPanelProps): React.ReactElement {
  const { t } = useTranslation();

  const actions: Record<AccountEditAction, () => void> = {
    name: onEditName,
    avatar: onEditAvatar,
    backup: onBackupSeed,
    privateKey: onExportPrivateKey,
  };

  return (
    <SettingsScreenLayout
      title={t('settings.account_edit.title')}
      subtitle={account.name}
      onBack={onBack}
    >
      {ACCOUNT_EDIT_SECTIONS.map((item) => (
        <ListRow
          key={item.action}
          testID={item.testID}
          leading={
            <IconBubble
              size={ROW_BUBBLE_SIZE}
              shape="rounded"
              tone="surface"
              icon={ICONS[item.icon]}
              iconSize={iconSize.md}
            />
          }
          title={t(item.labelKey)}
          onPress={actions[item.action]}
          // No trailing node: these rows push a panel, and the push sinks
          // and floats on the vertical — a right caret would promise a slide.
        />
      ))}
    </SettingsScreenLayout>
  );
}
