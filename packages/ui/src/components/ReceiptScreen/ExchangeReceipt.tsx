/**
 * ExchangeReceipt — the graphic receipt, on the DOM: token-mark hero, arrow,
 * rate/fee block, the settling wait.
 *
 * The mobile twin is `apps/mobile/src/components/ReceiptScreen/ExchangeReceipt.tsx`;
 * the anatomy, tokens and staged reveal are the same, read from the same
 * `TransactionSuccessScreenProps` contract. DOM alternatives:
 * - mobile's `Animated.View entering={floatEntering(...)}` (Reanimated) is
 *   the shared kit's own `floatEntering` (`packages/ui/src/motion`), a Web
 *   Animations API call fired from a ref in a `useEffect` — one call per
 *   staged block, same `beat(step)` schedule.
 * - `adjustsFontSizeToFit`/`minimumFontScale` (RN `Text` auto-shrink) has no
 *   DOM text primitive; the amount instead shrinks with a CSS `clamp()` keyed
 *   off a `--amount-chars` custom property, exactly as the legacy MUI
 *   `TransactionSuccessScreen` in this package already solved it.
 * - `Linking.openURL` becomes `window.open(url, '_blank', 'noopener,noreferrer')`.
 * - `useTabChrome()` (floating tab bar offset, safe-area insets) has no DOM
 *   equivalent — the web app has neither, so the bottom edge is plain
 *   `env(safe-area-inset-bottom, 0px)` and the ending bands are unpadded.
 * - the success haptic (`expo-haptics`) has no DOM equivalent and is
 *   dropped — brief hard rule 4, "No haptics."
 * - there is no shared DOM token mark yet (`TokenLogo` is mobile-only, and
 *   the legacy MUI `TransactionSuccessScreen` keeps its own private copy for
 *   the same reason its own comment gives: consolidating four private copies
 *   is a decision of its own). This component keeps a small local mark for
 *   the same reason, built from tokens/hooks rather than MUI.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  resolveOnboardingBands,
  resolveOnboardingGrid,
  SINK_FLOAT_STAGGER_MS,
  spacing,
  tabularNums,
  useWaitExit,
  useWaitGate,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion, floatEntering } from '../../motion';
import { ArrowDownIcon, CheckIcon } from '../../icons';
import { PrimaryButton, TextButton } from '../Button';
import { LoadingScreen } from '../LoadingScreen';
import type { ExchangeReceiptScreenProps } from './types';

/** The token marks are the graphic's subject: the icon ramp's largest step. */
const LOGO_SIZE = componentSizes.iconSize3XL;
/** The tick and the arrow are chrome-sized glyphs, not illustrations. */
const GRAPHIC_ICON_SIZE = componentSizes.iconSizeMedium;

/**
 * Widest per-character advance the amount clamp budgets for, in em — the
 * same figure and the same `clamp()` strategy the legacy MUI
 * `TransactionSuccessScreen` in this package already solved DOM
 * auto-shrink with, in place of RN's `adjustsFontSizeToFit`. Each amount
 * sits in a `containerType: inline-size` box so `cqw` reads that box's
 * width, not the viewport's.
 */
const AMOUNT_CHAR_EM = 0.62;
const amountClamp = (floorPx: number, ceilPx: number) =>
  `clamp(${floorPx}px, calc(100cqw / (var(--amount-chars, 24) * ${AMOUNT_CHAR_EM})), ${ceilPx}px)`;

/**
 * The ending's reserved heights, read from the onboarding grid (DESIGN.md
 * §The ending borrows the onboarding ending's bands) — the same call mobile
 * makes. The receipt offers no secondary action, so the assist band's union
 * is zero and it collapses onto the primary.
 */
const endingBands = resolveOnboardingBands(resolveOnboardingGrid('identity'), false);

/** One stagger step per revealed element, top to bottom, on the verb's own constant. */
const beat = (step: number) => step * SINK_FLOAT_STAGGER_MS;

/**
 * One staged block: floats in on `floatEntering` at its own beat, a WAAPI
 * call fired from the ref rather than a declarative `entering` prop — the
 * DOM has no Reanimated. Reduced motion collapses to a cut (`floatEntering`
 * returns `undefined` and touches nothing).
 */
