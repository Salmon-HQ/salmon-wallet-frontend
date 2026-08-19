import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { PrimaryButton, TextButton } from '../Button';
import { useReducedMotion } from '../../utils/useReducedMotion';
import { CausticBand, SurfacingMembrane } from './SurfacingLayers';
import { AMOUNT_RISE, BAND_HEIGHT, amountLandsAtMs, surfacingTimeline } from './surfacing';
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

/**
 * The hero's travel, and only its travel. Its light runs on a different clock:
 * DESIGN.md §The Surfacing has the band *carry* its content rather than
 * precede it, so the opacity spans the whole corridor while the last few px of
 * travel play behind the light — the settle the register specifies. The
 * distance is a custom property so reduced motion, whose timeline sets the
 * rise to 0, gets no translation at all instead of a suppressed one.
 */
const amountRise = keyframes`
  from { transform: translateY(var(--tx-amount-rise, ${AMOUNT_RISE}px)); }
  to { transform: translateY(0); }
`;

/**
 * What every hero — the plain summary line and the two-mark exchange line
 * alike — plays. Two animations on one element: the light on the corridor's
 * clock, the travel on the settle's. Durations and delays are the timeline's
 * and are applied inline, as a matching pair of comma-separated lists.
 */
const heroSurfacing = {
  opacity: 0,
  animation: `${chromeFade} 0ms ${motionEasing.current.css} forwards, ${amountRise} 0ms ${motionEasing.settle.css} forwards`,
} as const;

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

/**
 * What the exchange line's furniture — two marks, the arrow, the four gaps
 * between them — costs in the same units the character budget is measured in.
 */
const EXCHANGE_FURNITURE_CHARS = 7;

const Amount = styled(Typography)<{ $spent?: boolean }>(({ $spent }) => ({
  fontFamily: fontFamily.sans,
  // Secondary rank: one step down from the headline in size and one in weight.
  // It keeps `text.primary` — a number on a receipt may be smaller than the
  // sentence above it, but it may never be dimmer than it is legible.
  //
  // A receipt's subject is the amount that arrived, so on an exchange line the
  // received side must read louder — the ranking DESIGN.md §The ending says
  // what happened asks for. The rank is bought by stepping the *spent* side
  // down rather than the received side up, in size, weight and ink at once.
  // Raising the received side would put it at the rank of the status line it
  // sits under, and the hero is inside the node The Surfacing measures, so
  // growing it would move where the caustic band lands.
  fontWeight: $spent ? fontWeight.regular : fontWeight.medium,
  color: $spent ? colors.text.secondary : colors.text.primary,
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
  fontSize: `clamp(${fontSize.body}px, calc(100cqw / (var(--tx-amount-chars, 24) * ${AMOUNT_CHAR_EM})), ${
    $spent ? fontSize.bodyLg : fontSize.title
  }px)`,
  // Inside the exchange line the amount shares the row with two marks and an
  // arrow; it may shrink to its budget but it may never be elided.
  minWidth: 0,
  ...heroSurfacing,
}));

/**
 * The exchange hero: mark, sent amount, arrow, mark, received amount, on one
 * line and unboxed. Boxing it put a content surface between The Surfacing and
 * the thing it surfaces (DESIGN.md §The ending says what happened) — the
 * one-line summary *is* the hero the light lands on. It is also the node the
 * caustic band measures, so it keeps one measurable centre and never wraps.
 */
const ExchangeLine = styled('div')({
  width: '100%',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing.sm,
  minWidth: 0,
  ...heroSurfacing,
});

/**
 * The arrow is not the subject: one rank down from the amounts and in
 * secondary ink, so the two figures stay the loudest things on the line. It is
 * data, not copy — the direction between two amounts, the same glyph the plain
 * summary string already prints.
 */
const ExchangeArrow = styled('span')({
  fontFamily: fontFamily.sans,
  fontSize: fontSize.body,
  color: colors.text.secondary,
  lineHeight: lineHeight.none,
  flexShrink: 0,
});

/**
 * The token marks on the hero line. Small enough to sit inside a line of text
 * as punctuation — the mark here is beside a number rather than being the
 * row's own subject.
 */
const LOGO_SIZE = 20;

