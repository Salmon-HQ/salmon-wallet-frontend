/**
 * A dApp's transaction, laid out for the confirmation screen core already
 * renders for Powerups (spec 036). The rules are the extension's
 * `TransactionEffectsCard`: every balance that moves is named, a token without
 * a ticker shows its mint, and "could not tell" never reads as "nothing happens".
 */
import type { TransactionEffects } from '../blockchain/solana/simulation-types';
import type { ConfirmationRow, ProposalDisplay } from '../core/confirmation/types';
import { formatBaseUnits } from './formatting';
import { getShortAddress } from './address';

const SOL_DECIMALS = 9;

type Translate = (key: string, values?: Record<string, unknown>) => string;

export interface DAppTransactionDisplayInput {
  origin: string;
  /** `null` while the preview runs or when it could not start. */
  effects: TransactionEffects | null;
  effectsLoading: boolean;
  feeSol: string | null;
  transactionCount: number;
  parsingError: string | null;
}

function amountRow(t: Translate, amount: bigint, decimals: number, asset: string): ConfirmationRow {
  const outgoing = amount < 0n;
  return {
    label: t(outgoing ? 'dapp.effects_out' : 'dapp.effects_in'),
    value: `${outgoing ? '−' : '+'}${formatBaseUnits(amount, decimals)} ${asset}`,
  };
}

export function dappTransactionDisplay(
  input: DAppTransactionDisplayInput,
  t: Translate
): ProposalDisplay {
  const { effects } = input;
  const rows: ConfirmationRow[] = [{ label: t('dapp.requesting_site'), value: input.origin }];
  let warning: ProposalDisplay['warning'];

  if (input.parsingError) {
    warning = { title: t('dapp.transaction_unavailable'), body: t('dapp.decode_error') };
  } else if (input.effectsLoading) {
    rows.push({ label: t('dapp.effects_title'), value: t('dapp.effects_loading'), pending: true });
  } else if (effects?.kind === 'effects') {
    if (effects.sol.lamports !== 0n) {
      rows.push(amountRow(t, effects.sol.lamports, SOL_DECIMALS, 'SOL'));
    }
    for (const change of effects.tokens) {
      rows.push(amountRow(t, change.amount, change.decimals, change.symbol ?? change.mint));
    }
    const grant = effects.approvals[0];
    if (grant) {
      warning = {
        title: t('dapp.effects_approval_title'),
        body: t('dapp.effects_approval_body', {
          spender: getShortAddress(grant.spender, 4) ?? grant.spender,
          amount:
            grant.scope === 'unlimited'
              ? t('dapp.effects_approval_unlimited')
              : formatBaseUnits(grant.amount, grant.decimals),
          token: grant.symbol ?? grant.mint,
        }),
      };
    }
  } else if (effects?.kind === 'no-effect') {
    warning = { title: t('dapp.effects_none_title'), body: t('dapp.effects_none_body') };
  } else if (effects?.kind === 'transaction-would-fail') {
    warning = {
      title: t('dapp.effects_would_fail_title'),
      body: t('dapp.effects_would_fail_body'),
    };
  } else if (effects?.kind === 'undetermined') {
    warning = {
      title: t('dapp.effects_undetermined_title'),
      body: t('dapp.effects_undetermined_body'),
    };
  }

  if (input.feeSol) rows.push({ label: t('dapp.transaction_fee'), value: `${input.feeSol} SOL` });

  return {
    title: t('dapp.transaction_title'),
    rows,
    advancedRows:
      input.transactionCount > 1
        ? [{ label: t('dapp.batch_size'), value: String(input.transactionCount) }]
        : undefined,
    warning,
    pendingTitle: t('dapp.transaction_title'),
  };
}
