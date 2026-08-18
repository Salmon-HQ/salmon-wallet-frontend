import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { keyframes } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import {
  colors,
  semantic,
  spacing,
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  componentSizes,
  duration,
  easing,
  tabularNums,
  useWaitGate,
  useWaitExit,
} from '@salmon/shared';
import { LoadingScreen } from '../LoadingScreen';
import { PrimaryButton } from '../Button';
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
 * The receipt reads from the top, not from the middle. A slip that floats in
 * the centre of a tall column has no reading order — the eye lands between the
 * lines instead of on the first one — so the report sits at the top and the
 * actions are pushed to the bottom edge by `ActionGroup`'s auto margin. The
 * wait screen keeps `Container`'s centring: a loader with nothing under it is
 * the one case where the middle is right.
 */
const Receipt = styled(Container)({
  justifyContent: 'flex-start',
  paddingTop: spacing['5xl'],
});

/**
 * Status line — the headline of the screen.
 *
 * The ranking is deliberate: this screen's job is to report *what happened*,
 * so the sentence that says it outranks the figures it happened to. `1.05
 * USDC` is not display copy, and the previous arrangement — a 14px secondary
 * status over a 36px amount — inverted the two and left them competing at the
 * same time. `status.success` stays ink, not a fill, and the state keeps all
 * three channels (colour on the glyph, the glyph itself, the label).
 */
const StatusRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  marginBottom: spacing.md,
  opacity: 0,
  animation: `${fadeIn} ${duration.slow} ${easing.easeOut} forwards`,
});

const StatusGlyph = styled(Typography)({
  fontSize: fontSize.headline,
  color: semantic.status.success,
  fontWeight: fontWeight.bold,
  lineHeight: lineHeight.none,
});

const StatusLabel = styled(Typography)({
  fontSize: fontSize.headline,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.semibold,
  letterSpacing: letterSpacing.snug,
  color: colors.text.primary,
  textAlign: 'center',
});

/**
 * The stage The Surfacing will play on (DESIGN.md, specified/not built). It is
 * a positioned, full-width band so the caustic light shape can be mounted
 * behind the amount and travel up to it without reflowing anything, and the
 * amount is already tabular so its digits will not shift when it settles.
 * Nothing here animates beyond the existing fade — the motion work is in flight
 * elsewhere.
 *
 * It is also the amount's *container*: `100cqw` below is this element's inline
 * size, which is the real budget the number has to fit into. A viewport unit
 * was not — in a side panel the column is the viewport, in the web app it is
 * capped at `webContainerMaxWidth` and centred, and `9vw` answered neither.
 */
const AmountStage = styled(Box)({
  position: 'relative',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  marginBottom: spacing.lg,
  containerType: 'inline-size',
});

/**
 * Widest advance per character the summary can present, in em, measured off
 * DM Sans SemiBold with `tabular-nums` applied (all digits at one advance) across
 * the shapes this string actually takes — `0.014 SOL → 1.056672 USDC` is
 * 0.544em/char, a long BONK pair is 0.568em/char. 0.62 carries ~9% headroom
 * for the fallback face, so the budget below is a lower bound on what fits
 * rather than a hopeful average.
 */
const AMOUNT_CHAR_EM = 0.62;

const Amount = styled(Typography)({
  fontFamily: fontFamily.sans,
  // Secondary rank: one step down from the headline in size and one in weight.
  // It keeps `text.primary` — a number on a receipt may be smaller than the
  // sentence above it, but it may never be dimmer than it is legible.
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
  textAlign: 'center',
  lineHeight: lineHeight.tight,
  ...tabularNums.css,
  // One line, always. The receipt used to print the whole operation as one
  // 36px title ("0.0512345 SOL → 8.1234567 USDC") in a ~360px column, and it
  // broke over three lines: an amount that wraps stops being an amount and
  // becomes a sentence. It shrinks to fit rather than wrapping or ellipsing —
  // truncating a number on a wallet receipt is not an option.
  //
  // `clamp(9vw)` did not shrink to fit, which is why it was still being cut:
  // it is a function of the viewport and knows nothing about how long the
  // string is, so a 25-character pair at 32px asked for ~445px inside a 320px
  // column. The budget below is a function of both — the container's own
  // inline size divided by what this many characters costs — capped at the
  // secondary rank and floored at body size, the same 0.7 floor the mobile
  // screen gives `adjustsFontSizeToFit`.
  whiteSpace: 'nowrap',
  maxWidth: '100%',
  fontSize: `clamp(${fontSize.body}px, calc(100cqw / (var(--tx-amount-chars, 24) * ${AMOUNT_CHAR_EM})), ${fontSize.title}px)`,
  opacity: 0,
  animation: `${fadeIn} ${duration.slow} ${easing.easeOut} ${duration.stagger1} forwards`,
});

