/**
 * AboutPanel — app info, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AboutPanel`: the drawn mark
 * and wordmark, the social wells under a caps label, a version card, the
 * link rows, and the copyright line.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  APP_VERSION,
  componentSizes,
  fontFamily,
  fontSize,
  lineHeight,
  spacing,
  type IconGlyphProps,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import {
  ArrowSquareOutIcon,
  BookOpenIcon,
  FileTextIcon,
  GithubLogoIcon,
  GlobeIcon,
  ShieldCheckIcon,
  XLogoIcon,
  iconSize,
} from '../../icons';
import { BrandMark, Wordmark } from '../BrandMark';
import { Card } from '../Card';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { SettingsPanelContent } from '../SettingsPanelContent';
import type { AboutPanelProps } from './types';

const LINKS = {
  website: 'https://www.salmonwallet.io',
  twitter: 'https://x.com/salmonwallet',
  github: 'https://github.com/salmon-wallet',
  medium: 'https://medium.com/@salmonwallet',
  privacy: 'https://www.salmonwallet.io/privacy',
  terms: 'https://www.salmonwallet.io/terms',
} as const;

/** The leading well every link row carries — Settings' own row bubble size. */
const ROW_BUBBLE_SIZE = 40;
/** The round wells the social row draws. */
const SOCIAL_BUBBLE_SIZE = 44;

export function AboutPanel({ onBack }: AboutPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const { text } = useSemantic();

  const openLink = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const renderLinkRow = useCallback(
    (Icon: React.ComponentType<IconGlyphProps>, label: string, url: string, id: string) => (
      <ListRow
        key={id}
        testID={`about-link-${id}`}
        accessibilityRole="link"
        leading={<IconBubble size={ROW_BUBBLE_SIZE} shape="rounded" tone="surface" icon={Icon} />}
        title={label}
        onPress={() => openLink(url)}
        trailing={<ArrowSquareOutIcon size={iconSize.sm} color={text.secondary} />}
      />
    ),
    [openLink, text.secondary]
  );

  const renderSocialButton = useCallback(
    (Icon: React.ComponentType<IconGlyphProps>, url: string, id: string, label: string) => (
      <IconBubble
        key={id}
        testID={`about-link-${id}`}
        size={SOCIAL_BUBBLE_SIZE}
        shape="rounded"
        tone="surface"
        icon={Icon}
        iconSize={iconSize.lg}
        onPress={() => openLink(url)}
        accessibilityLabel={label}
      />
    ),
    [openLink]
  );

  return (
    <SettingsPanelContent
      title={t('settings.about')}
      subtitle={t('settings.about_subtitle', 'App version and legal information.')}
      onBack={onBack}
    >
      {/* The drawn mark and name, at the same mark→name air the welcome and
          success screens use. */}
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md }}
      >
        <BrandMark size={componentSizes.logoSizeMedium} />
        <Wordmark />
      </div>

      <div style={{ width: '100%' }}>
        <SectionLabel variant="caps" style={{ textAlign: 'center', marginBottom: spacing.md }}>
          {t('actions.follow_us')}
        </SectionLabel>
        <div style={{ display: 'flex', justifyContent: 'center', gap: spacing.lg }}>
          {renderSocialButton(XLogoIcon, LINKS.twitter, 'twitter', 'X')}
          {renderSocialButton(GithubLogoIcon, LINKS.github, 'github', 'GitHub')}
          {renderSocialButton(BookOpenIcon, LINKS.medium, 'medium', 'Medium')}
        </div>
      </div>

      <Card padding="md" gap={spacing.sm}>
        <KeyValueRow label={t('settings.about_version_label')} value={APP_VERSION || '—'} />
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.screenGutter }}>
        {renderLinkRow(GlobeIcon, t('settings.about_website', 'Website'), LINKS.website, 'website')}
        {renderLinkRow(
          ShieldCheckIcon,
          t('settings.about_privacy', 'Privacy Policy'),
          LINKS.privacy,
          'privacy'
        )}
        {renderLinkRow(
          FileTextIcon,
          t('settings.about_terms', 'Terms of Service'),
          LINKS.terms,
          'terms'
        )}
      </div>

      <p
        style={{
          margin: 0,
          color: text.tertiary,
          fontFamily: fontFamily.sans,
          fontSize: fontSize.caption,
          lineHeight: `${fontSize.caption * lineHeight.normal}px`,
          textAlign: 'center',
        }}
      >
        {t('settings.about_copyright', { year: new Date().getFullYear() })}
      </p>
    </SettingsPanelContent>
  );
}
