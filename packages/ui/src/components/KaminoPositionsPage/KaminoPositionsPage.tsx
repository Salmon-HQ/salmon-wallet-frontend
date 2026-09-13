/**
 * KaminoPositionsPage — the Kamino Positions Powerup's Home surface on the
 * DOM: one card per loan this address holds on Kamino, read from Kamino's
 * own API. Nothing here signs; the tab only looks (spec 029 §2.1).
 *
 * The mobile twin is `apps/mobile/src/components/KaminoPositionsScreen`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  useCurrencyContext,
} from '@salmon/shared';
import {
  kaminoPositionRows,
  kaminoPositionTitle,
  useKaminoPositions,
} from '@salmon/shared/powerups';

import { useSemantic } from '../../theme/ThemeProvider';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { SkeletonRow } from '../SkeletonRow';
import { StateBlock } from '../StateBlock';
import { WarningNotice } from '../WarningNotice';
import type { KaminoPositionsPageProps } from './types';

const SKELETON_ROWS = 2;

export function KaminoPositionsPage({ publicKey, style }: KaminoPositionsPageProps) {
  const { t, i18n } = useTranslation();
  const semantic = useSemantic();
  const [, { formatValue }] = useCurrencyContext();
  const { positions, loading, error, failedMarkets, refresh } = useKaminoPositions({ publicKey });

  const titleStyle: React.CSSProperties = {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: semantic.text.primary,
    lineHeight: `${fontSize.base * lineHeight.condensed}px`,
  };

  const renderBody = () => {
    if (loading) {
      return Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <SkeletonRow key={index} lines={2} trailingWidth={spacing['4xl']} />
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
        <span style={titleStyle}>{kaminoPositionTitle(position)}</span>
        {kaminoPositionRows(position, t, formatValue, i18n.language).map(({ key, ...row }) => (
          <KeyValueRow key={key} {...row} />
        ))}
      </Card>
    ));
  };

  return (
    <div
      data-testid="kamino-positions-screen"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
        padding: `0 ${spacing.screenGutter}px ${spacing['2xl']}px`,
        ...style,
      }}
    >
      {failedMarkets > 0 && !loading && !error ? (
        <WarningNotice
          tone="warning"
          testID="kamino-positions-partial"
          title={t('kamino-positions.screen.partial', { count: failedMarkets })}
        />
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {renderBody()}
      </div>
    </div>
  );
}

export default KaminoPositionsPage;
