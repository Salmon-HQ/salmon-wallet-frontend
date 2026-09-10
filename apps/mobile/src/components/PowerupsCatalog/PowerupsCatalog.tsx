/**
 * PowerupsCatalog — the catalogue, as a sheet over Home.
 *
 * Two sections and nothing else: Core is what Salmon ships, Community is what
 * people may add later. No filters, no search, no "installed" section — an
 * installed Powerup keeps its place in its own tier and says it is installed
 * there. Tapping an entry opens its detail in the same sheet, where one
 * control adds it to Home or takes it away again.
 *
 * The sheet rises only to `maxHeight`, which Home measures from the bottom of
 * its Send / Receive / Activity row: the balance and those buttons stay
 * visible above the catalogue, so it reads as a drawer of Home rather than as
 * a screen that replaced it.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  lineHeight,
  s,
  spacing,
  vs,
  type PowerupsCatalogEntry,
  type Semantic,
} from '@salmon/shared';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
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
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { IconBubble, type IconGlyphProps } from '../IconBubble';
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
 * a community one, later — falls back to the catalogue's own lightning
 * rather than to an empty circle.
 */
const ICONS: Record<string, React.ComponentType<IconGlyphProps>> = {
  swap: ArrowsLeftRightIcon,
  'wallet-guard': ShieldCheckIcon,
  staking: StackIcon,
  'auto-compound': TrendUpIcon,
  'nft-floor-watch': ImageIcon,
};

const TIERS = ['core', 'community'] as const;

export const PowerupsCatalog: React.FC<PowerupsCatalogProps> = ({
  visible,
  onClose,
  entries,
  onInstall,
  onUninstall,
  maxHeight,
  style,
  testID = 'powerups-catalog',
}) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const { standardContentBottomPadding } = useBottomSheetChrome();

  const [detailId, setDetailId] = useState<string | null>(null);
  // A closed sheet is back at its list: reopening onto the detail of whatever
  // was tapped last is a state the user did not leave behind.
  useEffect(() => {
    if (!visible) setDetailId(null);
  }, [visible]);

  const detail = entries.find((entry) => entry.id === detailId) ?? null;

  const handleToggle = useCallback(
    (entry: PowerupsCatalogEntry) => {
      if (entry.installed) onUninstall(entry.id);
      else onInstall(entry.id);
    },
    [onInstall, onUninstall]
  );

  const renderDetail = (entry: PowerupsCatalogEntry) => {
    const Icon = ICONS[entry.id] ?? LightningIcon;
    const name = t(entry.nameKey);
    return (
      <View testID={`powerups-detail-${entry.id}`} style={styles.detail}>
        <View style={styles.detailTop}>
          <IconBubble
            size={DETAIL_BUBBLE_SIZE}
            shape="rounded"
            tone="accent"
            icon={Icon}
            iconWeight="bold"
          />
          <IconBubble
            testID={`powerups-toggle-${entry.id}`}
            size={CONTROL_SIZE}
            tone={entry.installed ? 'outline' : 'accent'}
            icon={entry.installed ? MinusIcon : PlusIcon}
            iconWeight="bold"
            iconSize={CONTROL_ICON_SIZE}
            onPress={() => handleToggle(entry)}
            accessibilityLabel={t(
              entry.installed ? 'accessibility.uninstall_powerup' : 'accessibility.install_powerup',
              { name }
            )}
          />
        </View>
        <View style={styles.detailText}>
          <Text style={styles.detailTitle}>{name}</Text>
          <PowerupBadge tier={entry.tier} />
          <Text style={styles.description}>{t(entry.descriptionKey)}</Text>
        </View>
      </View>
    );
  };

  const renderList = () => (
    <View style={styles.sections}>
      {TIERS.map((tier) => {
        const rows = entries.filter((entry) => entry.tier === tier);
        return (
          <View key={tier} style={styles.section}>
            <SectionLabel variant="caps">{t(`powerups.sections.${tier}`)}</SectionLabel>
            {rows.length > 0 ? (
              rows.map((entry) => (
                <ListRow
                  key={entry.id}
                  testID={`powerups-row-${entry.id}`}
                  padding="lg"
                  leading={
                    <IconBubble
                      size={ROW_BUBBLE_SIZE}
                      shape="rounded"
                      tone="accent-tint"
                      icon={ICONS[entry.id] ?? LightningIcon}
                      iconWeight="bold"
                    />
                  }
                  title={t(entry.nameKey)}
                  subtitle={t(entry.descriptionKey)}
                  trailing={
                    entry.installed ? (
                      <Text style={styles.installed} maxFontSizeMultiplier={fontScaleCap.chrome}>
                        {t('powerups.installed')}
                      </Text>
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
          </View>
        );
      })}
    </View>
  );

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      maxHeight={maxHeight}
      testID={testID}
      style={style}
      headerContent={
        <View style={styles.header}>
          {detail ? (
            <IconBubble
              testID="powerups-detail-back"
              size={CONTROL_SIZE}
              tone="outline"
              icon={CaretLeftIcon}
              iconSize={CONTROL_ICON_SIZE}
              onPress={() => setDetailId(null)}
              accessibilityLabel={t('actions.back', 'Back')}
            />
          ) : (
            <LightningIcon weight="bold" size={s(CONTROL_ICON_SIZE)} color={semantic.accent.ink} />
          )}
          <SheetTitle>{detail ? t(detail.nameKey) : t('powerups.browse_title')}</SheetTitle>
        </View>
      }
    >
      <ScrollView
        testID="powerups-catalog-scroll"
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: standardContentBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {detail ? renderDetail(detail) : renderList()}
      </ScrollView>
    </BottomSheetContainer>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s(spacing.sm),
      paddingHorizontal: s(spacing.screenGutter),
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.md),
    },
    sections: {
      gap: vs(spacing.xl),
    },
    section: {
      gap: vs(spacing.xl),
    },
    detail: {
      gap: vs(spacing.xl),
    },
    detailTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    detailText: {
      gap: vs(spacing.sm),
      alignItems: 'flex-start',
    },
    detailTitle: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.heading),
      lineHeight: s(fontSize.heading) * lineHeight.snug,
      color: t.text.primary,
    },
    description: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.relaxed,
      color: t.text.secondary,
    },
    installed: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.caption),
      color: t.text.tertiary,
    },
  });

export default PowerupsCatalog;
