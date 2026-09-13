/**
 * KaminoPositionsScreen — the Kamino Positions Powerup's Home surface: one
 * card per loan this address holds on Kamino, read from Kamino's own API.
 * Nothing here signs; the tab only looks (spec 029 §2.1).
 *
 * The DOM twin is `packages/ui/src/components/KaminoPositionsPage`.
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { s, spacing, useCurrencyContext, vs } from '@salmon/shared';
import { describeKaminoBody, useKaminoPositions } from '@salmon/shared/powerups';

import { useThemedStyles } from '../../theme/useThemedStyles';
import { FactsCard } from '../FactsCard';
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

  const body = describeKaminoBody({ positions, loading, error }, t, formatValue, i18n.language);

  const renderBody = () => {
    if (body.kind === 'loading') {
      return Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <SkeletonRow key={index} lines={2} trailingWidth={s(spacing['4xl'])} />
      ));
    }
    if (body.kind === 'state') {
      return (
        <StateBlock {...body.props} onRetry={body.retryable ? () => void refresh() : undefined} />
      );
    }
    return body.cards.map((card) => <FactsCard key={card.id} {...card} />);
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

const stylesFor = () =>
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
  });

export default KaminoPositionsScreen;
