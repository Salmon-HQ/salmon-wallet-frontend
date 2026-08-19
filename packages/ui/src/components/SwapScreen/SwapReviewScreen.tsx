/**
 * SwapReviewScreen - Second step of swap flow
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Uses CSS gradients instead of expo-linear-gradient.
 * Uses CSS overflow instead of RN ScrollView.
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
  fontFamily,
  fontWeight,
  useCurrencyContext,
  formatAmountWithSymbol,
  formatSolFee,
  formatPercent,
  fontSize,
  letterSpacing,
  lineHeight,
  opacity,
  componentSizes,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import { SwapReviewExchange } from './SwapReviewExchange';
import { SwapDetailsCard } from './SwapDetailsCard';
import { SwapReviewButtons } from './SwapReviewButtons';
import type { SwapReviewScreenProps } from './types';
import type { SwapDetailItem } from '@salmon/shared';

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

const BackgroundPattern = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: componentSizes.backgroundPatternHeight,
  opacity: opacity.faint,
  pointerEvents: 'none',
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

const WarningContent = styled(Box)({
  padding: spacing.base,
});

const WarningTitle = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: semantic.status.warning,
  marginBottom: spacing.xs,
  letterSpacing: letterSpacing.normal,
});

const WarningBodyText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  lineHeight: `${fontSize.sm * lineHeight.normal}px`,
  letterSpacing: letterSpacing.normal,
});

// ============================================================================
// SwapReviewScreen Component
// ============================================================================

/**
 * SwapReviewScreen - Second step of swap flow
 * Shows quote details and confirm/back buttons
 */
export function SwapReviewScreen({
  quote,
  inToken,
  outToken,
  inAmount,
  outAmount,
  onBack,
  onConfirm,
  isConfirming = false,
  isRefreshing = false,
  confirmLabel,
  style,
}: SwapReviewScreenProps): React.ReactElement {
  const { t } = useTranslation();
  const [, { formatValue }] = useCurrencyContext();
  const formatUsd = (value: number | undefined): string | undefined =>
    value != null ? `~${formatValue(value)}` : undefined;

  // Extract swap data for display (custom contains all swap details from backend)
  const { input, output, fee, routeNames, custom: details } = quote;

  // Derive display amounts with fallbacks when quote.input/output are missing
  const inDecimals = input?.decimals ?? inToken.decimals;
  const outDecimals = output?.decimals ?? outToken.decimals;
  const inSymbol = input?.symbol ?? inToken.symbol;
  const outSymbol = output?.symbol ?? outToken.symbol;

  const displayInAmount =
    input?.amount != null
      ? Number(input.amount) / 10 ** inDecimals
      : parseFloat(inAmount || '0') || 0;
  const displayOutAmount =
    output?.amount != null
      ? Number(output.amount) / 10 ** outDecimals
      : parseFloat(outAmount || '0') || 0;

  return (
    <Container style={style}>
      {/* Background Pattern */}
      <BackgroundPattern />

      {/* Title */}
      <Title>{t('swap.review.title')}</Title>

      {/* Scrollable Content */}
      <ScrollContainer>
        <ScrollContent>
          {/* Exchange graphic: sent token → arrow → received token */}
          <CardsContainer>
            {/* The amount being sent is what the user typed: a new quote
                cannot change it, so it never reports loading. Its dollar
                value can, and so can everything on the receive side. */}
            <SwapReviewExchange
              send={{
                label: t('swap.you_send'),
                logo: inToken.logo,
                symbol: inSymbol,
                amount: formatAmountWithSymbol(displayInAmount, inSymbol),
                usdValue: formatUsd(details?.inUsdValue),
                pendingUsdValue: isRefreshing,
              }}
              receive={{
                label: t('swap.you_receive'),
                logo: outToken.logo,
                symbol: outSymbol,
                amount: formatAmountWithSymbol(displayOutAmount, outSymbol),
                usdValue: formatUsd(details?.outUsdValue),
                pendingAmount: isRefreshing,
                pendingUsdValue: isRefreshing,
              }}
            />
          </CardsContainer>

          {/* Details Section — one grouped card, mirroring mobile: the
              critical rows stay visible; the advanced ones fold behind the
              "Details" disclosure inside the card. */}
          <SwapDetailsCard
            style={{ marginBottom: spacing['3xl'] }}
            rows={[
              fee && {
                label: t('swap.review.salmonFee'),
                value: formatPercent(fee.percent),
              },
              details?.slippageBps != null && {
                label: t('swap.slippage_tolerance'),
                value: formatPercent(details.slippageBps / 100),
              },
              details?.otherAmountThreshold != null && {
                label: t('swap.minimum_received'),
                value: formatAmountWithSymbol(
                  Number(details.otherAmountThreshold) / 10 ** outDecimals,
                  outSymbol
                ),
                pending: isRefreshing,
              },
              details?.priceImpact != null && {
                label: t('swap.review.totalPriceImpact'),
                value: formatPercent(details.priceImpact),
                pending: isRefreshing,
              },
            ].filter((row): row is SwapDetailItem => Boolean(row))}
            advancedRows={[
              details?.router && { label: t('swap.router'), value: details.router },
              routeNames &&
                routeNames.length > 0 && {
                  label: t('swap.review.route'),
                  value: routeNames.join(' → '),
                  pending: isRefreshing,
                },
              details?.gasless && { label: t('swap.gasless'), value: t('swap.yes') },
              details?.prioritizationFeeLamports != null && {
                label: t('swap.priority_fee'),
                value: formatSolFee(details.prioritizationFeeLamports),
                pending: isRefreshing,
              },
              details?.rentFeeLamports != null && {
                label: t('swap.rent_fee'),
                value: formatSolFee(details.rentFeeLamports),
                pending: isRefreshing,
              },
              details?.swapMode && { label: t('swap.swap_mode'), value: details.swapMode },
            ].filter((row): row is SwapDetailItem => Boolean(row))}
          />

          {/* Warning Box */}
          <BlurContainer
            borderColor={colors.palette.amber}
            backgroundColor={semantic.status.warningTint}
            style={{ borderRadius: borderRadius.md, marginBottom: spacing.lg }}
          >
            <WarningContent>
              <WarningTitle>{t('swap.review.pleaseNote')}</WarningTitle>
              <WarningBodyText>{t('swap.review.pleaseNoteText')}</WarningBodyText>
            </WarningContent>
          </BlurContainer>
        </ScrollContent>
      </ScrollContainer>

      {/* Buttons */}
      <SwapReviewButtons
        onBack={onBack}
        onConfirm={onConfirm}
        isConfirming={isConfirming}
        isRefreshing={isRefreshing}
        confirmLabel={confirmLabel}
      />
    </Container>
  );
}
