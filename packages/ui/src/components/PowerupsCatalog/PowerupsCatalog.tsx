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
 * The sheet rises only to `maxHeight`, which Home measures from the bottom of
 * its Send / Receive / Activity row.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  fontWeight,
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
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { PowerupBadge } from '../PowerupBadge';
import { SectionLabel } from '../SectionLabel';
import { StateBlock } from '../StateBlock';
import type { PowerupsCatalogProps } from './types';

/** The catalogue row's mark. */
const ROW_BUBBLE_SIZE = 44;
/** The detail's mark, one size up. */
const DETAIL_BUBBLE_SIZE = 76;
/** The install / uninstall control, and the way back out of a detail. */
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
  maxHeight,
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

  const renderDetail = (entry: PowerupsCatalogEntry) => {
    const Icon = ICONS[entry.id] ?? LightningIcon;
    const name = t(entry.nameKey);
    return (
      <div
        data-testid={`powerups-detail-${entry.id}`}
        style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <IconBubble size={DETAIL_BUBBLE_SIZE} shape="rounded" tone="accent" icon={Icon} />
          <IconBubble
            testID={`powerups-toggle-${entry.id}`}
            size={CONTROL_SIZE}
            tone={entry.installed ? 'outline' : 'accent'}
            icon={entry.installed ? MinusIcon : PlusIcon}
            iconSize={CONTROL_ICON_SIZE}
            onPress={() => handleToggle(entry)}
            accessibilityLabel={t(
              entry.installed ? 'accessibility.uninstall_powerup' : 'accessibility.install_powerup',
              { name }
            )}
          />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: spacing.sm,
          }}
        >
          <span
            style={{
              fontFamily: fontFamily.sans,
              fontWeight: fontWeight.bold,
              fontSize: fontSize.heading,
              lineHeight: `${fontSize.heading * lineHeight.snug}px`,
              color: semantic.text.primary,
            }}
          >
            {name}
          </span>
          <PowerupBadge tier={entry.tier} />
          <span
            style={{
              fontFamily: fontFamily.sans,
              fontWeight: fontWeight.medium,
              fontSize: fontSize.body,
              lineHeight: `${fontSize.body * lineHeight.relaxed}px`,
              color: semantic.text.secondary,
            }}
          >
            {t(entry.descriptionKey)}
          </span>
        </div>
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
      maxHeight={maxHeight}
      testID={testID}
      style={style}
      headerContent={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            padding: `0 ${spacing.screenGutter}px`,
          }}
        >
          {detail ? (
            <IconBubble
              testID="powerups-detail-back"
              size={CONTROL_SIZE}
              tone="outline"
              icon={CaretLeftIcon}
              iconSize={CONTROL_ICON_SIZE}
              onPress={() => setDetailId(null)}
              accessibilityLabel={t('accessibility.go_back', 'Go back')}
            />
          ) : (
            <LightningIcon size={CONTROL_ICON_SIZE} color={semantic.accent.ink} />
          )}
          <SheetTitle>{detail ? t(detail.nameKey) : t('powerups.browse_title')}</SheetTitle>
        </div>
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
        {detail ? renderDetail(detail) : renderList()}
      </div>
    </BottomSheetContainer>
  );
}

export default PowerupsCatalog;
