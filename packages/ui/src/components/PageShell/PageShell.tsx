/**
 * PageShell - Shared page layout wrapper for full-page extension views
 *
 * Eliminates the duplicated Container / Header / BackButton / HeaderTitle /
 * ScrollContent pattern that appears identically in:
 *   TokenDetailPage, TransactionHistoryPage, NftDetailPage,
 *   NftSeeAllPage, SendPage, and SettingsPanelContent.
 *
 * Usage:
 *   <PageShell title="Token Information" onBack={onBack}>
 *     {/* page-specific content *\/}
 *   </PageShell>
 */

import React from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { ArrowLeftIcon } from '../../icons';
import { useTranslation } from 'react-i18next';

import { colors, spacing, fontFamily, fontWeight, fontSize } from '@salmon/shared';
import { WaterColumn, waterColumnHost } from '../WaterColumn';
import type { PageShellProps } from './types';

// ============================================================================
// Shared Styled Components
// ============================================================================

export const Container = styled(Box)<{
  $backgroundColor: string;
  $fullHeight: boolean;
  $maxWidth?: number;
}>(({ $backgroundColor, $fullHeight, $maxWidth }) => ({
  display: 'flex',
  flexDirection: 'column',
  ...($fullHeight ? { height: '100vh' } : { minHeight: '100vh' }),
  backgroundColor: $backgroundColor,
  // A stacking context, so the water column's negative layer stays above this
  // background and below the header and the scrolling content.
  ...waterColumnHost,
  ...($maxWidth != null && { maxWidth: $maxWidth, margin: '0 auto', width: '100%' }),
}));

export const Header = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  padding: `${spacing.md}px ${spacing.lg}px`,
  borderBottom: `1px solid ${colors.border.default}`,
  position: 'relative',
  zIndex: 1,
});

export const BackButton = styled(IconButton)({
  color: colors.text.secondary,
  marginRight: spacing.sm,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

export const HeaderTitle = styled(Typography)({
  fontSize: fontSize.lg,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
});

export const ScrollContent = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  position: 'relative',
  zIndex: 1,
});

// ============================================================================
// PageShell Component
// ============================================================================

export function PageShell({
  title,
  onBack,
  backDisabled = false,
  children,
  backgroundColor = 'secondary',
  fullHeight = true,
  headerRight,
  scrollContentStyle,
  scrollContentProps,
  scrollContentRef,
  maxWidth,
  className,
  style,
}: PageShellProps): React.ReactElement {
  const { t } = useTranslation();
  const resolvedBg =
    backgroundColor === 'primary' ? colors.background.primary : colors.background.secondary;

  return (
    <Container
      $backgroundColor={resolvedBg}
      $fullHeight={fullHeight}
      $maxWidth={maxWidth}
      className={className}
      style={style}
    >
      {/* A stacked page is still a screen in the same water. The ground is the
          app's, not the home screen's; what changes here is only what rests on
          top of it. Everything that carries a value — rows, cards, inputs — is
          opaque, so the motif is occluded exactly where it must not be read. */}
      <WaterColumn />

      <Header>
        <BackButton
          onClick={onBack}
          disabled={backDisabled}
          aria-label={t('general.back', 'Back')}
          data-testid="screen-header-back-button"
        >
          <ArrowLeftIcon />
        </BackButton>
        <HeaderTitle>{title}</HeaderTitle>
        {headerRight}
      </Header>

      <ScrollContent
        style={scrollContentStyle}
        ref={
          scrollContentRef ? (node) => scrollContentRef(node as HTMLDivElement | null) : undefined
        }
        {...scrollContentProps}
      >
        {children}
      </ScrollContent>
    </Container>
  );
}
