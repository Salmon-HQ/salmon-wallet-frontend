/**
 * PowerupsLauncherSheet — POWERUPS 01 Installed launcher, stub.
 *
 * The grid of installed powerups is empty for this lote (CORE 01 only wires
 * the shell); it fills in a later lote. The one live affordance is the
 * "Browse Powerups" row, which will lead to POWERUPS 02.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  fontFamilyNative,
  fontSize,
  ms,
  s,
  semantic,
  spacing,
  vs,
} from '@salmon/shared';
import { LightningIcon, StorefrontIcon } from '../../icons';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { Thermocline } from '../Thermocline';
import type { PowerupsLauncherSheetProps } from './types';

const BROWSE_ICON_CIRCLE_SIZE = 40;
const BROWSE_GLYPH_SIZE = 19;

export const PowerupsLauncherSheet: React.FC<PowerupsLauncherSheetProps> = ({
  visible,
  onClose,
  style,
  testID = 'powerups-launcher-sheet',
}) => {
  const { t } = useTranslation();

  const title = (
    <View style={styles.headingRow}>
      <LightningIcon weight="bold" size={ms(18)} color={semantic.accent.ink} />
      <Text style={styles.headingTitle}>{t('powerups.title', 'Powerups')}</Text>
    </View>
  );

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      title={title}
      testID={testID}
      style={style}
      background={<Thermocline tier="thick" style={styles.thermocline} />}
    >
      <View style={styles.content}>
        <SectionLabel variant="caps">{t('powerups.installed', 'INSTALLED')}</SectionLabel>

        {/* Installed powerups grid — intentionally empty for this lote. */}
        <View style={styles.grid} testID="powerups-installed-grid" />

        <ListRow
          testID="powerups-browse-button"
          tone="accent"
          padding="lg"
          leading={
            <IconBubble
              size={BROWSE_ICON_CIRCLE_SIZE}
              tone="surface"
              icon={StorefrontIcon}
              iconWeight="bold"
              iconSize={BROWSE_GLYPH_SIZE}
            />
          }
          title={t('powerups.browse_title', 'Browse Powerups')}
          subtitle={t('powerups.browse_subtitle', 'Featured, official and community')}
          // No `onPress`, no chevron: the browse screen is a later lote, and a
          // row that looks tappable and does nothing is worse than one that
          // does not invite the tap. Both come back with the screen.
        />
      </View>
    </BottomSheetContainer>
  );
};

const styles = StyleSheet.create({
  thermocline: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: borderRadius.card,
    borderTopRightRadius: borderRadius.card,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
    paddingHorizontal: s(spacing.headerPadding),
  },
  headingTitle: {
    fontSize: ms(fontSize.headline),
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
  },
  content: {
    paddingHorizontal: s(spacing.headerPadding),
    paddingTop: vs(spacing.xl),
    gap: vs(spacing.md),
  },
  grid: {
    minHeight: vs(spacing.xl),
  },
});

export default PowerupsLauncherSheet;
