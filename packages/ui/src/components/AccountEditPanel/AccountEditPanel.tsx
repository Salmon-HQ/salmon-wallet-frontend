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
import {
  ACCOUNT_EDIT_SECTIONS,
  type AccountEditAction,
  type AccountEditIconName,
  type IconGlyphProps,
} from '@salmon/shared';

import { KeyIcon, LockIcon, TextTIcon, UserCircleIcon, iconSize } from '../../icons';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { SettingsPanelContent } from '../SettingsPanelContent';
import type { AccountEditPanelProps } from './types';

/** The leading well every row carries — Settings' own row bubble size. */
const ROW_BUBBLE_SIZE = 40;

/** The shared table's icon names, as this platform's glyphs. */
const ICONS: Record<AccountEditIconName, React.ComponentType<IconGlyphProps>> = {
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
    <SettingsPanelContent
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
        />
      ))}
    </SettingsPanelContent>
  );
}
