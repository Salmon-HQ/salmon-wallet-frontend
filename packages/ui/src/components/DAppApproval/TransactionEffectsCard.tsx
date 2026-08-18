import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  formatBaseUnits,
  getShortAddress,
  semantic,
  spacing,
  tabularNums,
  type ApprovalGrant,
  type SolChange,
  type TokenChange,
  type TransactionEffects,
  type UndeterminedReason,
} from '@salmon/shared';
import { Card, Label, SectionHeader, sectionIconSx } from './common';

const SOL_DECIMALS = 9;

/**
 * One movement of one asset. The direction is carried three ways at once —
 * colour, sign glyph, and a written label — because colour alone is not a
 * channel every user has.
 */
const EffectRow = styled(Box)({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: spacing.md,
  padding: `${spacing.md}px 0`,
  borderTop: `1px solid ${colors.border.subtle}`,
});

const EffectAsset = styled(Typography)({
  minWidth: 0,
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  overflowWrap: 'anywhere',
});

const EffectDirection = styled(Typography)({
  fontSize: fontSize.xs,
  color: colors.text.secondary,
});

const EffectAmount = styled(Typography)({
  ...tabularNums.css,
  flexShrink: 0,
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  textAlign: 'right',
});

/** A block that states what could not be established, or what would go wrong. */
const Notice = styled(Box)({
  display: 'flex',
  alignItems: 'flex-start',
  gap: spacing.sm,
  padding: spacing.md,
  borderRadius: borderRadius.lg,
  border: '1px solid',
});

const NoticeTitle = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
});

const NoticeBody = styled(Typography)({
  marginTop: spacing.xs,
  fontSize: fontSize.sm,
  lineHeight: 1.45,
  color: colors.text.secondary,
  overflowWrap: 'anywhere',
});

const MonoInline = styled('span')({
  fontFamily: fontFamily.mono,
});

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

function AmountRow({ asset, amount, decimals }: AmountRowProps): React.ReactElement {
  const { t } = useTranslation();
  const isOutgoing = amount < 0n;

  return (
    <EffectRow>
      <Box sx={{ minWidth: 0 }}>
        <EffectAsset>{asset}</EffectAsset>
        <EffectDirection>
          {isOutgoing
            ? t('dapp.effects_out', 'Leaves your wallet')
            : t('dapp.effects_in', 'Enters your wallet')}
        </EffectDirection>
      </Box>
      <EffectAmount sx={{ color: isOutgoing ? semantic.status.danger : semantic.status.success }}>
        {isOutgoing ? '−' : '+'}
        {formatBaseUnits(amount, decimals)}
      </EffectAmount>
    </EffectRow>
  );
}

