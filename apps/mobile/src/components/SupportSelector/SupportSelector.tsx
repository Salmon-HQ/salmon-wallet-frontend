/**
 * SupportSelector - Help & Support component for mobile
 *
 * A `ListRow` group, one row per support option, plus a security notice
 * about seed phrase protection. Every row leaves the app for an external URL
 * (docs, social, mailto): the external-link glyph says so, not the
 * navigation caret `ListRow`'s trailing chevron would draw.
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowSquareOutIcon,
  BookOpenIcon,
  EnvelopeIcon,
  QuestionIcon,
  XLogoIcon,
  iconSize,
} from '../../icons';
import type { IconComponent } from '../../icons';

import { type SupportOptionItem, semantic } from '@salmon/shared';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { WarningNotice } from '../WarningNotice';
import type { SupportSelectorProps } from './types';

/** The leading well every option row carries — Settings' own row bubble size. */
const ROW_BUBBLE_SIZE = 40;

const ICON_MAP: Record<string, IconComponent> = {
  faq: QuestionIcon,
  docs: BookOpenIcon,
  twitter: XLogoIcon,
  email: EnvelopeIcon,
};

export function SupportSelector({ options, onOpenLink, onBack }: SupportSelectorProps) {
  const { t } = useTranslation();

  const renderOption = useCallback(
    (option: SupportOptionItem) => (
      <ListRow
        key={option.id}
        testID={`support-option-${option.id}`}
        leading={
          <IconBubble
            size={ROW_BUBBLE_SIZE}
            shape="rounded"
            tone="surface"
            // A list where nothing commits has no living element to spend the
            // accent on. Row glyphs take the same quiet ink and neutral tile
            // the settings rows use.
            icon={ICON_MAP[option.id] || QuestionIcon}
            iconColor={semantic.text.primary}
          />
        }
        title={t(option.title)}
        subtitle={t(option.description)}
        onPress={() => onOpenLink(option.url)}
        trailing={<ArrowSquareOutIcon size={iconSize.md} color={semantic.text.tertiary} />}
      />
    ),
    [onOpenLink, t]
  );

  return (
    <SettingsScreenLayout
      title={t('settings.help_support')}
      subtitle={t('settings.help_support_subtitle', 'Get help or contact the team.')}
      onBack={onBack}
    >
      {options.map(renderOption)}

      <WarningNotice tone="warning" title={t('settings.security_notice_title')}>
        {t('settings.security_notice')}
      </WarningNotice>
    </SettingsScreenLayout>
  );
}

export default SupportSelector;
