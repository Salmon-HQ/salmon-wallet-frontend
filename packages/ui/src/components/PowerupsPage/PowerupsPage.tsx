/**
 * PowerupsPage — the catalogue, as a page of Home's stack, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/PowerupsCatalog`, a sheet;
 * here it is a screen (owner, 2026-09-11: a side panel's sheet neither
 * animates well nor fits the detail). Two sections and nothing else: Core is
 * what Salmon ships, Community is what people may add later. An entry opens
 * its detail as the next screen of the same stack — the kit's `SlideStack`
 * push — where one control adds it to Home or takes it away again, over the
 * facts (owner, 2026-09-11): what it does, what you can do, who made it,
 * where it acts, what leaves the device.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  getNetworkName,
  lineHeight,
  spacing,
  type PowerupsCatalogEntry,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import {
  ArrowsLeftRightIcon,
  ImageIcon,
  LightningIcon,
  ShieldCheckIcon,
  StackIcon,
  TrendUpIcon,
} from '../../icons';
import { SlideStack } from '../../motion';
import { Card } from '../Card';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { ListRow } from '../ListRow';
import { PlusMinusGlyph } from '../PlusMinusGlyph';
import { WarningNotice } from '../WarningNotice';
import { PowerupBadge } from '../PowerupBadge';
import { SectionLabel } from '../SectionLabel';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { StateBlock } from '../StateBlock';
import type { PowerupsPageProps } from './types';

/** The catalogue row's mark. */
const ROW_BUBBLE_SIZE = 44;
/** The install / uninstall control in the detail row's trailing slot. */
const CONTROL_SIZE = 42;
const CONTROL_ICON_SIZE = 22;

/**
 * The mark each entry wears here. A Powerup the platform has no icon for —
 * a community one, later — falls back to the catalogue's own lightning.
 */
const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  swap: ArrowsLeftRightIcon,
  'wallet-guard': ShieldCheckIcon,
  staking: StackIcon,
  'auto-compound': TrendUpIcon,
  'nft-floor-watch': ImageIcon,
};

const TIERS = ['core', 'community'] as const;

