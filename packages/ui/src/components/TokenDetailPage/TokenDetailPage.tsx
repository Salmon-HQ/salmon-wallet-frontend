/**
 * TokenDetailPage - Full-page token detail view
 *
 * The pushed form of the token detail screen: a back-navigable page shell
 * around `TokenDetailContent`. Everything inside the shell — order, rhythm,
 * titles, skeletons — belongs to that component, which the Bitcoin home tab
 * renders too. This file owns the page chrome and nothing else.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';

import { spacing } from '@salmon/shared';

import { PageShell } from '../PageShell';
import { TokenDetailContent } from './TokenDetailContent';
import type { TokenDetailPageProps } from './types';

const ContentContainer = styled(Box)({
  padding: `${spacing.lg}px ${spacing.xl}px`,
  paddingBottom: spacing['2xl'],
});

export function TokenDetailPage({
  onBack,
  style,
  className,
  ...content
}: TokenDetailPageProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <PageShell
      title={t('token.detail.title', 'Token Information')}
      onBack={onBack}
      style={style}
      className={className}
    >
      <ContentContainer>
        <TokenDetailContent {...content} bleed={spacing.xl} />
      </ContentContainer>
    </PageShell>
  );
}
