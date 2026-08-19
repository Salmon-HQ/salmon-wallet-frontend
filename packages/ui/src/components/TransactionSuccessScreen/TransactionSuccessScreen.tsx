import React, { useLayoutEffect, useMemo, useRef } from 'react';
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
  motionEasing,
  tabularNums,
  useWaitGate,
  useWaitExit,
} from '@salmon/shared';
import { LoadingScreen } from '../LoadingScreen';
import { PrimaryButton } from '../Button';
import { useReducedMotion } from '../../utils/useReducedMotion';
import { CausticBand, SurfacingMembrane } from './SurfacingLayers';
import { AMOUNT_RISE, BAND_HEIGHT, surfacingTimeline } from './surfacing';
import type { TransactionSuccessScreenProps } from './types';

// ============================================================================
// Keyframes
// ============================================================================
//
// The Surfacing's choreography (DESIGN.md §The Surfacing): chrome is a fade,
// not a rise — the one thing allowed to travel on this screen is the caustic
// band, and the amount settling behind it. Durations and delays come from
// `surfacingTimeline` and are applied inline, so the keyframes carry only the
// shape of each move.

const chromeFade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const amountSettle = keyframes`
  from { opacity: 0; transform: translateY(${AMOUNT_RISE}px); }
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
  // The Surfacing's stage. The membrane and the caustic band are positioned
  // against this element; the band blends in `screen`, so without a stacking
  // context here it would blend against whatever is behind the whole screen,
  // and it travels in from below the bottom edge, so the overflow is clipped.
  position: 'relative',
  isolation: 'isolate',
  overflow: 'hidden',
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
  // Duration comes from the timeline, inline. No delay: the status arrives
  // with the membrane, the way the mobile screen plays it.
  animation: `${chromeFade} 0ms ${motionEasing.current.css} forwards`,
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

const Amount = styled(Typography)<{ $rise: boolean }>(({ $rise }) => ({
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
  // The hero settles behind the band: translateY +6 → 0 on `settle`, digits
  // already at tabular width so nothing reflows. Under reduced motion the
  // timeline sets `rise` to 0 and the amount is simply there. Duration and
  // delay are the timeline's, inline.
  animation: `${$rise ? amountSettle : chromeFade} 0ms ${motionEasing.settle.css} forwards`,
}));

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
  // The second chrome wave — the link that leaves the wallet arrives after
  // the continue action. Delay and duration are the timeline's, inline.
  animation: `${chromeFade} 0ms ${motionEasing.current.css} forwards`,
});

const BridgeInfoBox = styled(Box)({
  width: '100%',
  backgroundColor: colors.background.tertiary,
  borderRadius: borderRadius.card,
  padding: spacing.lg,
  marginBottom: spacing.xl,
  opacity: 0,
  animation: `${chromeFade} 0ms ${motionEasing.current.css} forwards`,
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
  animation: `${chromeFade} 0ms ${motionEasing.current.css} forwards`,
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

  // The Surfacing (DESIGN.md §The Surfacing). Reduced motion is a parallel
  // mapping rather than a switch, and the plan for both paths is
  // `surfacingTimeline` — a pure function, so the timing is testable without
  // a frame clock. Same tokens, same phases as the mobile screen.
  const isReduceMotionEnabled = useReducedMotion();
  const timeline = useMemo(
    () => surfacingTimeline(isReduceMotionEnabled),
    [isReduceMotionEnabled]
  );

  const receiptRef = useRef<HTMLDivElement | null>(null);
  const amountRef = useRef<HTMLElement | null>(null);
  const bandRef = useRef<HTMLDivElement | null>(null);
  // The moment never repeats — not on a reduce-motion toggle, not on a
  // re-render.
  const playedRef = useRef(false);

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

  // The caustic band, driven with WAAPI because where it stops is a function
  // of layout: it rises from below the bottom edge to rest centred on the
  // amount, whose position moves with the summary's line length. CSS carries
  // every phase that has no layout dependency; the script carries the one
  // that does. Keyed on the wait *screen*, not on `settling` — the gate can
  // hold the wait a moment past the settle, and The Surfacing must not play
  // behind it.
  useLayoutEffect(() => {
    if (waveHeld || playedRef.current) return;
    const receipt = receiptRef.current;
    const amount = amountRef.current;
    const band = bandRef.current;
    if (!receipt || !amount || !band) return;
    // No WAAPI (jsdom) — the band stays parked at opacity 0; the moment is
    // choreography, never content.
    if (typeof band.animate !== 'function') return;
    const receiptRect = receipt.getBoundingClientRect();
    const amountRect = amount.getBoundingClientRect();
    // Held back until the corridor has been measured — a band that travels to
    // the wrong place is worse than one frame of nothing.
    if (receiptRect.height <= 0 || amountRect.height <= 0) return;
    playedRef.current = true;

    const amountCenterY = amountRect.top - receiptRect.top + amountRect.height / 2;
    const restingY = amountCenterY - BAND_HEIGHT / 2;

    if (timeline.band.mode === 'travel') {
      band.animate(
        [
          { transform: `translateY(${receiptRect.height}px)` },
          { transform: `translateY(${restingY}px)` },
        ],
        { duration: timeline.band.durationMs, easing: motionEasing.current.css, fill: 'both' }
      );
    } else {
      // Reduced motion: drawn once across the amount, held, then faded. It
      // does not travel, and it never repeats.
      band.style.transform = `translateY(${restingY}px)`;
    }
    // Full strength while it travels (or holds), then it dissipates in
    // whatever `tide` has left — `fill: 'both'` holds opacity 1 through the
    // delay and 0 after.
    band.animate([{ opacity: 1 }, { opacity: 0 }], {
      delay: timeline.band.durationMs,
      duration: timeline.band.fadeMs,
      easing: motionEasing.sink.css,
      fill: 'both',
    });
  }, [waveHeld, timeline]);

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

  const chromeTiming: React.CSSProperties = {
    animationDuration: `${timeline.chrome.durationMs}ms`,
    animationDelay: `${timeline.chrome.delayMs}ms`,
  };

  return (
    <Receipt ref={receiptRef}>
      {/* The membrane this moment clears. Behind everything, and behind the
          content it is thinning out over. */}
      <SurfacingMembrane durationMs={timeline.membrane.durationMs} />
      <StatusRow
        data-testid="tx-success-status"
        style={{ animationDuration: `${timeline.chrome.durationMs}ms` }}
      >
        <StatusGlyph aria-hidden>✓</StatusGlyph>
        <StatusLabel>{title}</StatusLabel>
      </StatusRow>
      <AmountStage>
        <Amount
          ref={amountRef}
          data-testid="tx-success-amount"
          $rise={timeline.amount.rise > 0}
          style={
            {
              // The only thing CSS cannot know about the string: how long it is.
              '--tx-amount-chars': Math.max(1, summary.length),
              animationDuration: `${timeline.amount.durationMs}ms`,
              animationDelay: `${timeline.amount.delayMs}ms`,
            } as React.CSSProperties
          }
        >
          {summary}
        </Amount>
      </AmountStage>
      {isBridge ? (
        <BridgeInfoBox style={chromeTiming}>
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
        <ContinueButtonWrapper style={chromeTiming}>
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
            style={{
              animationDuration: `${timeline.chrome.durationMs}ms`,
              animationDelay: `${timeline.chrome.delayMs + timeline.chrome.staggerMs}ms`,
            }}
          >
            {t('transaction.viewOnExplorer')}
          </ExplorerLink>
        ) : null}
      </ActionGroup>
      {/* The shaft of light, last so it passes over the amount rather than
          under it. It takes no clicks and it never repeats. */}
      <CausticBand ref={bandRef} mode={timeline.band.mode} />
    </Receipt>
  );
}
