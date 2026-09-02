/**
 * What a transaction type looks like: its verb, its glyph, its mark ink, and
 * the leading mark the activity row and the detail both put it behind.
 *
 * The mobile twin is `apps/mobile/src/components/Activity/transactionTypes.tsx`
 * — same table, same mark anatomy (the token that moved, badged with the
 * type; the pair for a swap; the kit's own well when there is no logo).
 */
import React from 'react';
import {
  borderRadius,
  borderWidth,
  chainMarks,
  componentSizes,
  spacing,
  type Semantic,
  type Transaction,
  type TransactionType,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
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
  type IconComponent,
} from '../../icons';
import { IconBubble } from '../IconBubble';
import { TokenLogo } from '../TokenList/TokenLogo';

/** The kit's activity mark: a 40 circle (component inventory, CORE 08). */
export const LEADING_SIZE = componentSizes.iconSize2XL;

/** The type badge riding the token logo — a mark on a mark, not a bubble. */
const TYPE_BADGE_SIZE = componentSizes.iconSizeXSmall;

/** The overlapping logo in a swap pair, sized so the pair still reads at 40. */
const SWAP_LOGO_SIZE = 30;

/** The glyph inside the type badge. */
const TYPE_BADGE_GLYPH = 10;

/**
 * A function of the active tokens because `send`/`receive`/`unknown` read
 * theme colour. Call with `useSemantic()`'s result at render.
 */
export const transactionTypeConfigFor = (
  t: Semantic
): Record<TransactionType, { label: string; icon: IconComponent; color: string }> => ({
  send: { label: 'Sent', icon: ArrowUpIcon, color: t.change.negative },
  receive: { label: 'Received', icon: ArrowDownIcon, color: t.change.positive },
  swap: { label: 'Swapped', icon: ArrowsLeftRightIcon, color: chainMarks.purple },
  mint: { label: 'Minted', icon: PlusCircleIcon, color: chainMarks.cyan },
  burn: { label: 'Burned', icon: FireIcon, color: chainMarks.orange },
  stake: { label: 'Staked', icon: LockIcon, color: chainMarks.green },
  loan: { label: 'Loan', icon: MoneyIcon, color: chainMarks.amber },
  interaction: { label: 'Interaction', icon: CubeIcon, color: chainMarks.blue },
  unknown: { label: 'Unknown', icon: QuestionIcon, color: t.text.secondary },
});

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
function TypeBadge({
  icon: Icon,
  color,
  single = false,
}: {
  icon: IconComponent;
  color: string;
  single?: boolean;
}) {
  const t = useSemantic();
  const inset = single ? -2 : -4;
  return (
    <span
      style={{
        position: 'absolute',
        top: inset,
        right: inset,
        width: TYPE_BADGE_SIZE,
        height: TYPE_BADGE_SIZE,
        borderRadius: borderRadius.full,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        border: `${borderWidth.medium}px solid ${t.depth.abyss}`,
        backgroundColor: color,
      }}
    >
      <Icon size={TYPE_BADGE_GLYPH} color={t.text.primary} />
    </span>
  );
}

/**
 * The row's leading mark: the token that moved, badged with the type — or,
 * for a swap, the pair — falling back to the kit's own well when the token
 * has no logo.
 */
export function TransactionMark({ transaction }: { transaction: Transaction }) {
  const t = useSemantic();
  const { type, inputs, outputs } = transaction;
  const typeConfig = transactionTypeConfigFor(t);
  const config = typeConfig[type] || typeConfig.unknown;

  if (type === 'swap' && inputs[0]?.logo && outputs[0]?.logo) {
    return (
      <span
        data-testid="tx-mark-swap"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          height: LEADING_SIZE,
        }}
      >
        <TokenLogo
          uri={outputs[0].logo}
          symbol={outputs[0].symbol}
          size={SWAP_LOGO_SIZE}
          borderRadius={borderRadius.full}
        />
        <span
          style={{
            display: 'inline-flex',
            marginLeft: -spacing.md,
            borderRadius: borderRadius.full,
            boxSizing: 'content-box',
            border: `${borderWidth.medium}px solid ${t.depth.abyss}`,
          }}
        >
          <TokenLogo
            uri={inputs[0].logo}
            symbol={inputs[0].symbol}
            size={SWAP_LOGO_SIZE}
            borderRadius={borderRadius.full}
          />
        </span>
        <TypeBadge icon={config.icon} color={config.color} />
      </span>
    );
  }

  const primaryToken = type === 'receive' ? inputs[0] : outputs[0] || inputs[0];
  if (primaryToken?.logo) {
    return (
      <span
        data-testid="tx-mark-token"
        style={{
          position: 'relative',
          display: 'inline-flex',
          width: LEADING_SIZE,
          height: LEADING_SIZE,
        }}
      >
        <TokenLogo
          uri={primaryToken.logo}
          symbol={primaryToken.symbol}
          size={LEADING_SIZE}
          borderRadius={borderRadius.full}
        />
        <TypeBadge icon={config.icon} color={config.color} single />
      </span>
    );
  }

  return (
    <IconBubble
      testID="tx-mark-well"
      size={LEADING_SIZE}
      shape="circle"
      tone="surface"
      icon={config.icon}
      iconSize={iconSize.md}
      iconColor={config.color}
    />
  );
}