function SolRow({ sol }: { sol: SolChange }): React.ReactElement | null {
  const { t } = useTranslation();
  if (sol.lamports === 0n) return null;

  return (
    <Box>
      <AmountRow asset="SOL" amount={sol.lamports} decimals={SOL_DECIMALS} />
      {sol.feeLamports != null && sol.feeLamports > 0n ? (
        <EffectDirection sx={{ paddingBottom: `${spacing.sm}px` }}>
          {t('dapp.effects_fee_note', 'Includes the {{fee}} SOL network fee.', {
            fee: formatBaseUnits(sol.feeLamports, SOL_DECIMALS),
          })}
        </EffectDirection>
      ) : null}
    </Box>
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
  const isUnlimited = grant.scope === 'unlimited';
  const token = grant.symbol ?? getShortAddress(grant.mint, 4) ?? grant.mint;
  const amount = isUnlimited
    ? t('dapp.effects_approval_unlimited', 'an unlimited amount of')
    : formatBaseUnits(grant.amount, grant.decimals);
  const tone = isUnlimited ? semantic.status.danger : semantic.status.warning;
  const background = isUnlimited ? semantic.status.dangerTint : semantic.status.warningTint;

  return (
    <Notice sx={{ borderColor: tone, backgroundColor: background, marginTop: `${spacing.md}px` }}>
      <KeyOutlinedIcon sx={{ ...sectionIconSx, color: tone }} />
      <Box sx={{ minWidth: 0 }}>
        <NoticeTitle>{t('dapp.effects_approval_title', 'Spending permission')}</NoticeTitle>
        <NoticeBody>
          {t(
            'dapp.effects_approval_body',
            '{{spender}} would be able to move {{amount}} {{token}} out of your wallet, now and in the future, until you revoke it.',
            {
              spender: getShortAddress(grant.spender, 4) ?? grant.spender,
              amount,
              token,
            }
          )}
        </NoticeBody>
        <NoticeBody>
          <MonoInline>{grant.spender}</MonoInline>
        </NoticeBody>
      </Box>
    </Notice>
  );
}

export interface TransactionEffectsCardProps {
  /** `null` while the preview is still running. */
  effects: TransactionEffects | null;
  loading: boolean;
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

  return (
    <Card>
      <SectionHeader>
        <CompareArrowsOutlinedIcon sx={sectionIconSx} />
        <Label sx={{ marginBottom: 0 }}>{t('dapp.effects_title', 'Balance changes')}</Label>
      </SectionHeader>

      {loading || !effects ? (
        <NoticeBody>{t('dapp.effects_loading', 'Simulating this transaction…')}</NoticeBody>
      ) : null}

      {effects?.kind === 'no-effect' ? (
        <Notice sx={{ borderColor: colors.border.subtle }}>
          <CheckCircleOutlineIcon sx={sectionIconSx} />
          <Box>
            <NoticeTitle>{t('dapp.effects_none_title', 'No balance changes')}</NoticeTitle>
            <NoticeBody>
              {t(
                'dapp.effects_none_body',
                'This transaction runs without moving any of your balances.'
              )}
            </NoticeBody>
          </Box>
        </Notice>
      ) : null}

      {effects?.kind === 'effects' ? (
        <Box>
          <SolRow sol={effects.sol} />
          {effects.tokens.map((change) => (
            <TokenRow key={change.tokenAccount} change={change} />
          ))}
          {effects.approvals.map((grant) => (
            <ApprovalRow key={`${grant.tokenAccount}-${grant.spender}`} grant={grant} />
          ))}
        </Box>
      ) : null}

      {effects?.kind === 'transaction-would-fail' ? (
        <Notice
          sx={{ borderColor: semantic.status.danger, backgroundColor: semantic.status.dangerTint }}
        >
          <ErrorOutlineIcon sx={{ ...sectionIconSx, color: semantic.status.danger }} />
          <Box sx={{ minWidth: 0 }}>
            <NoticeTitle>
              {t('dapp.effects_would_fail_title', 'This transaction would fail')}
            </NoticeTitle>
            <NoticeBody>
              {t(
                'dapp.effects_would_fail_body',
                'Salmon simulated it and the network rejected it. Signing it would spend the fee and change nothing.'
              )}
            </NoticeBody>
          </Box>
        </Notice>
      ) : null}

      {effects?.kind === 'undetermined' ? (
        <Notice
          sx={{
            borderColor: semantic.status.warning,
            backgroundColor: semantic.status.warningTint,
          }}
        >
          <HelpOutlineIcon sx={{ ...sectionIconSx, color: semantic.status.warning }} />
          <Box sx={{ minWidth: 0 }}>
            <NoticeTitle>
              {t('dapp.effects_undetermined_title', 'Salmon could not determine what this does')}
            </NoticeTitle>
            <NoticeBody>
              {t(REASON_KEYS[effects.reason], REASON_FALLBACKS[effects.reason])}
            </NoticeBody>
            <NoticeBody>
              {t(
                'dapp.effects_undetermined_body',
                'This is not the same as "nothing happens". Approve only if you trust this app and understand what you are asking it to do.'
              )}
            </NoticeBody>
          </Box>
        </Notice>
      ) : null}
    </Card>
  );
}
