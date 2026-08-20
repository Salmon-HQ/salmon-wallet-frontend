import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsLeftRightIcon,
  ClockIcon,
  CubeIcon,
  FireIcon,
  LockIcon,
  MoneyIcon,
  PlusCircleIcon,
  QuestionIcon,
  XCircleIcon,
  iconSize,
} from '../../icons';
import type { IconComponent } from '../../icons';
import {
  borderWidth,
  colors,
  ms,
  vs,
  s,
  fontSize,
  borderRadius,
  formatRawAmount,
  formatRelativeTimeCompact,
  getTransactionDescription,
  fontFamilyNative,
  spacing,
  letterSpacing,
  semantic,
  tabularNums,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import { TokenLogo } from '../TokenLogo';
import type { TransactionItemProps, TransactionType, TransactionTokenAmount } from './types';

// ============================================================================
// Constants
// ============================================================================

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one, so copy it once here.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

const HIDDEN_VALUE = '****';

/** Maximum amounts to show before collapsing */
const MAX_VISIBLE_AMOUNTS = 2;

/** Widest the protocol chip may grow, in design px, before it truncates */
const SOURCE_BADGE_MAX_WIDTH = 116;

/** The amount column reserves this width, so the chip can never reach it */
const AMOUNT_COLUMN_MIN_WIDTH = 104;

/**
 * Transaction type display configuration
 */
const TRANSACTION_TYPE_CONFIG: Record<
  TransactionType,
  {
    label: string;
    icon: IconComponent;
    color: string;
  }
> = {
  send: {
    label: 'Sent',
    icon: ArrowUpIcon,
    color: colors.change.negative,
  },
  receive: {
    label: 'Received',
    icon: ArrowDownIcon,
    color: colors.change.positive,
  },
  swap: {
    label: 'Swapped',
    icon: ArrowsLeftRightIcon,
    color: colors.palette.purple,
  },
  mint: {
    label: 'Minted',
    icon: PlusCircleIcon,
    color: colors.palette.cyan,
  },
  burn: {
    label: 'Burned',
    icon: FireIcon,
    color: colors.palette.orange,
  },
  stake: {
    label: 'Staked',
    icon: LockIcon,
    color: colors.palette.green,
  },
  loan: {
    label: 'Loan',
    icon: MoneyIcon,
    color: colors.palette.amber,
  },
  interaction: {
    label: 'Interaction',
    icon: CubeIcon,
    color: colors.palette.blue,
  },
  unknown: {
    label: 'Unknown',
    icon: QuestionIcon,
    color: colors.text.secondary,
  },
};

/** Translation key map — resolved via t() inside the component (mirrors packages/ui twin) */
const TYPE_LABEL_KEYS: Record<TransactionType, string> = {
  send: 'transactions.detail.sent',
  receive: 'transactions.detail.received',
  swap: 'transactions.detail.swapped',
  mint: 'transactions.detail.minted',
  burn: 'transactions.detail.burned',
  stake: 'transactions.detail.staked',
  loan: 'transactions.detail.loan',
  interaction: 'transactions.detail.interaction',
  unknown: 'transactions.detail.unknown',
};

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Swap tokens visualization (two overlapping logos) with type badge
 */
const SwapTokenLogos: React.FC<{
  fromLogo?: string | null;
  fromSymbol?: string;
  toLogo?: string | null;
  toSymbol?: string;
  typeIcon: IconComponent;
  typeColor: string;
}> = ({ fromLogo, fromSymbol, toLogo, toSymbol, typeIcon: TypeIcon, typeColor }) => {
  return (
    <View style={styles.swapLogosContainer}>
      <TokenLogo uri={fromLogo || undefined} symbol={fromSymbol} size={34} />
      <View style={styles.swapLogoOverlap}>
        <TokenLogo uri={toLogo || undefined} symbol={toSymbol} size={34} />
      </View>
      {/* Type badge */}
      <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
        <TypeIcon size={10} color={colors.text.primary} />
      </View>
    </View>
  );
};

/**
 * Token logo with type badge overlay
 */
const TokenLogoWithBadge: React.FC<{
  uri?: string | null;
  symbol?: string;
  typeIcon: IconComponent;
  typeColor: string;
}> = ({ uri, symbol, typeIcon: TypeIcon, typeColor }) => {
  return (
    <View style={styles.logoWithBadgeContainer}>
      <TokenLogo uri={uri || undefined} symbol={symbol} size={40} />
      <View style={[styles.typeBadge, styles.typeBadgeSingle, { backgroundColor: typeColor }]}>
        <TypeIcon size={10} color={colors.text.primary} />
      </View>
    </View>
  );
};

/**
 * Amount display for a transaction
 */
const AmountDisplay: React.FC<{
  token: TransactionTokenAmount;
  sign: '+' | '-';
  hidden: boolean;
}> = ({ token, sign, hidden }) => {
  const displayAmount = hidden
    ? `${sign} ${HIDDEN_VALUE} ${token.symbol}`
    : `${sign} ${formatRawAmount(token.amount, token.decimals)} ${token.symbol}`;

  const color = sign === '+' ? colors.change.positive : colors.change.negative;

  return (
    <Text testID="tx-row-amount" style={[styles.amountText, { color }]} numberOfLines={1}>
      {displayAmount}
    </Text>
  );
};

/**
 * Source/Protocol badge
 */
const SourceBadge: React.FC<{ source: string }> = ({ source }) => {
  return (
    <View testID="tx-row-source" style={styles.sourceBadge}>
      {/* A protocol name is raw upstream data of unbounded length
          (`SOLANA_PROGRAM_LIBRARY`). It is bounded here so it can never grow
          past its own column and paint over the amount beside it. */}
      <Text style={styles.sourceText} numberOfLines={1} ellipsizeMode="tail">
        {source}
      </Text>
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * TransactionItem - Individual transaction row for the transaction list
 *
 * Features:
 * - Shows transaction type icon with token logos
 * - Collapses multiple amounts to a count; the rest live in the detail
 * - Badge showing source protocol (Jupiter, etc.)
 *
 * @example
 * ```tsx
 * <TransactionItem
 *   transaction={transaction}
 *   onPress={(tx) => console.log('Pressed:', tx.id)}
 *   hiddenBalance={false}
 * />
 * ```
 */
export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  hiddenBalance = false,
  style,
}) => {
  const { t } = useTranslation();
  const { type, timestamp, status, inputs, outputs, description, source } = transaction;
  const config = TRANSACTION_TYPE_CONFIG[type] || TRANSACTION_TYPE_CONFIG.unknown;

  // Calculate if we should show collapsed view
  const totalAmounts = inputs.length + outputs.length;
  const isComplex = type === 'swap' && totalAmounts > MAX_VISIBLE_AMOUNTS;

  const handlePress = useCallback(() => {
    onPress?.(transaction);
  }, [onPress, transaction]);

  // Get description text
  const descriptionText = useMemo(
    () => getTransactionDescription(type, inputs, outputs, source, description),
    [type, inputs, outputs, source, description]
  );

  // Determine which logo(s) to show
  const renderLogo = () => {
    // For swaps, try to show token logos with type badge
    if (type === 'swap') {
      if (inputs[0]?.logo && outputs[0]?.logo) {
        return (
          <SwapTokenLogos
            fromLogo={outputs[0].logo}
            fromSymbol={outputs[0].symbol}
            toLogo={inputs[0].logo}
            toSymbol={inputs[0].symbol}
            typeIcon={config.icon}
            typeColor={config.color}
          />
        );
      }
    }

    // For other types with token logo, show logo with type badge
    const primaryToken = type === 'receive' ? inputs[0] : outputs[0] || inputs[0];
    if (primaryToken?.logo) {
      return (
        <TokenLogoWithBadge
          uri={primaryToken.logo}
          symbol={primaryToken.symbol}
          typeIcon={config.icon}
          typeColor={config.color}
        />
      );
    }

    // Fallback to type icon only (no badge needed)
    return (
      <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
        <config.icon size={22} color={config.color} />
      </View>
    );
  };

  // Helper to render token amounts
  const renderTokenAmounts = (tokens: TransactionTokenAmount[], sign: '+' | '-') => {
    return tokens.map((token, i) => (
      <AmountDisplay key={`${sign}-${i}`} token={token} sign={sign} hidden={hiddenBalance} />
    ));
  };

  // Render amount changes
  const renderAmounts = () => {
    // Status badges
    if (status === 'failed') {
      return (
        <View style={styles.failedBadge}>
          <XCircleIcon size={iconSize.sm} color={semantic.status.danger} />
          <Text style={styles.failedText}>{t('transactions.detail.failed', 'Failed')}</Text>
        </View>
      );
    }

    if (status === 'pending') {
      return (
        <View style={styles.pendingBadge}>
          <ClockIcon size={14} color={semantic.status.warning} />
          <Text style={styles.pendingText}>{t('transactions.detail.pending', 'Pending')}</Text>
        </View>
      );
    }

    // Complex swap: the row states the first leg of each side and how many
    // more there are. The rest is one tap away, in the detail.
    if (isComplex) {
      const firstOutput = outputs[0];
      const firstInput = inputs[0];
      const hiddenCount = totalAmounts - 2;

      return (
        <View style={styles.amountsContainer}>
          {firstOutput && <AmountDisplay token={firstOutput} sign="-" hidden={hiddenBalance} />}
          {firstInput && <AmountDisplay token={firstInput} sign="+" hidden={hiddenBalance} />}
          <Text style={styles.moreText}>
            {t('transactions.detail.nMore', {
              count: hiddenCount,
              defaultValue: '+{{count}} more',
            })}
          </Text>
        </View>
      );
    }

    // Type-specific amount rendering
    const showOutputs = type !== 'receive';
    const showInputs = type !== 'send';

    return (
      <View style={styles.amountsContainer}>
        {showOutputs && renderTokenAmounts(outputs, '-')}
        {showInputs && renderTokenAmounts(inputs, '+')}
      </View>
    );
  };

  return (
    <BlurContainer style={[styles.blurWrapper, style]}>
      <TouchableOpacity
        testID="activity-tx-row"
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t(
          'accessibility.transaction_row',
          '{{type}} transaction, {{description}}',
          {
            type: t(TYPE_LABEL_KEYS[type] ?? TYPE_LABEL_KEYS.unknown, config.label),
            description: descriptionText,
          }
        )}
        accessibilityHint={t('transactions.tapToViewDetails', 'Tap to view transaction details')}
      >
        {/* Left: Logo/Icon */}
        <View style={styles.logoSection}>{renderLogo()}</View>

        {/* Center: Type and description */}
        <View style={styles.infoSection}>
          <View style={styles.typeRow}>
            <Text style={styles.typeText} numberOfLines={1}>
              {t(TYPE_LABEL_KEYS[type] ?? TYPE_LABEL_KEYS.unknown, config.label)}
            </Text>
            {source && <SourceBadge source={source} />}
          </View>
          <Text style={styles.descriptionText} numberOfLines={1}>
            {descriptionText}
          </Text>
        </View>

        {/* Right: Amounts and time */}
        <View style={styles.rightSection}>
          {renderAmounts()}
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatRelativeTimeCompact(timestamp, t)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </BlurContainer>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  blurWrapper: {
    borderRadius: borderRadius.lg,
    marginBottom: vs(spacing.md),
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(spacing.headerPadding),
    paddingHorizontal: s(spacing.headerPadding),
  },
  logoSection: {
    marginRight: s(spacing.md),
  },
  swapLogosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 54,
    position: 'relative',
  },
  swapLogoOverlap: {
    marginLeft: -14,
    borderWidth: borderWidth.medium,
    borderColor: colors.background.secondary,
    borderRadius: borderRadius.iconContainer,
  },
  logoWithBadgeContainer: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  typeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: borderRadius.badge,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borderWidth.medium,
    borderColor: colors.background.secondary,
  },
  typeBadgeSingle: {
    top: -2,
    right: -2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.iconLg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    flex: 1,
    // A flex item's default minimum size is its content, so an over-long type
    // label or protocol chip would push this box wider than its flex share and
    // paint over the amount column. Zero it and let the children shrink.
    minWidth: 0,
    justifyContent: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
    marginBottom: vs(spacing.xs),
  },
  typeText: {
    fontSize: ms(fontSize.lg),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
    flexShrink: 1,
  },
  sourceBadge: {
    paddingHorizontal: s(spacing.xs),
    paddingVertical: vs(spacing.xxs),
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.sm,
    // The chip is bounded twice: it may shrink, and it may never claim more
    // than this much of the row however long the upstream protocol name is.
    flexShrink: 1,
    maxWidth: s(SOURCE_BADGE_MAX_WIDTH),
  },
  sourceText: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.semiWide,
  },
  descriptionText: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
  },
  rightSection: {
    alignItems: 'flex-end',
    marginLeft: s(spacing.sm),
    // The amount column: it reserves its width before the row's left half is
    // laid out, and it never gives it back. The chip cannot reach into it.
    minWidth: s(AMOUNT_COLUMN_MIN_WIDTH),
    flexShrink: 0,
  },
  amountsContainer: {
    alignSelf: 'stretch',
  },
  amountText: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    marginBottom: vs(spacing.xxs),
    // Money Composition Rule: amounts right-aligned in a fixed column, on
    // tabular figures, so the column edge is the same on every row.
    textAlign: 'right',
    ...TABULAR,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: vs(spacing.xs),
  },
  timeText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.tertiary,
    ...TABULAR,
  },
  failedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
  },
  failedText: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: semantic.status.danger,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
    paddingHorizontal: s(spacing.sm),
    paddingVertical: vs(spacing.xs),
    backgroundColor: `${semantic.status.warning}15`,
    borderRadius: borderRadius.sm,
  },
  pendingText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: semantic.status.warning,
  },
  /**
   * One Living Thing Rule: the accent is a budget, and a count that repeats
   * once per complex swap would spend it four times a screen. A remainder is
   * chrome — it reads in quiet ink.
   */
  moreText: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: vs(spacing.xs),
  },
});

export default TransactionItem;
