/**
 * PowerupsCatalog — the catalogue, as a sheet over Home, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/PowerupsCatalog`. Two
 * sections and nothing else: Core is what Salmon ships, Community is what
 * people may add later. No filters, no search, no "installed" section — an
 * installed Powerup keeps its place in its own tier and says it is installed
 * there. Tapping an entry opens its detail in the same sheet, where one
 * control adds it to Home or takes it away again.
 *
 * The sheet rises exactly to `height`, which Home measures as the room under
 * the top of its Portfolio / NFTs row. The detail keeps the sheet's own
 * grammar: the title with its back caret on the left, then the entry as the
 * same row the list drew it as, with the install / uninstall control in the
 * row's trailing slot — and under it the facts (owner, 2026-09-11): what it
 * does, what you can do, who made it, where it acts, what leaves the device.
 * List and detail trade places on the verb through `SinkFloat`.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  componentSizes,
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
  CaretLeftIcon,
  ImageIcon,
  LightningIcon,
  MinusIcon,
  PlusIcon,
  ShieldCheckIcon,
  StackIcon,
  TrendUpIcon,
} from '../../icons';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { Card } from '../Card';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { ListRow } from '../ListRow';
import { SinkFloat } from '../SinkFloat';
import { PowerupBadge } from '../PowerupBadge';
import { SectionLabel } from '../SectionLabel';
import { StateBlock } from '../StateBlock';
import type { PowerupsCatalogProps } from './types';

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

export function PowerupsCatalog({
  visible,
  onClose,
  entries,
  onInstall,
  onUninstall,
  height,
  style,
  testID = 'powerups-catalog',
}: PowerupsCatalogProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();

  const [detailId, setDetailId] = useState<string | null>(null);
  // A closed sheet is back at its list: reopening onto the detail of whatever
  // was tapped last is a state the user did not leave behind.
  useEffect(() => {
    if (!visible) setDetailId(null);
  }, [visible]);

  const detail = entries.find((entry) => entry.id === detailId) ?? null;

  const handleToggle = (entry: PowerupsCatalogEntry) => {
    if (entry.installed) onUninstall(entry.id);
    else onInstall(entry.id);
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.body,
    lineHeight: `${fontSize.body * lineHeight.relaxed}px`,
    color: semantic.text.secondary,
  };
  const blockStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  };

  const renderDetail = (entry: PowerupsCatalogEntry) => {
    const name = t(entry.nameKey);
    const { details } = entry;
    return (
      <div
        data-testid={`powerups-detail-${entry.id}`}
        style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}
      >
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
              icon={entry.installed ? MinusIcon : PlusIcon}
              iconSize={CONTROL_ICON_SIZE}
              onPress={() => handleToggle(entry)}
              accessibilityLabel={t(
                entry.installed
                  ? 'accessibility.uninstall_powerup'
                  : 'accessibility.install_powerup',
                { name }
              )}
            />
          }
        />

        <div style={blockStyle}>
          <SectionLabel variant="caps">{t('powerups.detail.about')}</SectionLabel>
          <span style={bodyStyle}>{t(details.aboutKey)}</span>
        </div>

        {details.actionKeys.length > 0 ? (
          <div style={blockStyle}>
            <SectionLabel variant="caps">{t('powerups.detail.what_you_can_do')}</SectionLabel>
            {details.actionKeys.map((key) => (
              <span key={key} style={bodyStyle}>
                {`\u2022 ${t(key)}`}
              </span>
            ))}
          </div>
        ) : null}

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
          <KeyValueRow
            label={t('powerups.detail.uses')}
            value={t(details.usesKey)}
            layout="stacked"
          />
        </Card>
      </div>
    );
  };

  const renderList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
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
  );

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      height={height}
      testID={testID}
      style={style}
      headerContent={
        <SinkFloat transitionKey={detail ? 'detail' : 'list'}>
          {detail ? (
            // The detail is a page of the sheet: the title centred, the back
            // caret on the left where the mobile title header keeps it.
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: componentSizes.iconSizeMedium,
                padding: `0 ${spacing.xl + componentSizes.iconSizeMedium}px`,
              }}
            >
              <button
                type="button"
                data-testid="screen-header-back-button"
                aria-label={t('general.back', 'Back')}
                onClick={() => setDetailId(null)}
                style={{
                  position: 'absolute',
                  left: spacing.xl,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'inline-flex',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  color: semantic.text.primary,
                  cursor: 'pointer',
                }}
              >
                <CaretLeftIcon size={componentSizes.iconSizeMedium} color={semantic.text.primary} />
              </button>
              <SheetTitle>{t(detail.nameKey)}</SheetTitle>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                padding: `0 ${spacing.screenGutter}px`,
              }}
            >
              <LightningIcon size={CONTROL_ICON_SIZE} color={semantic.accent.ink} />
              <SheetTitle>{t('powerups.browse_title')}</SheetTitle>
            </div>
          )}
        </SinkFloat>
      }
    >
      <div
        data-testid="powerups-catalog-scroll"
        style={{
          overflowY: 'auto',
          paddingTop: spacing.md,
          paddingBottom: spacing['2xl'],
        }}
      >
        <SinkFloat transitionKey={detail ? `detail-${detail.id}` : 'list'}>
          {detail ? renderDetail(detail) : renderList()}
        </SinkFloat>
      </div>
    </BottomSheetContainer>
  );
}

export default PowerupsCatalog;
