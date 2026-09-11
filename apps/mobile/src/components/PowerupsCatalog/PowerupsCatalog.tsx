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
 * the install / uninstall control where the row's trailing slot is — and
 * under it the facts (owner, 2026-09-11): what it does, what you can do, who
 * made it, where it acts, what leaves the device. The detail is a second
 * sheet risen over the catalogue (owner, 2026-09-11), not a page inside it:
 * the list stays put underneath and takes the detail back when it lowers.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  getNetworkName,
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
  ImageIcon,
  LightningIcon,
  ShieldCheckIcon,
  StackIcon,
  TrendUpIcon,
} from '../../icons';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { BottomSheetTitleHeader } from '../BottomSheetTitleHeader';
import { Card } from '../Card';
import { IconBubble, type IconGlyphProps } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { ListRow } from '../ListRow';
import { PlusMinusGlyph } from '../PlusMinusGlyph';
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

  const handleDismissAll = useCallback(() => {
    setDetailId(null);
    onClose();
  }, [onClose]);

  const handleToggle = useCallback(
    (entry: PowerupsCatalogEntry) => {
      if (entry.installed) onUninstall(entry.id);
      else onInstall(entry.id);
    },
    [onInstall, onUninstall]
  );

  const renderDetail = (entry: PowerupsCatalogEntry) => {
    const name = t(entry.nameKey);
    const { details } = entry;
    return (
      <View testID={`powerups-detail-${entry.id}`} style={styles.detail}>
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

        <View style={styles.block}>
          <SectionLabel variant="caps">{t('powerups.detail.about')}</SectionLabel>
          <Text style={styles.body}>{t(details.aboutKey)}</Text>
        </View>

        {details.actionKeys.length > 0 ? (
          <View style={styles.block}>
            <SectionLabel variant="caps">{t('powerups.detail.what_you_can_do')}</SectionLabel>
            {/* A hanging list: the marker keeps its own column, so a wrapped
                line starts under the first word, never under the dot. */}
            <View style={styles.list}>
              {details.actionKeys.map((key) => (
                <View key={key} style={styles.listItem}>
                  <View style={styles.marker}>
                    <View style={styles.dot} />
                  </View>
                  <Text style={styles.listText}>{t(key)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* A sentence, not a fact: it reads like About, not like a value in
            the facts card, whose values are bold by construction. */}
        <View style={styles.block}>
          <SectionLabel variant="caps">{t('powerups.detail.uses')}</SectionLabel>
          <Text style={styles.body} testID="powerups-detail-uses">
            {t(details.usesKey)}
          </Text>
        </View>

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
        <View style={styles.header}>
          <LightningIcon weight="bold" size={s(CONTROL_ICON_SIZE)} color={semantic.accent.ink} />
          <SheetTitle>{t('powerups.browse_title')}</SheetTitle>
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
        {renderList()}
      </ScrollView>

      {/* The detail is its own sheet, risen over the catalogue (owner,
              2026-09-11): the list stays where it was underneath, and the back
              caret — or the drag — lowers the detail back onto it. Mounted INSIDE
              the catalogue's sheet: iOS presents one native modal at a time
              unless the next one is presented from within the first. */}
      <BottomSheetContainer
        visible={visible && detail !== null}
        // Dismissing the detail — a tap above it, a drag down — leaves the
        // whole catalogue (owner, 2026-09-11): the user is done, not one
        // level back. Only the back caret returns to the list.
        onClose={handleDismissAll}
        testID={detail ? `powerups-detail-sheet-${detail.id}` : 'powerups-detail-sheet'}
        headerContent={
          detail ? (
            <BottomSheetTitleHeader title={t(detail.nameKey)} onBack={() => setDetailId(null)} />
          ) : null
        }
      >
        <ScrollView
          testID="powerups-detail-scroll"
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: standardContentBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {detail ? renderDetail(detail) : null}
        </ScrollView>
      </BottomSheetContainer>
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
    block: {
      gap: vs(spacing.sm),
    },
    // Body copy at the token detail's weight: regular under a caps label, so
    // label, paragraph and list read as three levels, not one grey block.
    body: {
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.relaxed,
      color: t.text.secondary,
    },
    list: {
      gap: vs(spacing.xs),
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    marker: {
      width: s(spacing.md),
      // Sits the dot on the first line's optical centre.
      paddingTop: vs(spacing.sm),
    },
    dot: {
      width: s(spacing.xs),
      height: s(spacing.xs),
      borderRadius: borderRadius.full,
      backgroundColor: t.accent.ink,
    },
    listText: {
      flex: 1,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      color: t.text.secondary,
    },
    installed: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.caption),
      color: t.text.tertiary,
    },
  });

export default PowerupsCatalog;
