import type { Token } from '../types';
import {
  formatLargeNumber,
  formatTokenAmount,
  getLabelValue,
  hiddenValue,
  showPercentage,
  type LabelType,
} from './formatting';

/** What a token row prints and says, the same on both platforms. */
export interface TokenRowDisplay {
  /** Which change color the percentage takes. */
  changeTone: LabelType;
  displayPrice: string | null;
  displayUsdValue: string | null;
  displayTokenAmount: string;
  /** Screen-reader values, masked exactly like the printed ones. */
  spokenAmount: Token['uiAmount'] | string;
  spokenPrice: Token['price'] | string;
  /** "SOL · " when a price or change follows, "SOL" alone otherwise. */
  tickerSegment: string | null;
  /** " · -1.1%" after a price, "-1.1%" without one. */
  changeSegment: string | null;
}

/**
 * The figures of one token row.
 *
 * With `hiddenBalance`, every figure — printed or spoken — is the hidden
 * value. The amount is compact above a thousand (K/M/B) and exact below it,
 * so a large holding does not push the ticker off the row and a dust balance
 * still reads digit for digit.
 */
export function tokenRowDisplay(
  token: Pick<Token, 'symbol' | 'price' | 'uiAmount' | 'usdBalance' | 'last24HoursChange'>,
  hiddenBalance: boolean,
  formatValue: (value: number) => string
): TokenRowDisplay {
  const { symbol, price, uiAmount, usdBalance, last24HoursChange } = token;
  const percentageChange = last24HoursChange?.perc ?? 0;

  const displayPrice = hiddenBalance ? hiddenValue : price != null ? formatValue(price) : null;
  const displayPercentage = last24HoursChange ? showPercentage(percentageChange) : null;
  const displayUsdValue = hiddenBalance
    ? hiddenValue
    : usdBalance != null
      ? formatValue(usdBalance)
      : null;

  const numericAmount = typeof uiAmount === 'string' ? parseFloat(uiAmount) : uiAmount;
  const compactAmount = Number.isFinite(numericAmount)
    ? formatLargeNumber(numericAmount as number)
    : formatTokenAmount(uiAmount);

  const hasTail = !!displayPrice || !!displayPercentage;

  return {
    changeTone: getLabelValue(percentageChange),
    displayPrice,
    displayUsdValue,
    displayTokenAmount: hiddenBalance ? hiddenValue : `${compactAmount} ${symbol || ''}`,
    spokenAmount: hiddenBalance ? hiddenValue : uiAmount,
    spokenPrice: hiddenBalance ? hiddenValue : price,
    tickerSegment: symbol ? (hasTail ? `${symbol} · ` : symbol) : null,
    changeSegment: displayPercentage
      ? displayPrice
        ? ` · ${displayPercentage}`
        : displayPercentage
      : null,
  };
}
