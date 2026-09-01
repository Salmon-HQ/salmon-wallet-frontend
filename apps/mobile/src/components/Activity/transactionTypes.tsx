/**
 * What a transaction type looks like: its verb, its glyph, its mark ink, and
 * the leading mark the activity row and the detail both put it behind.
 *
 * The row and the detail used to carry two copies of this table, which is how
 * a "Swapped" in one place and a "Swap" in the other happen.
 */
import React from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsLeftRightIcon,
  CubeIcon,
  FireIcon,
  LockIcon,
  MoneyIcon,
  PlusCircleIcon,
  QuestionIcon,
  iconSize,
} from '../../icons';
import type { IconComponent } from '../../icons';
import { colors } from '@salmon/shared';

import { IconBubble } from '../IconBubble';
import type { Transaction, TransactionType } from './types';

/** The kit's activity mark: a 40 circle (component inventory, CORE 08). */
export const LEADING_SIZE = 40;

export const TRANSACTION_TYPE_CONFIG: Record<
  TransactionType,
  { label: string; icon: IconComponent; color: string }
> = {
  send: { label: 'Sent', icon: ArrowUpIcon, color: colors.change.negative },
  receive: { label: 'Received', icon: ArrowDownIcon, color: colors.change.positive },
  swap: { label: 'Swapped', icon: ArrowsLeftRightIcon, color: colors.palette.purple },
  mint: { label: 'Minted', icon: PlusCircleIcon, color: colors.palette.cyan },
  burn: { label: 'Burned', icon: FireIcon, color: colors.palette.orange },
  stake: { label: 'Staked', icon: LockIcon, color: colors.palette.green },
  loan: { label: 'Loan', icon: MoneyIcon, color: colors.palette.amber },
  interaction: { label: 'Interaction', icon: CubeIcon, color: colors.palette.blue },
  unknown: { label: 'Unknown', icon: QuestionIcon, color: colors.text.secondary },
};

/** Translation keys for the verbs above — resolved via `t()` at the call site. */
export const TYPE_LABEL_KEYS: Record<TransactionType, string> = {
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

/**
 * The row's leading mark: the transaction's verb, not the token that moved.
 *
 * CORE 08's mock draws one glyph per row — sent/received/swap/etc. — on a
 * fixed accent-tint well, not the token logo the row used to badge. Token
 * identity was not dropped: it still reads from the amount text next to it
 * ("+2.50 SOL"), which already carried the ticker. The logo + mini type
 * badge (`TokenLogo` + corner `TypeBadge`, the swap pair with its overlap)
 * is gone with it — flag this to the owner if the token mark itself turns
 * out to be load-bearing somewhere this list doesn't cover.
 */
export const TransactionMark: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const { type } = transaction;
  const config = TRANSACTION_TYPE_CONFIG[type] || TRANSACTION_TYPE_CONFIG.unknown;

  return (
    <IconBubble
      size={LEADING_SIZE}
      shape="circle"
      tone="accent-tint"
      icon={config.icon}
      iconSize={iconSize.md}
    />
  );
};