function Rise({
  step,
  style,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { step: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    floatEntering(ref.current, reducedMotion, { delayMs: beat(step) });
  }, [reducedMotion, step]);

  return (
    <div ref={ref} style={style} {...rest}>
      {children}
    </div>
  );
}

/**
 * Token mark with a symbol-initials fallback. No shared DOM mark exists yet
 * (see file header) — built from tokens/hooks, no MUI.
 */
function TokenMark({ uri, symbol }: { uri?: string; symbol: string }): React.ReactElement {
  const t = useSemantic();
  const [failed, setFailed] = useState(false);

  const shell: React.CSSProperties = {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: '50%',
    backgroundColor: t.surface.raised,
    flexShrink: 0,
  };

  if (!uri || failed) {
    return (
      <div
        style={{
          ...shell,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: fontFamily.sans,
          fontWeight: fontWeight.medium,
          fontSize: fontSize.sm,
          color: t.text.secondary,
          overflow: 'hidden',
        }}
        data-testid="tx-success-token-logo"
      >
        {symbol ? symbol.slice(0, 3).toUpperCase() : '?'}
      </div>
    );
  }

  return (
    <img
      src={uri}
      alt=""
      style={{ ...shell, objectFit: 'cover' }}
      onError={() => setFailed(true)}
      data-testid="tx-success-token-logo"
    />
  );
}

