/**
 * ConfirmationExchange — the single graphic block on the confirmation, on the
 * DOM: sent token mark, arrow, received token mark, amounts and USD values
 * underneath. The mobile twin is
 * `apps/mobile/src/components/TransactionConfirmation/ConfirmationExchange.tsx`.
 */
import React, { useState } from 'react';
import i18n from 'i18next';
import {
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  formatTokenAmountSignificant,
  letterSpacing,
  lineHeight,
  spacing,
  tabularNums,
  type Semantic,
  type SwapReviewExchangeSide,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { ArrowRightIcon } from '../../icons';
import { PendingValue } from '../PendingValue';
import type { ConfirmationExchangeProps } from './types';

/** The token marks are the graphic's subject: the icon ramp's 40 step. */
const LOGO_SIZE = componentSizes.iconSizeXL;

/**
 * The proposal formats `amount` at full precision as "<number> <SYMBOL>".
 * The review reads better trimmed to significant digits — the full figure
 * still renders in the details card's "Minimum Received" row.
 */
function toSignificantAmount(raw: string): string {
  const spaceIdx = raw.lastIndexOf(' ');
  if (spaceIdx < 0) return raw;
  const numPart = raw.slice(0, spaceIdx);
  const symbolPart = raw.slice(spaceIdx + 1);
  const normalized = i18n.language?.startsWith('es') ? numPart.replace(',', '.') : numPart;
  const value = parseFloat(normalized);
  if (!isFinite(value)) return raw;
  return `${formatTokenAmountSignificant(value, i18n.language)} ${symbolPart}`;
}

/** The Portfolio list drops the "~"; the review reads the same way. */
function stripApprox(raw: string): string {
  return raw.replace(/^~\s*/, '');
}

function TokenMark({ uri, symbol }: { uri?: string; symbol: string }) {
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
        data-testid={`confirmation-token-logo-${symbol}`}
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
      data-testid={`confirmation-token-logo-${symbol}`}
    />
  );
}

function ExchangeSide({
  label,
  logo,
  symbol,
  amount,
  usdValue,
  pendingAmount = false,
  pendingUsdValue = false,
  emphasis = false,
}: SwapReviewExchangeSide) {
  const t = useSemantic();
  const styles = sideStyles(t);
  return (
    <div style={styles.side}>
      <span style={styles.label}>{label}</span>
      <TokenMark uri={logo} symbol={symbol} />
      <PendingValue pending={pendingAmount}>
        <span
          style={{
            ...styles.amount,
            ...(emphasis ? styles.amountEmphasis : {}),
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
            maxWidth: '100%',
          }}
        >
          {toSignificantAmount(amount)}
        </span>
      </PendingValue>
      {usdValue != null && (
        <PendingValue pending={pendingUsdValue}>
          <span style={styles.usdValue}>{stripApprox(usdValue)}</span>
        </PendingValue>
      )}
    </div>
  );
}

export function ConfirmationExchange({ send, receive, style }: ConfirmationExchangeProps) {
  const t = useSemantic();
  return (
    <div
      data-testid="confirmation-exchange"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.lg,
        ...style,
      }}
    >
      <ExchangeSide {...send} />
      <ArrowRightIcon
        size={componentSizes.iconSizeMedium}
        color={t.accent.ink}
        weight="bold"
        aria-hidden
      />
      <ExchangeSide {...receive} />
    </div>
  );
}

const sideStyles = (t: Semantic): Record<string, React.CSSProperties> => ({
  side: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  label: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: t.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wider,
    textAlign: 'center',
  },
  amount: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: t.text.primary,
    letterSpacing: letterSpacing.snug,
    lineHeight: lineHeight.tight,
    textAlign: 'center',
    ...tabularNums.css,
  },
  amountEmphasis: {
    fontSize: fontSize.xl,
  },
  usdValue: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: t.text.secondary,
    letterSpacing: letterSpacing.slight,
    textAlign: 'center',
    ...tabularNums.css,
  },
});
