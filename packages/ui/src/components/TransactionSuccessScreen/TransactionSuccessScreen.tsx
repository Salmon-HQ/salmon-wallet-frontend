import React, { useState } from 'react';
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
  reducedMotion,
  resolveOnboardingBands,
  resolveOnboardingGrid,
  tabularNums,
  useWaitGate,
  useWaitExit,
  FLOAT_IN_MS,
  FLOAT_ENTER_SCALE,
  SINK_FLOAT_STAGGER_MS,
  SINK_FLOAT_TRAVEL,
} from '@salmon/shared';
import { ArrowRightIcon, CheckIcon, iconSize } from '../../icons';
import { LoadingScreen } from '../LoadingScreen';
import { PrimaryButton, TextButton } from '../Button';
import type { TransactionSuccessScreenProps } from './types';

// An exchange receipt arrives in four beats — the marks, the arrow with its
// tick, the amounts, the rows — on the float half of the transition verb
// (DESIGN.md §The sink and the float — the transition verb). A receipt with a
// single token has no graphic to sequence and keeps arriving whole.

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
 * The receipt column: actions on the bottom edge, and the report centred in
 * whatever height is left above them. The extension's side panel is a full
 * viewport tall, so a report pinned under the top chrome left the whole middle
 * of the panel empty. The wait screen keeps `Container`'s own centring: a
 * loader with nothing under it is centred the same way.
 */
const Receipt = styled(Container)({
  justifyContent: 'flex-start',
  paddingTop: spacing['5xl'],
  // The bottom edge belongs to the action band, not to the column: the
  // container's own padding was a second, invented reservation under the
  // primary, so the button sat that much higher than the grid puts it.
  paddingBottom: 0,
});

/**
 * The ending's reserved heights, read from the onboarding grid rather than
 * restated here (DESIGN.md §The ending borrows the onboarding ending's bands).
 * The receipt offers no secondary action, so the band whose union is zero
 * collapses and the assist sits directly over the primary —
 * `resolveOnboardingBands`, the same rule both onboarding layouts read.
 */
const endingBands = resolveOnboardingBands(resolveOnboardingGrid('identity'), false);

/**
 * The centred report. Stretched so the hero can use the full width, and
 * `flex: 1` so it owns the corridor between the top padding and the actions —
 * the same composition the mobile receipt uses.
 */
const Cluster = styled(Box)({
  flex: 1,
  alignSelf: 'stretch',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
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
 * The hero's row, and the amount's *container*: `100cqw` below is this
 * element's inline size, which is the real budget the number has to fit into.
 * A viewport unit was not — in a side panel the column is the viewport, in the
 * web app it is capped at `webContainerMaxWidth` and centred, and `9vw`
 * answered neither.
 */
const AmountStage = styled(Box)({
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  marginBottom: spacing.lg,
  containerType: 'inline-size',
});

// ============================================================================
// The arrival — the float half of the verb, in four beats
// ============================================================================

/** Buoyancy running out: the rise lands on `settle`, and never overshoots. */
const riseTravel = keyframes`
  from { transform: translateY(${SINK_FLOAT_TRAVEL}px) scale(${FLOAT_ENTER_SCALE}); }
  to { transform: none; }
`;

/** Beer–Lambert: the light returns slowly at first and fast at the end. */
const riseLight = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/**
 * The arrow crossing the gap between the two marks — the same float, turned on
 * its side. It starts against the mark that left and comes to rest between the
 * two; the distance is the runner's own width, so nothing here is a number.
 */
const crossTravel = keyframes`
  from { transform: translateX(-50%); }
  to { transform: none; }
`;

/**
 * One beat of the arrival. The step is the band's place in the order a receipt
 * answers its questions — between what, what happened, how much, the fine
 * print — spent at the verb's own stagger. Travel on `settle`, light on the
 * accelerating `sink`: one event, two media, so two animations.
 *
 * Reduce motion is a parallel mapping, not a hole: no travel and no stagger,
 * and the whole receipt is simply there.
 */
const rising = (step: number, travel: string) => ({
  animation: [
    `${travel} ${FLOAT_IN_MS}ms ${motionEasing.settle.css} ${step * SINK_FLOAT_STAGGER_MS}ms both`,
    `${riseLight} ${FLOAT_IN_MS}ms ${motionEasing.sink.css} ${step * SINK_FLOAT_STAGGER_MS}ms both`,
  ].join(', '),
  [`@media ${reducedMotion.query}`]: { animation: 'none' },
});

const Rise = styled(Box)<{ $step: number }>(({ $step }) => rising($step, riseTravel));

/**
 * The graphic that replaced the status sentence: the mark of what left, an
 * arrow travelling to the mark of what arrived, and the tick over it. The
 * marks are the subject, so they are drawn at the icon ramp's top step rather
 * than at the punctuation size they had beside a line of text.
 */
const Graphic = styled(Box)({
  width: '100%',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing.sm,
  marginBottom: spacing.lg,
});

/** The gap the arrow crosses, and the column that carries the tick over it. */
const Track = styled(Box)({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: spacing.xs,
});

const TickRow = styled(Rise)({
  display: 'flex',
  justifyContent: 'center',
  color: semantic.status.success,
  lineHeight: lineHeight.none,
});

/**
 * Full-width, so the crossing's `-50%` is half the gap: the glyph starts over
 * the mark that left and settles in the middle.
 */
const ArrowRunner = styled(Box)<{ $step: number }>(({ $step }) => ({
  display: 'flex',
  justifyContent: 'center',
  color: colors.text.secondary,
  lineHeight: lineHeight.none,
  ...rising($step, crossTravel),
}));

/**
 * The amounts, under the marks they belong to: what was spent on the side the
 * arrow left, what arrived on the side it reached. Each cell is its own
 * container, so `100cqw` in `Amount` is the budget that half actually has.
 */
const AmountsRow = styled(Rise)({
  width: '100%',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'baseline',
  gap: spacing.sm,
  marginBottom: spacing.lg,
});

const AmountCell = styled(Box)({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  justifyContent: 'center',
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
  // sits under.
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
}));

/**
 * The token marks are the graphic's subject now, not punctuation beside a line
 * of text, so they are drawn at the icon ramp's largest illustrative step.
 */
const LOGO_SIZE = componentSizes.iconSize3XL;

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
    <LogoImg src={uri} alt="" data-testid="tx-success-token-logo" onError={() => setFailed(true)} />
  );
}

