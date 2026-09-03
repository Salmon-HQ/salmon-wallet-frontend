import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontSize,
  formatBaseUnits,
  getShortAddress,
  spacing,
  type ApprovalGrant,
  type SolChange,
  type TokenChange,
  type UndeterminedReason,
} from '@salmon/shared';

import { ArrowsLeftRightIcon } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { WarningNotice } from '../WarningNotice';
import { CardHead, bodyText, cardColumn, monoText } from './common';
import type { TransactionEffectsCardProps } from './types';

const SOL_DECIMALS = 9;

/** Every `UndeterminedReason` gets its own sentence — none of them mean "safe". */
const REASON_KEYS: Record<UndeterminedReason, string> = {
  'malformed-transaction': 'dapp.effects_reason_malformed',
  'simulation-unavailable': 'dapp.effects_reason_unavailable',
  'simulation-not-executed': 'dapp.effects_reason_not_executed',
  'account-state-unavailable': 'dapp.effects_reason_no_state',
  'batch-not-previewable': 'dapp.effects_reason_batch',
};

const REASON_FALLBACKS: Record<UndeterminedReason, string> = {
  'malformed-transaction': 'The transaction could not be decoded.',
  'simulation-unavailable': 'The network could not be reached to simulate it.',
  'simulation-not-executed': 'The network did not run the simulation.',
  'account-state-unavailable': 'The network did not return the balances after execution.',
  'batch-not-previewable': 'This request contains several transactions that run in sequence.',
};

interface AmountRowProps {
  asset: string;
  amount: bigint;
  decimals: number;
}

/**
 * One movement of one asset. The direction is carried three ways at once —
 * colour, sign glyph, and a written label — because colour alone is not a
 * channel every user has.
 */
function AmountRow({ asset, amount, decimals }: AmountRowProps): React.ReactElement {
  const { t } = useTranslation();
  const tokens = useSemantic();
  const isOutgoing = amount < 0n;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xxs }}>
      <KeyValueRow
        label={asset}
        labelWeight={600}
        value={`${isOutgoing ? '−' : '+'}${formatBaseUnits(amount, decimals)}`}
        valueTone={isOutgoing ? 'danger' : 'success'}
      />
      <span style={{ ...bodyText(tokens), fontSize: fontSize.caption }}>
        {isOutgoing
          ? t('dapp.effects_out', 'Leaves your wallet')
          : t('dapp.effects_in', 'Enters your wallet')}
      </span>
    </div>
  );
}

function SolRow({ sol }: { sol: SolChange }): React.ReactElement | null {
  const { t } = useTranslation();
  const tokens = useSemantic();
  if (sol.lamports === 0n) return null;

  return (
    <>
      <AmountRow asset="SOL" amount={sol.lamports} decimals={SOL_DECIMALS} />
      {sol.feeLamports != null && sol.feeLamports > 0n ? (
        <p style={{ ...bodyText(tokens), fontSize: fontSize.caption }}>
          {t('dapp.effects_fee_note', 'Includes the {{fee}} SOL network fee.', {
            fee: formatBaseUnits(sol.feeLamports, SOL_DECIMALS),
          })}
        </p>
      ) : null}
    </>
  );
}

function TokenRow({ change }: { change: TokenChange }): React.ReactElement {
  return (
    <AmountRow
      asset={change.symbol ?? getShortAddress(change.mint, 4) ?? change.mint}
      amount={change.amount}
      decimals={change.decimals}
    />
  );
}

/**
 * A delegation the transaction would grant. Rendered apart from the balance
 * rows because it is not a movement: nothing leaves the wallet today, and that
 * is exactly what makes it easy to approve without noticing.
 */
function ApprovalRow({ grant }: { grant: ApprovalGrant }): React.ReactElement {
  const { t } = useTranslation();
  const tokens = useSemantic();
  const isUnlimited = grant.scope === 'unlimited';
  const token = grant.symbol ?? getShortAddress(grant.mint, 4) ?? grant.mint;
  const amount = isUnlimited
    ? t('dapp.effects_approval_unlimited', 'an unlimited amount of')
    : formatBaseUnits(grant.amount, grant.decimals);

  return (
    <WarningNotice
      tone={isUnlimited ? 'error' : 'warning'}
      title={t('dapp.effects_approval_title', 'Spending permission')}
      testID="effects-approval"
    >
      {t(
        'dapp.effects_approval_body',
        '{{spender}} would be able to move {{amount}} {{token}} out of your wallet, now and in the future, until you revoke it.',
        {
          spender: getShortAddress(grant.spender, 4) ?? grant.spender,
          amount,
          token,
        }
      )}
      <span style={{ ...monoText(tokens), display: 'block', color: tokens.text.secondary }}>
        {grant.spender}
      </span>
    </WarningNotice>
  );
}

/**
 * States what a dApp's transaction would actually do to the user's balances.
 *
 * The four outcomes render as four visibly different things on purpose. "We
 * could not tell" must never look like "nothing happens": a user reads an empty
 * list as safety, which is the failure this whole surface exists to prevent.
 */
export function TransactionEffectsCard({
  effects,
  loading,
}: TransactionEffectsCardProps): React.ReactElement {
  const { t } = useTranslation();
  const tokens = useSemantic();

  return (
    <Card padding="lg" gap={spacing.md} style={cardColumn} testID="transaction-effects">
      <CardHead icon={ArrowsLeftRightIcon} label={t('dapp.effects_title', 'Balance changes')} />

      {loading || !effects ? (
        <p style={bodyText(tokens)}>{t('dapp.effects_loading', 'Simulating this transaction…')}</p>
      ) : null}

      {effects?.kind === 'no-effect' ? (
        <WarningNotice tone="info" title={t('dapp.effects_none_title', 'No balance changes')}>
          {t(
            'dapp.effects_none_body',
            'This transaction runs without moving any of your balances.'
          )}
        </WarningNotice>
      ) : null}

      {effects?.kind === 'effects' ? (
        <>
          <SolRow sol={effects.sol} />
          {effects.tokens.map((change) => (
            <TokenRow key={change.tokenAccount} change={change} />
          ))}
          {effects.approvals.map((grant) => (
            <ApprovalRow key={`${grant.tokenAccount}-${grant.spender}`} grant={grant} />
          ))}
        </>
      ) : null}

      {effects?.kind === 'transaction-would-fail' ? (
        <WarningNotice
          tone="error"
          title={t('dapp.effects_would_fail_title', 'This transaction would fail')}
          testID="effects-would-fail"
        >
          {t(
            'dapp.effects_would_fail_body',
            'Salmon simulated it and the network rejected it. Signing it would spend the fee and change nothing.'
          )}
        </WarningNotice>
      ) : null}

      {effects?.kind === 'undetermined' ? (
        <WarningNotice
          tone="warning"
          title={t('dapp.effects_undetermined_title', 'Salmon could not determine what this does')}
          testID="effects-undetermined"
        >
          {t(REASON_KEYS[effects.reason], REASON_FALLBACKS[effects.reason])}
          <span style={{ display: 'block', marginTop: spacing.xs }}>
            {t(
              'dapp.effects_undetermined_body',
              'This is not the same as "nothing happens". Approve only if you trust this app and understand what you are asking it to do.'
            )}
          </span>
        </WarningNotice>
      ) : null}
    </Card>
  );
}
