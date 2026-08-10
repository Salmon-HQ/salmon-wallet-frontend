import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import { keyframes } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import { colors, gradients, spacing, borderRadius, fontFamily, fontSize, fontWeight, lineHeight, componentSizes, borderWidth, duration, easing } from '@salmon/shared';
import { LoadingScreen } from '../LoadingScreen';
import type { TransactionSuccessScreenProps } from './types';

// ============================================================================
// Keyframes
// ============================================================================

const scaleIn = keyframes`
  0% { transform: scale(0); }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  display: 'flex',
  flex: 1,
  height: '100%',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: spacing.xl,
});

const Circle = styled(Box)({
  width: componentSizes.logoSizeSmall,
  height: componentSizes.logoSizeSmall,
  borderRadius: borderRadius.full,
  backgroundColor: colors.status.success,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: spacing['3xl'],
  animation: `${scaleIn} ${duration.slower} ${easing.bounce} forwards`,
});

const Checkmark = styled(Typography)({
  fontSize: fontSize['4xl'],
  color: colors.text.primary,
  fontWeight: fontWeight.bold,
  lineHeight: lineHeight.none,
});

const Title = styled(Typography)({
  fontSize: fontSize.title,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  textAlign: 'center',
  marginBottom: spacing.sm,
  opacity: 0,
  animation: `${fadeIn} ${duration.slow} ${easing.easeOut} ${duration.slow} forwards`,
});

const Summary = styled(Typography)({
  fontSize: fontSize.md,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  textAlign: 'center',
  marginBottom: spacing.lg,
  opacity: 0,
  animation: `${fadeIn} ${duration.slow} ${easing.easeOut} ${duration.stagger1} forwards`,
});

const ExplorerLink = styled(Link)({
  fontSize: fontSize.base,
  fontFamily: fontFamily.sans,
  color: colors.accent.primary,
  textAlign: 'center',
  cursor: 'pointer',
  marginBottom: spacing['4xl'],
  opacity: 0,
  animation: `${fadeIn} ${duration.slow} ${easing.easeOut} ${duration.stagger2} forwards`,
});

const BridgeInfoBox = styled(Box)({
  width: '100%',
  backgroundColor: colors.background.tertiary,
  borderRadius: borderRadius.card,
  padding: spacing.lg,
  marginBottom: spacing.xl,
  opacity: 0,
  animation: `${fadeIn} ${duration.slow} ${easing.easeOut} ${duration.stagger1} forwards`,
});

const BridgeLabel = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  color: colors.text.tertiary,
  marginBottom: spacing.xs,
});

const BridgeValue = styled(Typography)({
  fontSize: fontSize.base,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  wordBreak: 'break-all' as const,
  marginBottom: spacing.md,
});

const ContinueButton = styled(Button)({
  minWidth: componentSizes.buttonMinWidthLg,
  height: componentSizes.buttonHeightCompact,
  borderRadius: borderRadius.lg,
  background: gradients.primaryCSS,
  border: `${borderWidth.accent}px solid ${colors.accent.border}`,
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.semibold,
  fontSize: fontSize.md,
  textTransform: 'none',
  opacity: 0,
  animation: `${fadeIn} ${duration.slow} ${easing.easeOut} ${duration.stagger3} forwards`,
  '&:hover': {
    background: gradients.primaryCSS,
  },
});

// ============================================================================
// Component
// ============================================================================

export function TransactionSuccessScreen({
  title,
  summary,
  explorerUrl,
  onContinue,
  settling = false,
  pendingTitle,
  bridgeDepositAddress,
  bridgeAmountIn,
  bridgeAmountOut,
  bridgeExchangeId,
  bridgeDepositTxId,
  bridgeStatus,
  bridgePayoutTxId,
}: TransactionSuccessScreenProps): React.ReactElement {
  const { t } = useTranslation();
  const isBridge = !!bridgeDepositAddress;

  const handleExplorerClick = () => {
    if (explorerUrl) {
      window.open(explorerUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (settling) {
    return (
      <Container>
        <LoadingScreen visible title={pendingTitle ?? title} subtitle={summary} />
      </Container>
    );
  }

  return (
    <Container>
      <Circle>
        <Checkmark>✓</Checkmark>
      </Circle>
      <Title>{title}</Title>
      <Summary>{summary}</Summary>
      {isBridge ? (
        <BridgeInfoBox>
          <BridgeLabel>{t('bridge.depositAddress', 'Send funds to')}</BridgeLabel>
          <BridgeValue>{bridgeDepositAddress}</BridgeValue>
          {bridgeAmountIn && (
            <>
              <BridgeLabel>{t('bridge.amountToSend', 'Amount to send')}</BridgeLabel>
              <BridgeValue>{bridgeAmountIn}</BridgeValue>
            </>
          )}
          {bridgeAmountOut && (
            <>
              <BridgeLabel>{t('bridge.estimatedReceive', 'You will receive approximately')}</BridgeLabel>
              <BridgeValue>{bridgeAmountOut}</BridgeValue>
            </>
          )}
          {bridgeDepositTxId && (
            <>
              <BridgeLabel>{t('bridge.depositTxId', 'Deposit Transaction')}</BridgeLabel>
              <BridgeValue>
                <ExplorerLink
                  href={`https://solscan.io/tx/${bridgeDepositTxId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginBottom: 0, animation: 'none', opacity: 1 }}
                >
                  {bridgeDepositTxId.slice(0, 8)}...{bridgeDepositTxId.slice(-8)}
                </ExplorerLink>
              </BridgeValue>
            </>
          )}
          {bridgeStatus && (
            <>
              <BridgeLabel>{t('bridge.currentStatus', 'Current status')}</BridgeLabel>
              <BridgeValue>{bridgeStatus}</BridgeValue>
            </>
          )}
          {bridgePayoutTxId && (
            <>
              <BridgeLabel>{t('bridge.payoutTxId', 'Payout Transaction')}</BridgeLabel>
              <BridgeValue>{bridgePayoutTxId}</BridgeValue>
            </>
          )}
          {bridgeExchangeId && (
            <>
              <BridgeLabel>{t('bridge.exchangeId', 'Exchange ID')}</BridgeLabel>
              <BridgeValue style={{ marginBottom: 0 }}>{bridgeExchangeId}</BridgeValue>
            </>
          )}
        </BridgeInfoBox>
      ) : explorerUrl ? (
        <ExplorerLink onClick={handleExplorerClick} underline="always" data-testid="tx-success-explorer-link">
          {t('transaction.viewOnExplorer')}
        </ExplorerLink>
      ) : null}
      <ContinueButton onClick={onContinue} data-testid="tx-success-continue-button">
        {t('transaction.continue')}
      </ContinueButton>
    </Container>
  );
}