/**
 * The quiet receipt under the exchange: label left, value right, no card.
 * Secondary rank.
 */
const ReceiptRows = styled(Rise)({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
  marginBottom: spacing.xl,
  padding: `0 ${spacing.base}px`,
  boxSizing: 'border-box',
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
 * ending says what happened): the assist band directly over the action
 * band's primary, with the grid's `spacing.lg`
 * of air between them. The two endings are the same event at different
 * scales, so they are not two layouts. The auto margin separates the report
 * from the actions without inventing a spacer.
 */
const ActionGroup = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'stretch',
  marginTop: 'auto',
});

/**
 * The assist band, at the grid's reserved height whether or not a link is
 * rendered — the onboarding grid's Nothing Moves Under the Finger Rule applied
 * outside onboarding. A Bitcoin receipt and a Solana receipt put their primary
 * at the same Y, so the button under the thumb never moves because of what the
 * chain happened to support.
 */
const AssistBand = styled(Box)({
  height: endingBands.assist,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

/**
 * The action band, exactly as the onboarding layouts draw it: the grid's air
 * over the primary and the grid's air under it, with the button on the bottom
 * edge of the column. Nothing is reserved below it, which is what pins its Y.
 */
const ActionBand = styled(Box)({
  height: endingBands.action,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  paddingTop: spacing.lg,
  paddingBottom: spacing['2xl'],
  boxSizing: 'border-box',
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

  // The receipt's clock: local time, captured once when the receipt mounts —
  // the moment the transaction came back — so re-renders never move it.
  const [receiptTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

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
    <Receipt data-testid="tx-success-screen">
      {/* The report, centred in the corridor between the top padding and the
          actions on the bottom edge. */}
      <Cluster>
        {exchange ? (
          /* The hero is the graphic. It answers *between what* — the mark of
           the token that left, the arrow that travelled to the token that
           arrived, and the tick over it, the same glyph the copy control
           draws when something has landed. It carries the result as its
           accessible name, because a graphic announces nothing on its own and
           the sentence it replaced is what a screen reader used to hear. */
          <Graphic role="img" aria-label={title} data-testid="tx-success-hero">
            <Rise $step={0}>
              <TokenLogo uri={exchange.send.logo} symbol={exchange.send.symbol} />
            </Rise>
            <Track>
              <TickRow $step={1} data-testid="tx-success-tick">
                <CheckIcon weight="bold" size={iconSize.lg} />
              </TickRow>
              <ArrowRunner $step={1} data-testid="tx-success-arrow">
                <ArrowRightIcon weight="bold" size={iconSize.lg} />
              </ArrowRunner>
            </Track>
            <Rise $step={0}>
              <TokenLogo uri={exchange.receive.logo} symbol={exchange.receive.symbol} />
            </Rise>
          </Graphic>
        ) : (
          <StatusRow data-testid="tx-success-status">
            <StatusGlyph aria-hidden>✓</StatusGlyph>
            <StatusLabel>{title}</StatusLabel>
          </StatusRow>
        )}
        {exchange ? (
          /* How much, under what it happened between: the spent side on the
           side the arrow left, the received side a rank louder where it
           landed. */
          <AmountsRow $step={2} data-testid="tx-success-amount">
            <AmountCell
              style={{ '--tx-amount-chars': exchange.send.amount.length } as React.CSSProperties}
            >
              <Amount $spent>{exchange.send.amount}</Amount>
            </AmountCell>
            <AmountCell
              style={{ '--tx-amount-chars': exchange.receive.amount.length } as React.CSSProperties}
            >
              <Amount>{exchange.receive.amount}</Amount>
            </AmountCell>
          </AmountsRow>
        ) : (
          <AmountStage>
            <Amount
              data-testid="tx-success-amount"
              style={
                {
                  // The only thing CSS cannot know about the string: how long it is.
                  '--tx-amount-chars': Math.max(1, summary.length),
                } as React.CSSProperties
              }
            >
              {summary}
            </Amount>
          </AmountStage>
        )}
        {/* The fine print, last: quiet rows for what the flow already knows —
          effective rate, Salmon fee when it arrived, local time. */}
        {exchange ? (
          <ReceiptRows $step={3} data-testid="tx-success-receipt">
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
      </Cluster>
      {/* The ending composes like the onboarding ending: a quiet text-button
          assist band over the bottom-most full-width primary. The wallet's own
          action still outranks a link that leaves it for a block explorer, and
          what says so is the position. The band keeps its reserved height with
          no link in it, so the primary lands at one Y on every ending. */}
      <ActionGroup>
        <AssistBand data-testid="tx-success-assist">
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
        <ActionBand data-testid="tx-success-action">
          <PrimaryButton onClick={onContinue} testID="tx-success-continue-button">
            {t('transaction.continue')}
          </PrimaryButton>
        </ActionBand>
      </ActionGroup>
    </Receipt>
  );
}