export function ExchangeReceipt({
  title,
  summary,
  explorerUrl,
  onContinue,
  settling = false,
  pendingTitle,
  exchange,
  exchangeRate,
  exchangeFee,
}: Omit<ExchangeReceiptScreenProps, 'tone'>) {
  const actionStep = exchange ? 4 : 2;
  const { t } = useTranslation();
  const semantic = useSemantic();

  const [receiptTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const showWait = useWaitGate(settling);
  // The haptic mobile fires when `showWait` flips has no DOM equivalent — see
  // file header — so no effect stands in for it.
  const { held: waveHeld, onExited: onWaveGone } = useWaitExit(showWait);

  const handleExplorerClick = () => {
    if (explorerUrl) window.open(explorerUrl, '_blank', 'noopener,noreferrer');
  };

  const container: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.headerPadding,
    paddingRight: spacing.headerPadding,
  };

  if (waveHeld) {
    return (
      <div style={container}>
        <LoadingScreen
          visible={showWait}
          waves
          title={pendingTitle ?? title}
          subtitle={summary}
          onExited={onWaveGone}
        />
      </div>
    );
  }

  const styles = stylesFor(semantic);

  return (
    <div
      style={{ ...container, ...styles.receipt, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      data-testid="tx-success-screen"
    >
      <div style={styles.cluster} data-testid="tx-success-cluster">
        {exchange ? (
          <div style={styles.exchangeBlock} data-testid="tx-success-hero">
            <Rise step={0} style={styles.tokenLine} data-testid="tx-success-sent">
              <TokenMark uri={exchange.send.logo} symbol={exchange.send.symbol} />
              <div
                style={
                  {
                    ...styles.amountCell,
                    '--amount-chars': exchange.send.amount.length,
                  } as React.CSSProperties
                }
              >
                <span style={{ ...styles.amount, ...styles.amountSpent }}>
                  {exchange.send.amount}
                </span>
              </div>
              <div style={styles.tickSlot} />
            </Rise>
            <Rise step={1} style={styles.trackRow} aria-hidden data-testid="tx-success-arrow">
              <ArrowDownIcon
                weight="bold"
                size={GRAPHIC_ICON_SIZE}
                color={semantic.text.secondary}
              />
            </Rise>
            <Rise
              step={2}
              style={styles.tokenLine}
              data-testid="tx-success-received"
              aria-label={`${exchange.receive.amount}, ${title}`}
            >
              <TokenMark uri={exchange.receive.logo} symbol={exchange.receive.symbol} />
              <div
                style={
                  {
                    ...styles.amountCell,
                    '--amount-chars': exchange.receive.amount.length,
                  } as React.CSSProperties
                }
              >
                <span style={styles.amount} data-testid="tx-success-summary">
                  {exchange.receive.amount}
                </span>
              </div>
              <div style={styles.tickSlot} data-testid="tx-success-tick">
                <CheckIcon weight="bold" size={GRAPHIC_ICON_SIZE} color={semantic.status.success} />
              </div>
            </Rise>
          </div>
        ) : (
          <Rise step={0} style={styles.statusRow} data-testid="tx-success-status">
            <span style={styles.statusGlyph} aria-hidden>
              ✓
            </span>
            <span style={styles.statusLabel} data-testid="tx-success-title">
              {title}
            </span>
          </Rise>
        )}

        {exchange ? null : (
          <Rise step={1} style={styles.amountContainer} data-testid="tx-success-amount">
            <div
              style={
                {
                  ...styles.amountCell,
                  flex: 'none',
                  width: '100%',
                  '--amount-chars': Math.max(1, summary.length),
                } as React.CSSProperties
              }
            >
              <span style={styles.amount} data-testid="tx-success-summary">
                {summary}
              </span>
            </div>
          </Rise>
        )}

        {exchange ? (
          <Rise step={3} style={styles.receiptRows} data-testid="tx-success-receipt">
            {exchangeRate ? (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>{t('transactions.detail.rate', 'Rate')}</span>
                <span style={{ ...styles.receiptValue, ...tabularNums.css }}>{exchangeRate}</span>
              </div>
            ) : null}
            {exchangeFee ? (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>{t('swap.review.salmonFee', 'Salmon fee')}</span>
                <span style={{ ...styles.receiptValue, ...tabularNums.css }}>{exchangeFee}</span>
              </div>
            ) : null}
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>{t('transactions.detail.time', 'Time')}</span>
              <span style={{ ...styles.receiptValue, ...tabularNums.css }}>{receiptTime}</span>
            </div>
          </Rise>
        ) : null}
      </div>

      <Rise step={actionStep} style={styles.actionGroup} data-testid="tx-success-actions">
        <div style={styles.assistBand} data-testid="tx-success-assist">
          {explorerUrl ? (
            <TextButton
              onPress={handleExplorerClick}
              color={semantic.text.secondary}
              testID="tx-success-explorer-link"
            >
              {t('transaction.viewOnExplorer')}
            </TextButton>
          ) : null}
        </div>

        <div style={styles.actionBand} data-testid="tx-success-action">
          <PrimaryButton
            onPress={onContinue}
            disabled={settling}
            testID="tx-success-continue-button"
          >
            {t('transaction.continue', 'Back to wallet')}
          </PrimaryButton>
        </div>
      </Rise>
    </div>
  );
}

const stylesFor = (t: Semantic): Record<string, React.CSSProperties> => ({
  receipt: {
    justifyContent: 'flex-start',
    paddingTop: spacing['5xl'],
  },
  cluster: {
    display: 'flex',
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusGlyph: {
    fontSize: fontSize.headline,
    color: t.status.success,
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.none,
  },
  statusLabel: {
    fontSize: fontSize.headline,
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.semibold,
    color: t.text.primary,
    letterSpacing: letterSpacing.snug,
  },
  amountContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  exchangeBlock: {
    display: 'flex',
    alignSelf: 'stretch',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  tokenLine: {
    display: 'flex',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  trackRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  tickSlot: {
    width: GRAPHIC_ICON_SIZE,
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0,
  },
  amountCell: {
    display: 'flex',
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    containerType: 'inline-size',
  } as React.CSSProperties,
  amount: {
    ...tabularNums.css,
    fontFamily: fontFamily.sans,
    fontSize: amountClamp(fontSize.body, fontSize.title),
    fontWeight: fontWeight.medium,
    color: t.text.primary,
    textAlign: 'center',
    lineHeight: `${fontSize.title * lineHeight.tight}px`,
    minWidth: 0,
    whiteSpace: 'nowrap',
  },
  amountSpent: {
    fontSize: amountClamp(fontSize.body, fontSize.bodyLg),
    fontWeight: fontWeight.regular,
    color: t.text.secondary,
    lineHeight: `${fontSize.bodyLg * lineHeight.tight}px`,
  },
  receiptRows: {
    display: 'flex',
    alignSelf: 'stretch',
    flexDirection: 'column',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  receiptLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.sans,
    color: t.text.tertiary,
  },
  receiptValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.medium,
    color: t.text.secondary,
    textAlign: 'right',
  },
  actionGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'stretch',
    marginTop: 'auto',
  },
  assistBand: {
    height: endingBands.assist,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBand: {
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'stretch',
    height: endingBands.action,
    justifyContent: 'flex-start',
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
    boxSizing: 'border-box',
  },
});
