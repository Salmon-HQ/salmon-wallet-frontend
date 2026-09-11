/**
 * PowerupsCatalog — the catalogue, as a sheet over Home.
 *
 * Two sections and nothing else: Core is what Salmon ships, Community is what
 * people may add later. No filters, no search, no "installed" section — an
 * installed Powerup keeps its place in its own tier and says it is installed
 * there. Tapping an entry opens its detail in the same sheet, where one
 * control adds it to Home or takes it away again.
 *
 * The sheet rises exactly to `height`, which Home measures as the room under
 * the top of its Portfolio / NFTs row: the balance and the Send / Receive /
 * Activity buttons stay visible above the catalogue, so it reads as a drawer
 * of Home rather than as a screen that replaced it.
 *
 * The detail keeps the sheet's own grammar: the standard title header with
 * its back caret, then the entry as the same row the list drew it as, with
 * the install / uninstall control where the row's trailing slot is.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  s,
  spacing,
  vs,
  type PowerupsCatalogEntry,
  type Semantic,
} from '@salmon/shared';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import {
  ArrowsLeftRightIcon,
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
import { BottomSheetTitleHeader } from '../BottomSheetTitleHeader';
import { IconBubble, type IconGlyphProps } from '../IconBubble';
import { ListRow } from '../ListRow';
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
  height,
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
    const name = t(entry.nameKey);
    return (
      <View testID={`powerups-detail-${entry.id}`}>
        <ListRow
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
          title={name}
          titleAccessory={<PowerupBadge tier={entry.tier} />}
          subtitle={t(entry.descriptionKey)}
          trailing={
            <IconBubble
              testID={`powerups-toggle-${entry.id}`}
              size={CONTROL_SIZE}
              tone={entry.installed ? 'outline' : 'accent'}
              icon={entry.installed ? MinusIcon : PlusIcon}
              iconWeight="bold"
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
      height={height}
      testID={testID}
      style={style}
      headerContent={
        detail ? (
          // The detail is a page of the sheet: the standard title header, its
          // back caret where every sheet page keeps it.
          <BottomSheetTitleHeader title={t(detail.nameKey)} onBack={() => setDetailId(null)} />
        ) : (
          <View style={styles.header}>
            <LightningIcon weight="bold" size={s(CONTROL_ICON_SIZE)} color={semantic.accent.ink} />
            <SheetTitle>{t('powerups.browse_title')}</SheetTitle>
          </View>
        )
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
    installed: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.caption),
      color: t.text.tertiary,
    },
  });

export default PowerupsCatalog;
