/**
 * KaminoPositionsPage — the Kamino Positions Powerup's Home surface on the
 * DOM: one card per loan this address holds on Kamino, read from Kamino's
 * own API. Nothing here signs; the tab only looks (spec 029 §2.1).
 *
 * The mobile twin is `apps/mobile/src/components/KaminoPositionsScreen`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { spacing, useCurrencyContext } from '@salmon/shared';
import { describeKaminoBody, useKaminoPositions } from '@salmon/shared/powerups';

import { FactsCard } from '../FactsCard';
import { SkeletonRow } from '../SkeletonRow';
import { StateBlock } from '../StateBlock';
import { WarningNotice } from '../WarningNotice';
import type { KaminoPositionsPageProps } from './types';

const SKELETON_ROWS = 2;

export function KaminoPositionsPage({ publicKey, style }: KaminoPositionsPageProps) {
  const { t, i18n } = useTranslation();
  const [, { formatValue }] = useCurrencyContext();
  const { positions, loading, error, failedMarkets, refresh } = useKaminoPositions({ publicKey });

  const body = describeKaminoBody({ positions, loading, error }, t, formatValue, i18n.language);

  const renderBody = () => {
    if (body.kind === 'loading') {
      return Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <SkeletonRow key={index} lines={2} trailingWidth={spacing['4xl']} />
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
