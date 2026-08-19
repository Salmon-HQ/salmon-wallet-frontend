/**
 * BridgeReviewScreen - Third step of bridge flow
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Shows bridge details and confirm/back buttons.
 * Reuses SwapDetailsCard and SwapReviewExchange components from SwapScreen.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  semantic,
  spacing,
  borderRadius,
  borderWidth,
  fontFamily,
  fontWeight,
  formatAmountWithSymbol,
  formatPercent,
  getShortAddress,
  BRIDGE_PARTNER_FEE_PERCENT,
  fontSize,
  letterSpacing,
  lineHeight,
} from '@salmon/shared';
import { SwapDetailsCard } from '../SwapScreen/SwapDetailsCard';
import { SwapReviewExchange } from '../SwapScreen/SwapReviewExchange';
import { SwapReviewButtons } from '../SwapScreen/SwapReviewButtons';
import type { BridgeReviewScreenProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
  padding: `${spacing['2xl']}px ${spacing.headerPadding}px 0`,
  position: 'relative',
});

const Title = styled(Typography)({
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  textAlign: 'center',
  letterSpacing: letterSpacing.wide,
  lineHeight: `${fontSize['2xl'] * lineHeight.condensed}px`,
  marginBottom: spacing['2xl'],
});

const ScrollContainer = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  scrollbarWidth: 'none',
});

const ScrollContent = styled(Box)({
  paddingBottom: spacing['4xl'],
});

const CardsContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
  marginBottom: spacing['2xl'],
});

const WarningBox = styled(Box)({
  backgroundColor: semantic.status.warningTint,
  borderRadius: borderRadius.md,
  border: `${borderWidth.thin}px solid ${semantic.status.warningTintBorder}`,
  padding: spacing.base,
  marginBottom: spacing.lg,
});

const IrreversibleBox = styled(Box)({
  backgroundColor: semantic.status.dangerTint,
  borderRadius: borderRadius.md,
  border: `${borderWidth.thin}px solid ${semantic.status.danger}`,
  padding: spacing.base,
  marginBottom: spacing.md,
});

const IrreversibleTitle = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: semantic.status.danger,
  marginBottom: spacing.xs,
  letterSpacing: letterSpacing.normal,
});

const WarningTitle = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: semantic.status.warning,
  marginBottom: spacing.xs,
  letterSpacing: letterSpacing.normal,
});

const WarningText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  letterSpacing: letterSpacing.normal,
  lineHeight: `${fontSize.sm * lineHeight.normal}px`,
});

// ============================================================================
// BridgeReviewScreen Component
// ============================================================================

/**
 * BridgeReviewScreen - Third step of bridge flow
 * Shows bridge details and confirm/back buttons
 */
export function BridgeReviewScreen({
  inToken,
  outToken,
  inAmount,
  outAmount,
  recipientAddress,
  estimate,
  onBack,
  onConfirm,
  isConfirming = false,
  isRefreshing = false,
  confirmLabel,
  style,
}: BridgeReviewScreenProps) {
  const { t } = useTranslation();
  return (
    <Container style={style}>
      {/* Title */}
      <Title>{t('bridge.review.title')}</Title>

      {/* Scrollable Content */}
      <ScrollContainer>
        <ScrollContent>
          {/* Exchange graphic: sent token → arrow → received token */}
          <CardsContainer>
            <SwapReviewExchange
              send={{
                label: t('swap.you_send'),
                logo: inToken.logo,
                symbol: inToken.symbol,
                amount: formatAmountWithSymbol(inAmount, inToken.symbol),
              }}
              receive={{
                label: t('bridge.review.youReceiveEstimated'),
                logo: outToken.logo,
                symbol: outToken.symbol,
                amount: formatAmountWithSymbol(outAmount, outToken.symbol),
                pendingAmount: isRefreshing,
              }}
            />
          </CardsContainer>

          {/* Details Section — one grouped card, same treatment as the swap
              review (no disclosure: every bridge row is commit-relevant). */}
          <SwapDetailsCard
            style={{ marginBottom: spacing['2xl'] }}
            rows={[
              {
                label: t('bridge.review.recipient'),
                value: getShortAddress(recipientAddress, 8) ?? '',
              },
              {
                label: t('bridge.review.fromNetwork'),
                value: inToken.network || 'Solana',
              },
              {
                label: t('bridge.review.toNetwork'),
                value: outToken.network || t('transactions.unknown'),
              },
              ...(estimate
                ? [
                    {
                      label: t('bridge.review.minimumAmount'),
                      value: formatAmountWithSymbol(estimate.minAmount, inToken.symbol),
                      pending: isRefreshing,
                    },
                    {
                      label: t('bridge.review.estimatedOutput'),
                      value: formatAmountWithSymbol(estimate.estimatedAmount, outToken.symbol),
                      pending: isRefreshing,
                    },
                  ]
                : []),
              // The swap names its cut ("Salmon fee"); the bridge netted 0.4%
              // into the estimate above and said nothing. Same cut, same row.
              {
                label: t('bridge.review.salmonFee'),
                value: formatPercent(BRIDGE_PARTNER_FEE_PERCENT),
              },
              { label: t('bridge.review.provider'), value: 'StealthEX' },
            ]}
          />

          {/* The commit point. Duration is a convenience note; the custody
              and no-recovery facts are the ones that cost money, so they get
              their own box in danger ink directly above the confirm button. */}
          <IrreversibleBox>
            <IrreversibleTitle>{t('bridge.review.irreversible')}</IrreversibleTitle>
            <WarningText>{t('bridge.review.irreversibleText')}</WarningText>
          </IrreversibleBox>

          {/* Warning Box */}
          <WarningBox>
            <WarningTitle>{t('bridge.review.pleaseNote')}</WarningTitle>
            <WarningText>{t('bridge.review.pleaseNoteText')}</WarningText>
          </WarningBox>
        </ScrollContent>
      </ScrollContainer>

      {/* Buttons */}
      <SwapReviewButtons
        onBack={onBack}
        onConfirm={onConfirm}
        isConfirming={isConfirming}
        isRefreshing={isRefreshing}
        confirmLabel={confirmLabel ?? t('bridge.review.confirmSwap')}
      />
    </Container>
  );
}
