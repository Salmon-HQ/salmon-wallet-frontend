/**
 * What a transaction type looks like: its verb, its glyph, its mark ink, and
 * the leading mark the activity row and the detail both put it behind.
 *
 * The row and the detail used to carry two copies of this table, which is how
 * a "Swapped" in one place and a "Swap" in the other happen.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
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
import { borderRadius, borderWidth, colors, s, semantic, spacing } from '@salmon/shared';

import { IconBubble } from '../IconBubble';
import { TokenLogo } from '../TokenLogo';
import type { Transaction, TransactionType } from './types';

/** The kit's activity mark: a 40 circle (component inventory, CORE 08). */
export const LEADING_SIZE = 40;

/** The type badge riding the token logo — a mark on a mark, not a bubble. */
const TYPE_BADGE_SIZE = 18;

/** The overlapping logo in a swap pair, sized so the pair still reads at 40. */
const SWAP_LOGO_SIZE = 30;

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

/** The type badge that rides the leading mark's corner. */
const TypeBadge: React.FC<{ icon: IconComponent; color: string; single?: boolean }> = ({
  icon: Icon,
  color,
  single = false,
}) => (
  <View style={[styles.typeBadge, single && styles.typeBadgeSingle, { backgroundColor: color }]}>
    <Icon size={10} color={colors.text.primary} />
  </View>
);

/**
 * The row's leading mark: the token that moved, badged with the type — or,
 * for a swap, the pair — falling back to the kit's own well when the token
 * has no logo.
 */
export const TransactionMark: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const { type, inputs, outputs } = transaction;
  const config = TRANSACTION_TYPE_CONFIG[type] || TRANSACTION_TYPE_CONFIG.unknown;

  if (type === 'swap' && inputs[0]?.logo && outputs[0]?.logo) {
    return (
      <View style={styles.swapPair}>
        <TokenLogo uri={outputs[0].logo} symbol={outputs[0].symbol} size={SWAP_LOGO_SIZE} />
        <View style={styles.swapOverlap}>
          <TokenLogo uri={inputs[0].logo} symbol={inputs[0].symbol} size={SWAP_LOGO_SIZE} />
        </View>
        <TypeBadge icon={config.icon} color={config.color} />
      </View>
    );
  }

  const primaryToken = type === 'receive' ? inputs[0] : outputs[0] || inputs[0];
  if (primaryToken?.logo) {
    return (
      <View style={styles.singleMark}>
        <TokenLogo uri={primaryToken.logo} symbol={primaryToken.symbol} size={LEADING_SIZE} />
        <TypeBadge icon={config.icon} color={config.color} single />
      </View>
    );
  }

  return (
    <IconBubble
      size={LEADING_SIZE}
      shape="circle"
      tone="surface"
      icon={config.icon}
      iconSize={iconSize.md}
      iconColor={config.color}
    />
  );
};

const styles = StyleSheet.create({
  swapPair: {
    flexDirection: 'row',
    alignItems: 'center',
    height: LEADING_SIZE,
  },
  swapOverlap: {
    marginLeft: -s(spacing.md),
    borderWidth: borderWidth.medium,
    borderColor: semantic.depth.abyss,
    borderRadius: borderRadius.full,
  },
  singleMark: {
    width: LEADING_SIZE,
    height: LEADING_SIZE,
  },
  typeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: TYPE_BADGE_SIZE,
    height: TYPE_BADGE_SIZE,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borderWidth.medium,
    borderColor: semantic.depth.abyss,
  },
  typeBadgeSingle: {
    top: -2,
    right: -2,
  },
});
