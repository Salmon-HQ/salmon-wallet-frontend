/**
 * KaminoPositionsScreen — the Kamino Positions Powerup's Home surface: one
 * card per loan this address holds on Kamino, read from Kamino's own API.
 * Nothing here signs; the tab only looks (spec 029 §2.1).
 *
 * The DOM twin is `packages/ui/src/components/KaminoPositionsPage`.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  spacing,
  useCurrencyContext,
  vs,
  type Semantic,
} from '@salmon/shared';
import {
  kaminoPositionRows,
  kaminoPositionTitle,
  useKaminoPositions,
} from '@salmon/shared/powerups';

import { useThemedStyles } from '../../theme/useThemedStyles';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { SkeletonRow } from '../SkeletonRow';
import { StateBlock } from '../StateBlock';
import { WarningNotice } from '../WarningNotice';
import type { KaminoPositionsScreenProps } from './types';

const SKELETON_ROWS = 2;

export const KaminoPositionsScreen: React.FC<KaminoPositionsScreenProps> = ({
  publicKey,
  style,
}) => {
  const { t, i18n } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const [, { formatValue }] = useCurrencyContext();
  const { positions, loading, error, failedMarkets, refresh } = useKaminoPositions({ publicKey });

  const renderBody = () => {
    if (loading) {
      return Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <SkeletonRow key={index} lines={2} trailingWidth={s(spacing['4xl'])} />
      ));
    }
    if (error) {
      return (
        <StateBlock
          testID="kamino-positions-error"
          tone="error"
          title={t('kamino-positions.screen.error_title')}
          body={t('kamino-positions.screen.error_body')}
          onRetry={() => void refresh()}
          retryLabel={t('kamino-positions.screen.retry')}
        />
      );
    }
    if (positions.length === 0) {
      return (
        <StateBlock
          testID="kamino-positions-empty"
          tone="empty"
          title={t('kamino-positions.screen.empty_title')}
          body={t('kamino-positions.screen.empty_body')}
        />
      );
    }
    return positions.map((position) => (
      <Card
        key={position.id}
        padding="lg"
        gap={spacing.md}
        testID={`kamino-position-${position.id}`}
      >
        <Text style={styles.title}>{kaminoPositionTitle(position)}</Text>
        {kaminoPositionRows(position, t, formatValue, i18n.language).map(({ key, ...row }) => (
          <KeyValueRow key={key} {...row} />
        ))}
      </Card>
    ));
  };

  return (
    <ScrollView
      testID="kamino-positions-screen"
      style={[styles.scroll, style]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {failedMarkets > 0 && !loading && !error ? (
        <WarningNotice
          tone="warning"
          testID="kamino-positions-partial"
          title={t('kamino-positions.screen.partial', { count: failedMarkets })}
        />
      ) : null}
      <View style={styles.list}>{renderBody()}</View>
    </ScrollView>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingBottom: vs(spacing['2xl']),
      gap: vs(spacing.md),
    },
    list: {
      gap: vs(spacing.md),
    },
    title: {
      fontSize: s(fontSize.base),
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
      lineHeight: s(fontSize.base) * lineHeight.condensed,
    },
  });

export default KaminoPositionsScreen;
