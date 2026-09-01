import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { ClockIcon, XCircleIcon, iconSize } from '../../icons';
import {
  vs,
  s,
  fontSize,
  fontFamilyNative,
  fontScaleCap,
  formatRawAmount,
  formatRelativeTimeCompact,
  getTransactionDescription,
  lineHeight,
  spacing,
  semantic,
  tabularNums,
} from '@salmon/shared';
import { Chip } from '../Chip';
import { ListRow } from '../ListRow';
import { TRANSACTION_TYPE_CONFIG, TYPE_LABEL_KEYS, TransactionMark } from './transactionTypes';
import type { TransactionItemProps, TransactionTokenAmount } from './types';

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

// ============================================================================
// Sub-components
// ============================================================================

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

  const color = sign === '+' ? semantic.status.success : semantic.status.danger;

  return (
    <Text
      testID="tx-row-amount"
      style={[styles.amountText, { color }]}
      numberOfLines={1}
      maxFontSizeMultiplier={fontScaleCap.dense}
    >
      {displayAmount}
    </Text>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * TransactionItem - Individual transaction row for the transaction list
 *
 * The kit's `ListRow` (a `Card` at padding md / radius xl) laid out as
 * leading mark, title stack and amount column — the row no longer draws a box
 * of its own. The protocol name is a `Chip sm` in the title row's accessory
 * slot, so an unbounded upstream name (`SOLANA_PROGRAM_LIBRARY`) drops to its
 * own line instead of truncating the verb to "Receive…".
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

  // Named in `packages/shared`, said here — see `TransactionDescription`.
  const descriptionText = useMemo(() => {
    const described = getTransactionDescription(type, inputs, outputs, source, description);
    return t(described.key, described.values);
  }, [type, inputs, outputs, source, description, t]);

  const typeLabel = t(TYPE_LABEL_KEYS[type] ?? TYPE_LABEL_KEYS.unknown, config.label);

  // Helper to render token amounts
  const renderTokenAmounts = (tokens: TransactionTokenAmount[], sign: '+' | '-') =>
    tokens.map((token, i) => (
      <AmountDisplay key={`${sign}-${i}`} token={token} sign={sign} hidden={hiddenBalance} />
    ));

  // Render amount changes
  const renderAmounts = () => {
    if (status === 'failed' || status === 'pending') {
      const failed = status === 'failed';
      const StatusIcon = failed ? XCircleIcon : ClockIcon;
      const ink = failed ? semantic.status.danger : semantic.status.warning;

      return (
        <View style={styles.statusBadge}>
          <StatusIcon size={iconSize.sm} color={ink} />
          <Text style={[styles.statusText, { color: ink }]}>
            {failed
              ? t('transactions.detail.failed', 'Failed')
              : t('transactions.detail.pending', 'Pending')}
          </Text>
        </View>
      );
    }

    // Complex swap: the row states the first leg of each side and how many
    // more there are. The rest is one tap away, in the detail.
    if (isComplex) {
      const firstOutput = outputs[0];
      const firstInput = inputs[0];

      return (
        <>
          {firstOutput && <AmountDisplay token={firstOutput} sign="-" hidden={hiddenBalance} />}
          {firstInput && <AmountDisplay token={firstInput} sign="+" hidden={hiddenBalance} />}
          <Text style={styles.moreText}>
            {t('transactions.detail.nMore', {
              count: totalAmounts - 2,
              defaultValue: '+{{count}} more',
            })}
          </Text>
        </>
      );
    }

    return (
      <>
        {type !== 'receive' && renderTokenAmounts(outputs, '-')}
        {type !== 'send' && renderTokenAmounts(inputs, '+')}
      </>
    );
  };

  return (
    <ListRow
      testID="activity-tx-row"
      style={StyleSheet.flatten([styles.rowSpacing, style])}
      onPress={handlePress}
      leading={<TransactionMark transaction={transaction} />}
      title={typeLabel}
      titleAccessory={
        source ? (
          <Chip
            testID="tx-row-source"
            label={source}
            size="sm"
            variant="outline"
            style={styles.sourceChip}
          />
        ) : undefined
      }
      subtitle={descriptionText}
      trailing={
        <View style={styles.rightSection}>
          {renderAmounts()}
          <Text style={styles.timeText} maxFontSizeMultiplier={fontScaleCap.dense}>
            {formatRelativeTimeCompact(timestamp, t)}
          </Text>
        </View>
      }
      accessibilityLabel={t(
        'accessibility.transaction_row',
        '{{type}} transaction, {{description}}',
        { type: typeLabel, description: descriptionText }
      )}
    />
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  /** List glue only — the row's ground, radius and padding are the kit's. */
  rowSpacing: {
    marginBottom: vs(spacing.md),
  },
  sourceChip: {
    // The chip is bounded twice: it may shrink, and it may never claim more
    // than this much of the row however long the upstream protocol name is.
    // Past that the title row wraps it onto its own line — the verb never
    // pays for the protocol's name.
    flexShrink: 1,
    maxWidth: s(SOURCE_BADGE_MAX_WIDTH),
  },
  rightSection: {
    alignItems: 'flex-end',
    // The amount column: it reserves its width before the row's left half is
    // laid out, and it never gives it back.
    minWidth: s(AMOUNT_COLUMN_MIN_WIDTH),
    flexShrink: 0,
    gap: vs(spacing.xxs),
  },
  amountText: {
    fontSize: s(fontSize.caption),
    lineHeight: s(fontSize.caption) * lineHeight.snug,
    fontFamily: fontFamilyNative.bold,
    // Money Composition Rule: amounts right-aligned in a fixed column, on
    // tabular figures, so the column edge is the same on every row.
    textAlign: 'right',
    ...TABULAR,
  },
  timeText: {
    fontSize: s(fontSize.micro),
    lineHeight: s(fontSize.micro) * lineHeight.snug,
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.secondary,
    ...TABULAR,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
  },
  statusText: {
    fontSize: s(fontSize.caption),
    fontFamily: fontFamilyNative.bold,
  },
  /**
   * One Living Thing Rule: the accent is a budget, and a count that repeats
   * once per complex swap would spend it four times a screen. A remainder is
   * chrome — it reads in quiet ink.
   */
  moreText: {
    fontSize: s(fontSize.micro),
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.secondary,
    textAlign: 'right',
  },
});

export default TransactionItem;