const LogoImg = styled('img')({
  width: LOGO_SIZE,
  height: LOGO_SIZE,
  borderRadius: borderRadius.full,
  backgroundColor: colors.background.tertiary,
  objectFit: 'cover',
  flexShrink: 0,
});

const LogoFallback = styled('div')({
  width: LOGO_SIZE,
  height: LOGO_SIZE,
  borderRadius: borderRadius.full,
  backgroundColor: colors.background.tertiary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  flexShrink: 0,
  overflow: 'hidden',
});

/**
 * Token mark with a symbol-initials fallback, local to this receipt. There is
 * no shared DOM mark to reuse yet and four private copies already exist;
 * consolidating them is a decision of its own, not a side effect of this one.
 */
function TokenLogo({ uri, symbol }: { uri?: string; symbol: string }): React.ReactElement {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <LogoFallback data-testid="tx-success-token-logo">
        {symbol ? symbol.slice(0, 3).toUpperCase() : '?'}
      </LogoFallback>
    );
  }

  return (
    <LogoImg
      src={uri}
      alt=""
      data-testid="tx-success-token-logo"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * The quiet receipt under the exchange: label left, value right, no card.
 * Secondary rank — it rides the chrome wave, after the moment.
 */
const ReceiptRows = styled(Box)({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
  marginBottom: spacing.xl,
  padding: `0 ${spacing.base}px`,
  boxSizing: 'border-box',
  opacity: 0,
  animation: `${chromeFade} 0ms ${motionEasing.current.css} forwards`,
});

const ReceiptRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: spacing.md,
});

const ReceiptLabel = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  color: colors.text.tertiary,
});

const ReceiptValue = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
  textAlign: 'right',
});

/**
 * The bottom of the column, on the onboarding ending's bands (DESIGN.md §The
 * Surfacing, "The ending borrows the onboarding ending's bands"): the assist
 * band directly over the action band's primary, with the grid's `spacing.lg`
 * of air between them. The two endings are the same event at different
 * scales, so they are not two layouts. The auto margin separates the report
 * from the actions without inventing a spacer.
 */
const ActionGroup = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'stretch',
  gap: spacing.lg,
  marginTop: 'auto',
  paddingTop: spacing.xl,
});

/**
 * The assist band, reserved at the assist control's own height whether or not
 * a link is rendered — the onboarding grid's Nothing Moves Under the Finger
 * Rule applied outside onboarding. A Bitcoin receipt and a Solana receipt put
 * their primary at the same Y, so the button under the thumb never moves
 * because of what the chain happened to support.
 */
const AssistBand = styled(Box)({
  height: componentSizes.buttonHeightSmall,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0,
  // The trailing chrome wave. Delay and duration are the timeline's, inline.
  animation: `${chromeFade} 0ms ${motionEasing.current.css} forwards`,
});

/**
 * The transaction ids inside the bridge's deposit instructions, each a link
 * out to a block explorer. It is body copy that happens to be clickable, not
 * a control, so it stays a link rather than borrowing the assist band's
 * button.
 */
