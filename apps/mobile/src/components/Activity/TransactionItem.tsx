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
  getShortAddress,
  getTransactionDescription,
  lineHeight,
  spacing,
  semantic,
  tabularNums,
} from '@salmon/shared';
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

/** How much of the counterparty address the row keeps at each end. */
const ADDRESS_CHARS = 4;

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
 * of its own.
 *
 * There is no protocol chip: CORE 08 draws none, and an upstream program name
 * (`SOLANA_PROGRAM_LIBRARY`) is not what the user is scanning for. The
 * subtitle is the counterparty instead — the address book's name for it when
 * the book knows it, and the short address otherwise. The protocol still
 * shows in the detail, which is where a program name belongs.
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
  contacts,
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

  // The other side of the transfer, when there is one: who it went to, or who
  // it came from.
  const counterparty =
    type === 'send' ? outputs[0]?.destination : type === 'receive' ? inputs[0]?.source : undefined;

  // Named in `packages/shared`, said here — see `TransactionDescription`.
  //
  // A transfer with a counterparty always says "To/From <someone>", even when
  // the indexer sent prose of its own: the address book's name outranks it,
  // and the short address is the same form the wallet header uses. Everything
  // else keeps the shared description.
  const descriptionText = useMemo(() => {
    if (counterparty) {
      const name = contacts?.[counterparty] ?? getShortAddress(counterparty, ADDRESS_CHARS) ?? '';
      return t(
        type === 'send'
          ? 'transactions.description.sendTo'
          : 'transactions.description.receiveFrom',
        { address: name }
      );
    }
    const described = getTransactionDescription(type, inputs, outputs, source, description);
    return t(described.key, described.values);
  }, [counterparty, contacts, type, inputs, outputs, source, description, t]);

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
