import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import { keyframes } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import {
  colors,
  gradients,
  spacing,
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  componentSizes,
  borderWidth,
  duration,
  easing,
  tabularNums,
  useWaitGate,
} from '@salmon/shared';
import { LoadingScreen } from '../LoadingScreen';
import type { TransactionSuccessScreenProps } from './types';

// ============================================================================
// Keyframes
// ============================================================================

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

/**
 * Status line. `status.success` is ink, not a fill — a checkmark glyph and a
 * label, sized to report rather than to celebrate. The 96px saturated disc it
 * replaces outweighed the amount by 6x on the one screen whose whole job is to
 * report a number.
 */
const StatusRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.xs,
  marginBottom: spacing.sm,
  opacity: 0,
  animation: `${fadeIn} ${duration.slow} ${easing.easeOut} forwards`,
});

const StatusGlyph = styled(Typography)({
  fontSize: fontSize.base,
  color: colors.status.success,
  fontWeight: fontWeight.bold,
  lineHeight: lineHeight.none,
});

const StatusLabel = styled(Typography)({
  fontSize: fontSize.base,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
  textAlign: 'center',
});

/**
 * The stage The Surfacing will play on (DESIGN.md, specified/not built). It is
 * a positioned, full-width band so the caustic light shape can be mounted
 * behind the amount and travel up to it without reflowing anything, and the
 * amount is already tabular so its digits will not shift when it settles.
 * Nothing here animates beyond the existing fade — the motion work is in flight
 * elsewhere.
 */
const AmountStage = styled(Box)({
  position: 'relative',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  marginBottom: spacing.lg,
});

const Amount = styled(Typography)({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  textAlign: 'center',
  lineHeight: lineHeight.tight,
  ...tabularNums.css,
  // One line, always. The receipt used to print the whole operation as one
  // 36px title ("0.0512345 SOL → 8.1234567 USDC") in a ~360px column, and it
  // broke over three lines: an amount that wraps stops being an amount and
  // becomes a sentence. It shrinks to fit rather than wrapping or ellipsing —
  // truncating a number on a wallet receipt is not an option.
  whiteSpace: 'nowrap',
  maxWidth: '100%',
  fontSize: `clamp(${fontSize.lg}px, 9vw, ${fontSize.display}px)`,
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
  ...tabularNums.css,
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
  // The only legal ink on a salmon fill: white is 3.06:1.
  color: colors.button.primaryText,
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

  // The wait is gated, not merely rendered: below `motionMs.waitDelay` the
  // screen never mounts and the user goes from the decision straight to the
  // receipt, and once mounted it holds for `motionMs.waitMinVisible` so a wait
  // that resolves just over the threshold does not flash. The gate delays a
  // *screen*, never the work.
  const showWait = useWaitGate(settling);

  if (showWait) {
    return (
      <Container>
        <LoadingScreen visible waves title={pendingTitle ?? title} subtitle={summary} />
      </Container>
    );
  }

  return (
    <Container>
      <StatusRow data-testid="tx-success-status">
        <StatusGlyph aria-hidden>✓</StatusGlyph>
        <StatusLabel>{title}</StatusLabel>
      </StatusRow>
      <AmountStage>
        <Amount data-testid="tx-success-amount">{summary}</Amount>
      </AmountStage>
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
              <BridgeLabel>
                {t('bridge.estimatedReceive', 'You will receive approximately')}
              </BridgeLabel>
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
        <ExplorerLink
          onClick={handleExplorerClick}
          underline="always"
          data-testid="tx-success-explorer-link"
        >
          {t('transaction.viewOnExplorer')}
        </ExplorerLink>
      ) : null}
      <ContinueButton onClick={onContinue} data-testid="tx-success-continue-button">
        {t('transaction.continue')}
      </ContinueButton>
    </Container>
  );
}