const BridgeTxLink = styled(Link)({
  fontSize: fontSize.body,
  fontFamily: fontFamily.sans,
  color: colors.accent.primary,
  textAlign: 'center',
  cursor: 'pointer',
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
  exchange,
  exchangeRate,
  exchangeFee,
}: TransactionSuccessScreenProps): React.ReactElement {
  const { t } = useTranslation();
  const isBridge = !!bridgeDepositAddress;

  // The exchange line's budget. The two marks, the arrow and the four gaps are
  // not characters, but they eat the same inline space — together about seven
  // characters at the hero's cap — so they are counted as such. The clamp this
  // feeds is a lower bound on what fits, not an average.
  const exchangeChars = exchange
    ? exchange.send.amount.length + exchange.receive.amount.length + EXCHANGE_FURNITURE_CHARS
    : 0;

  // The receipt's clock: local time, captured once when the receipt mounts —
  // the moment the transaction came back — so re-renders never move it.
  const [receiptTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

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

  // The hero's two clocks, as one matching pair of lists: the light spans the
  // whole corridor and is fully there exactly when the amount lands
  // (`amountLandsAtMs`); the travel keeps the timeline's own delay and
  // duration, so the last few px still settle behind the band.
  const heroTiming = {
    '--tx-amount-rise': `${timeline.amount.rise}px`,
    animationDuration: `${amountLandsAtMs(timeline)}ms, ${timeline.amount.durationMs}ms`,
    animationDelay: `0ms, ${timeline.amount.delayMs}ms`,
  } as React.CSSProperties;

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
        {exchange ? (
          /* The exchange as the protagonist, unboxed: mark, sent amount,
             arrow, mark, received amount. The marks are already on the
             exchange the flow hands over, so they cost no fetch and no new
             prop, and each one leading its amount is what makes the line read
             as *this token to that token* rather than as two strings with an
             arrow between them. Same measured node as the plain summary — the
             band's stop follows this layout. */
          <ExchangeLine
            ref={amountRef as React.Ref<HTMLDivElement>}
            data-testid="tx-success-amount"
            style={{ ...heroTiming, '--tx-amount-chars': exchangeChars } as React.CSSProperties}
          >
            <TokenLogo uri={exchange.send.logo} symbol={exchange.send.symbol} />
            <Amount $spent>{exchange.send.amount}</Amount>
            <ExchangeArrow aria-hidden>→</ExchangeArrow>
            <TokenLogo uri={exchange.receive.logo} symbol={exchange.receive.symbol} />
            <Amount>{exchange.receive.amount}</Amount>
          </ExchangeLine>
        ) : (
          <Amount
            ref={amountRef}
            data-testid="tx-success-amount"
            style={
              {
                ...heroTiming,
                // The only thing CSS cannot know about the string: how long it is.
                '--tx-amount-chars': Math.max(1, summary.length),
              } as React.CSSProperties
            }
          >
            {summary}
          </Amount>
        )}
      </AmountStage>
      {/* The receipt under the exchange: quiet rows for what the flow already
          knows — effective rate, Salmon fee when it arrived, local time. */}
      {exchange ? (
        <ReceiptRows data-testid="tx-success-receipt" style={chromeTiming}>
          {exchangeRate ? (
            <ReceiptRow>
              <ReceiptLabel>{t('transactions.detail.rate', 'Rate')}</ReceiptLabel>
              <ReceiptValue>{exchangeRate}</ReceiptValue>
            </ReceiptRow>
          ) : null}
          {exchangeFee ? (
            <ReceiptRow>
              <ReceiptLabel>{t('swap.review.salmonFee', 'Salmon fee')}</ReceiptLabel>
              <ReceiptValue>{exchangeFee}</ReceiptValue>
            </ReceiptRow>
          ) : null}
          <ReceiptRow>
            <ReceiptLabel>{t('transactions.detail.time', 'Time')}</ReceiptLabel>
            <ReceiptValue>{receiptTime}</ReceiptValue>
          </ReceiptRow>
        </ReceiptRows>
      ) : null}
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
                <BridgeTxLink
                  href={`https://solscan.io/tx/${bridgeDepositTxId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {bridgeDepositTxId.slice(0, 8)}...{bridgeDepositTxId.slice(-8)}
                </BridgeTxLink>
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
      {/* The ending composes like the onboarding ending: a quiet text-button
          assist band over the bottom-most full-width primary. The wallet's own
          action still outranks a link that leaves it for a block explorer, and
          what says so is the *wave order*, not the position — the primary
          rides the first chrome wave, the assist the trailing one. The band
          keeps its reserved height with no link in it, so the primary lands at
          one Y on every ending. */}
      <ActionGroup>
        <AssistBand
          data-testid="tx-success-assist"
          style={{
            animationDuration: `${timeline.chrome.durationMs}ms`,
            animationDelay: `${timeline.chrome.delayMs + timeline.chrome.staggerMs}ms`,
          }}
        >
          {!isBridge && explorerUrl ? (
            <TextButton
              onClick={handleExplorerClick}
              color={semantic.text.secondary}
              testID="tx-success-explorer-link"
            >
              {t('transaction.viewOnExplorer')}
            </TextButton>
          ) : null}
        </AssistBand>
        <ContinueButtonWrapper style={chromeTiming}>
          <PrimaryButton onClick={onContinue} testID="tx-success-continue-button">
            {t('transaction.continue')}
          </PrimaryButton>
        </ContinueButtonWrapper>
      </ActionGroup>
      {/* The shaft of light, last so it passes over the amount rather than
          under it. It takes no clicks and it never repeats. */}
      <CausticBand ref={bandRef} mode={timeline.band.mode} />
    </Receipt>
  );
}