export function PowerupsPage({
  entries,
  onInstall,
  onUninstall,
  onBack,
  style,
  className,
  testID = 'powerups-page',
}: PowerupsPageProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = entries.find((entry) => entry.id === detailId) ?? null;

  const handleToggle = (entry: PowerupsCatalogEntry) => {
    if (entry.installed) onUninstall(entry.id);
    else onInstall(entry.id);
  };

  // Body copy at the token detail's weight: regular under a caps label, so
  // label, paragraph and list read as three levels, not one grey block.
  const bodyStyle: React.CSSProperties = {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.regular,
    fontSize: fontSize.body,
    lineHeight: `${fontSize.body * lineHeight.relaxed}px`,
    color: semantic.text.secondary,
  };
  const listTextStyle: React.CSSProperties = {
    ...bodyStyle,
    lineHeight: `${fontSize.body * lineHeight.snug}px`,
    flex: 1,
  };
  const blockStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  };
  // A hanging list: the marker keeps its own column, so a wrapped line
  // starts under the first word, never under the dot.
  const listItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start' };
  const markerStyle: React.CSSProperties = {
    width: spacing.md,
    flexShrink: 0,
    paddingTop: spacing.sm,
  };
  const dotStyle: React.CSSProperties = {
    display: 'block',
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: semantic.accent.ink,
  };

  const renderDetail = (entry: PowerupsCatalogEntry) => {
    const name = t(entry.nameKey);
    const { details } = entry;
    return (
      <SettingsPanelContent
        testID={`powerups-detail-${entry.id}`}
        title={name}
        onBack={() => setDetailId(null)}
        style={style}
        className={className}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          <ListRow
            leading={
              <IconBubble
                size={ROW_BUBBLE_SIZE}
                shape="rounded"
                tone="accent-tint"
                icon={ICONS[entry.id] ?? LightningIcon}
              />
            }
            title={name}
            titleAccessory={<PowerupBadge tier={entry.tier} />}
            subtitle={t(entry.descriptionKey)}
            trailing={
              <IconBubble
                testID={`powerups-toggle-${entry.id}`}
                size={CONTROL_SIZE}
                tone={entry.installed ? 'outline' : 'accent'}
                onPress={() => handleToggle(entry)}
                accessibilityLabel={t(
                  entry.installed
                    ? 'accessibility.uninstall_powerup'
                    : 'accessibility.install_powerup',
                  { name }
                )}
              >
                <PlusMinusGlyph
                  minus={entry.installed}
                  size={CONTROL_ICON_SIZE}
                  color={entry.installed ? semantic.text.primary : semantic.accent.onFill}
                />
              </IconBubble>
            }
          />

          {/* Switched off by the backend: one state per reason, before anything
              else, so the user reads why the surface is gone (spec 029 §5.2). */}
          {entry.disabledReason ? (
            <WarningNotice
              tone="warning"
              testID={`powerups-disabled-${entry.disabledReason}`}
              title={t(`powerups.disabled.${entry.disabledReason}`)}
            />
          ) : null}

          <div style={blockStyle}>
            <SectionLabel variant="caps">{t('powerups.detail.about')}</SectionLabel>
            <span style={bodyStyle}>{t(details.aboutKey)}</span>
          </div>

          {details.actionKeys.length > 0 ? (
            <div style={blockStyle}>
              <SectionLabel variant="caps">{t('powerups.detail.what_you_can_do')}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                {details.actionKeys.map((key) => (
                  <div key={key} style={listItemStyle}>
                    <span style={markerStyle}>
                      <span style={dotStyle} />
                    </span>
                    <span style={listTextStyle}>{t(key)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* A sentence, not a fact: it reads like About, not like a value in
              the facts card, whose values are bold by construction. */}
          <div style={blockStyle}>
            <SectionLabel variant="caps">{t('powerups.detail.uses')}</SectionLabel>
            <span style={bodyStyle} data-testid="powerups-detail-uses">
              {details.disclosure.map((line) => t(line.key, line.params)).join(' ')}
            </span>
          </div>

          <Card padding="lg" gap={spacing.md} testID={`powerups-facts-${entry.id}`}>
            <KeyValueRow
              testID="powerups-detail-author"
              label={t('powerups.detail.made_by')}
              value={t(details.authorKey)}
            />
            <KeyValueRow
              label={t('powerups.detail.networks')}
              value={details.networks.map(getNetworkName).join(', ')}
            />
          </Card>
        </div>
      </SettingsPanelContent>
    );
  };

  const renderList = () => (
    <SettingsPanelContent
      testID={testID}
      title={t('powerups.browse_title')}
      onBack={onBack}
      style={style}
      className={className}
    >
      <div
        data-testid="powerups-catalog-scroll"
        style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}
      >
        {TIERS.map((tier) => {
          const rows = entries.filter((entry) => entry.tier === tier);
          return (
            <div key={tier} style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
              <SectionLabel variant="caps">{t(`powerups.sections.${tier}`)}</SectionLabel>
              {rows.length > 0 ? (
                rows.map((entry) => (
                  <ListRow
                    key={entry.id}
                    testID={`powerups-row-${entry.id}`}
                    leading={
                      <IconBubble
                        size={ROW_BUBBLE_SIZE}
                        shape="rounded"
                        tone="accent-tint"
                        icon={ICONS[entry.id] ?? LightningIcon}
                      />
                    }
                    title={t(entry.nameKey)}
                    subtitle={t(entry.descriptionKey)}
                    trailing={
                      entry.installed ? (
                        <span
                          style={{
                            fontFamily: fontFamily.sans,
                            fontWeight: fontWeight.medium,
                            fontSize: fontSize.caption,
                            color: semantic.text.tertiary,
                          }}
                        >
                          {t('powerups.installed')}
                        </span>
                      ) : undefined
                    }
                    onPress={() => setDetailId(entry.id)}
                  />
                ))
              ) : (
                <StateBlock
                  testID={`powerups-empty-${tier}`}
                  tone="empty"
                  title={t('powerups.empty_section')}
                />
              )}
            </div>
          );
        })}
      </div>
    </SettingsPanelContent>
  );

  // The detail is the next screen of the stack: a push in, a pop back out.
  return (
    <SlideStack
      screenKey={detail ? `detail-${detail.id}` : 'list'}
      depth={detail ? 1 : 0}
      style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      {detail ? renderDetail(detail) : renderList()}
    </SlideStack>
  );
}

export default PowerupsPage;