/**
 * Continue and explorer, pinned to the bottom of the column. The auto margin
 * is what separates the report from the actions without inventing a spacer.
 */
const ActionGroup = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: spacing.lg,
  marginTop: 'auto',
  paddingTop: spacing.xl,
});

const ExplorerLink = styled(Link)({
  fontSize: fontSize.body,
  fontFamily: fontFamily.sans,
  color: colors.accent.primary,
  textAlign: 'center',
  cursor: 'pointer',
  opacity: 0,
  animation: `${fadeIn} ${duration.slow} ${easing.easeOut} ${duration.stagger3} forwards`,
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

/**
 * The receipt's continue action is the same primary control every other screen
 * commits with — it used to be a hand-rolled MUI button carrying a gradient, a
 * salmon outline and a 12px radius, which made the one button on this screen
 * the only button in the app without the flesh in it. Only the entrance
 * animation is local; fill, radius, bezel and material come from the button.
 */
const ContinueButtonWrapper = styled('div')({
  opacity: 0,
  animation: `${fadeIn} ${duration.slow} ${easing.easeOut} ${duration.stagger2} forwards`,
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
  // And the wait is not merely unmounted when it ends: this branch swaps the
  // instant `settling` flips, so the closing wave used to play nowhere on the
  // one screen it matters most. `held` keeps the wait rendered — with
  // `visible={false}`, which is what starts its exit — until the last front has
  // left the screen and it reports back.
  const { held: waveHeld, onExited: onWaveGone } = useWaitExit(showWait);

  if (waveHeld) {
    return (
      <Container>
        <LoadingScreen
          visible={showWait}
          waves
          title={pendingTitle ?? title}
          subtitle={summary}
          onExited={onWaveGone}
        />
      </Container>
    );
  }

  return (
    <Receipt>
      <StatusRow data-testid="tx-success-status">
        <StatusGlyph aria-hidden>✓</StatusGlyph>
        <StatusLabel>{title}</StatusLabel>
      </StatusRow>
      <AmountStage>
        <Amount
          data-testid="tx-success-amount"
          // The only thing CSS cannot know about the string: how long it is.
          style={{ '--tx-amount-chars': Math.max(1, summary.length) } as React.CSSProperties}
        >
          {summary}
        </Amount>
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
                  style={{ animation: 'none', opacity: 1 }}
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
      ) : null}
      {/* Continue first, explorer second. The receipt's own action outranks a
          link that leaves the wallet for a block explorer, and reading order
          has to match that ranking. */}
      <ActionGroup>
        <ContinueButtonWrapper>
          <PrimaryButton
            onClick={onContinue}
            fullWidth={false}
            testID="tx-success-continue-button"
            style={{
              minWidth: componentSizes.buttonMinWidthLg,
              height: componentSizes.buttonHeightCompact,
            }}
          >
            {t('transaction.continue')}
          </PrimaryButton>
        </ContinueButtonWrapper>
        {!isBridge && explorerUrl ? (
          <ExplorerLink
            onClick={handleExplorerClick}
            underline="always"
            data-testid="tx-success-explorer-link"
          >
            {t('transaction.viewOnExplorer')}
          </ExplorerLink>
        ) : null}
      </ActionGroup>
    </Receipt>
  );
}
