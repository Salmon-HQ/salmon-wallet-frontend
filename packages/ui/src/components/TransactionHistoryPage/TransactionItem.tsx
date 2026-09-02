/**
 * TransactionItem — one row of the activity list, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Activity/TransactionItem.tsx`:
 * the kit's `ListRow` laid out as leading mark, title stack and amount column
 * — the row draws no box of its own. No protocol chip: the subtitle is the
 * counterparty (the address book's name when the book knows it, the short
 * address otherwise); the protocol shows in the detail, where a program name
 * belongs.
 */
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  fontWeight,
  formatRawAmount,
  formatRelativeTimeCompact,
  getShortAddress,
  getTransactionDescription,
  lineHeight,
  spacing,
  tabularNums,
  type TransactionTokenAmount,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { ClockIcon, XCircleIcon, iconSize } from '../../icons';
import { ListRow } from '../ListRow';
import { TYPE_LABEL_KEYS, TransactionMark, transactionTypeConfigFor } from './transactionTypes';
import type { TransactionItemProps } from './types';

const HIDDEN_VALUE = '****';

/** Maximum amounts to show before collapsing */
const MAX_VISIBLE_AMOUNTS = 2;

/** How much of the counterparty address the row keeps at each end. */
const ADDRESS_CHARS = 4;

/** The amount column reserves this width, so the chip can never reach it */
const AMOUNT_COLUMN_MIN_WIDTH = 104;

/**
 * Money Composition Rule: amounts right-aligned in a fixed column, on tabular
 * figures, so the column edge is the same on every row.
 */
const amountStyle: React.CSSProperties = {
  fontFamily: fontFamily.sans,
  fontSize: fontSize.caption,
  lineHeight: `${fontSize.caption * lineHeight.snug}px`,
  fontWeight: fontWeight.bold,
  textAlign: 'right',
  whiteSpace: 'nowrap',
  ...tabularNums.css,
};

function AmountDisplay({
  token,
  sign,
  hidden,
}: {
  token: TransactionTokenAmount;
  sign: '+' | '-';
  hidden: boolean;
}) {
  const { status } = useSemantic();
  const displayAmount = hidden
    ? `${sign} ${HIDDEN_VALUE} ${token.symbol}`
    : `${sign} ${formatRawAmount(token.amount, token.decimals)} ${token.symbol}`;

  return (
    <span
      data-testid="tx-row-amount"
      style={{ ...amountStyle, color: sign === '+' ? status.success : status.danger }}
    >
      {displayAmount}
    </span>
  );
}

export function TransactionItem({
  transaction,
  onPress,
  hiddenBalance = false,
  contacts,
  style,
  className,
}: TransactionItemProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const { status: statusTokens, text } = semantic;
  const { type, timestamp, status, inputs, outputs, description, source } = transaction;
  const typeConfig = transactionTypeConfigFor(semantic);
  const config = typeConfig[type] || typeConfig.unknown;

  const totalAmounts = inputs.length + outputs.length;
  const isComplex = type === 'swap' && totalAmounts > MAX_VISIBLE_AMOUNTS;

  const handlePress = useCallback(() => {
    onPress?.(transaction);
  }, [onPress, transaction]);

  // The other side of the transfer, when there is one: who it went to, or who
  // it came from.
  const counterparty =
    type === 'send' ? outputs[0]?.destination : type === 'receive' ? inputs[0]?.source : undefined;

  // A transfer with a counterparty always says "To/From <someone>", even when
  // the indexer sent prose of its own: the address book's name outranks it,
  // and the short address is the same form the wallet header uses.
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

  const renderTokenAmounts = (tokens: TransactionTokenAmount[], sign: '+' | '-') =>
    tokens.map((token, i) => (
      <AmountDisplay key={`${sign}-${i}`} token={token} sign={sign} hidden={hiddenBalance} />
    ));

  const renderAmounts = () => {
    if (status === 'failed' || status === 'pending') {
      const failed = status === 'failed';
      const StatusIcon = failed ? XCircleIcon : ClockIcon;
      const ink = failed ? statusTokens.danger : statusTokens.warning;

      return (
        <span
          data-testid={failed ? 'tx-row-status-failed' : 'tx-row-status-pending'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs }}
        >
          <StatusIcon size={iconSize.sm} color={ink} />
          <span
            style={{
              fontFamily: fontFamily.sans,
              fontSize: fontSize.caption,
              fontWeight: fontWeight.bold,
              color: ink,
            }}
          >
            {failed
              ? t('transactions.detail.failed', 'Failed')
              : t('transactions.detail.pending', 'Pending')}
          </span>
        </span>
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
          {/* One Living Thing Rule: a remainder is chrome — it reads in quiet ink. */}
          <span
            style={{
              fontFamily: fontFamily.sans,
              fontSize: fontSize.micro,
              fontWeight: fontWeight.medium,
              color: text.secondary,
              textAlign: 'right',
            }}
          >
            {t('transactions.detail.nMore', {
              count: totalAmounts - 2,
              defaultValue: '+{{count}} more',
            })}
          </span>
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
      className={className}
      style={style}
      onPress={onPress ? handlePress : undefined}
      leading={<TransactionMark transaction={transaction} />}
      title={typeLabel}
      subtitle={descriptionText}
      trailing={
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            // The amount column: it reserves its width before the row's left
            // half is laid out, and it never gives it back.
            minWidth: AMOUNT_COLUMN_MIN_WIDTH,
            flexShrink: 0,
            gap: spacing.xxs,
          }}
        >
          {renderAmounts()}
          <span
            style={{
              fontFamily: fontFamily.sans,
              fontSize: fontSize.micro,
              lineHeight: `${fontSize.micro * lineHeight.snug}px`,
              fontWeight: fontWeight.medium,
              color: text.secondary,
              ...tabularNums.css,
            }}
          >
            {formatRelativeTimeCompact(timestamp, t)}
          </span>
        </span>
      }
      accessibilityLabel={t(
        'accessibility.transaction_row',
        '{{type}} transaction, {{description}}',
        { type: typeLabel, description: descriptionText }
      )}
    />
  );
}
