/**
 * SupportSelector — Help & Support, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/SupportSelector`: a
 * `ListRow` per support option plus a security notice about seed phrase
 * protection. Every row leaves the app for an external URL (docs, social,
 * mailto): the external-link glyph says so, and the row announces as a link.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type SupportOptionItem, type IconGlyphProps } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import {
  ArrowSquareOutIcon,
  BookOpenIcon,
  EnvelopeIcon,
  QuestionIcon,
  XLogoIcon,
  iconSize,
} from '../../icons';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { WarningNotice } from '../WarningNotice';
import type { SupportSelectorProps } from './types';

/** The leading well every option row carries — Settings' own row bubble size. */
const ROW_BUBBLE_SIZE = 40;

const ICON_MAP: Record<string, React.ComponentType<IconGlyphProps>> = {
  faq: QuestionIcon,
  docs: BookOpenIcon,
  twitter: XLogoIcon,
  email: EnvelopeIcon,
};

export function SupportSelector({
  options,
  onOpenLink,
  onBack,
}: SupportSelectorProps): React.ReactElement {
  const { t } = useTranslation();
  const { text } = useSemantic();

  const renderOption = useCallback(
    (option: SupportOptionItem) => (
      <ListRow
        key={option.id}
        testID={`support-option-${option.id}`}
        accessibilityRole="link"
        leading={
          <IconBubble
            size={ROW_BUBBLE_SIZE}
            shape="rounded"
            tone="surface"
            // A list where nothing commits has no living element to spend the
            // accent on. Row glyphs take the same quiet ink the settings rows use.
            icon={ICON_MAP[option.id] || QuestionIcon}
            iconSize={iconSize.md}
          />
        }
        title={t(option.title)}
        subtitle={t(option.description)}
        onPress={() => onOpenLink(option.url)}
        trailing={<ArrowSquareOutIcon size={iconSize.md} color={text.tertiary} />}
      />
    ),
    [onOpenLink, t, text.tertiary]
  );

  return (
    <SettingsPanelContent
      title={t('settings.help_support')}
      subtitle={t('settings.help_support_subtitle', 'Get help or contact the team.')}
      onBack={onBack}
    >
      {options.map(renderOption)}

      <WarningNotice tone="warning" title={t('settings.security_notice_title')}>
        {t('settings.security_notice')}
      </WarningNotice>
    </SettingsPanelContent>
  );
}
