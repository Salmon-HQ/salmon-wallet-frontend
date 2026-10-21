/**
 * A dApp's transaction, laid out for the confirmation screen core already
 * renders for Powerups (spec 036). The rules are the extension's
 * `TransactionEffectsCard`: every balance that moves is named, a token without
 * a ticker shows its mint, and "could not tell" never reads as "nothing happens".
 */
import type {
  EffectDetails,
  TransactionEffects,
  UndeterminedReason,
} from '../blockchain/solana/simulation-types';
import type { ConfirmationRow, ProposalDisplay } from '../core/confirmation/types';
import type { SigningAccount } from '../types/ui/dapp-approval';
import { formatBaseUnits } from './formatting';
import { getShortAddress } from './address';

const SOL_DECIMALS = 9;

type Translate = (key: string, values?: Record<string, unknown>) => string;

/** Every `UndeterminedReason` gets its own sentence — none of them mean "safe". */
export const UNDETERMINED_REASON_KEYS: Record<UndeterminedReason, string> = {
  'malformed-transaction': 'dapp.effects_reason_malformed',
  'unsupported-transaction-version': 'dapp.effects_reason_unsupported_version',
  'simulation-unavailable': 'dapp.effects_reason_unavailable',
  'simulation-not-executed': 'dapp.effects_reason_not_executed',
  'account-state-unavailable': 'dapp.effects_reason_no_state',
  'batch-not-previewable': 'dapp.effects_reason_batch',
  'ownership-change': 'dapp.effects_reason_ownership_change',
  'unanalysed-program': 'dapp.effects_reason_unanalysed',
  'unanalysed-account': 'dapp.effects_reason_unanalysed_account',
  'durable-nonce': 'dapp.effects_reason_durable_nonce',
};

/** "Savings · Fg6P...KzXf", or the short address alone for an unnamed account. */
export function formatSigningAccount({ name, address }: SigningAccount): string {
  const short = getShortAddress(address, 4) ?? address;
  return name ? `${name} · ${short}` : short;
}

export interface DAppTransactionDisplayInput {
  origin: string;
  /** The account that signs, named so the user sees which one the site gets. */
  signingAccount: SigningAccount;
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

function movementRows(t: Translate, details: EffectDetails): ConfirmationRow[] {
  return [
    ...(details.sol.lamports !== 0n
      ? [amountRow(t, details.sol.lamports, SOL_DECIMALS, 'SOL')]
      : []),
    ...details.tokens.map((change) =>
      amountRow(t, change.amount, change.decimals, change.symbol ?? change.mint)
    ),
  ];
}

/**
 * What a simulation says the account gives and gets, with no sign and no
 * colour to vouch for it: "10 USDC → 0.05 SOL". The arrow stays when only one
 * side moves ("10 USDC →"), so the direction is never lost. `null` when
 * nothing moves.
 */
export function simulatedMovementLine(details: EffectDetails): string | null {
  const assets = [
    { amount: details.sol.lamports, decimals: SOL_DECIMALS, asset: 'SOL' },
    ...details.tokens.map((change) => ({
      amount: change.amount,
      decimals: change.decimals,
      asset: change.symbol ?? change.mint,
    })),
  ];
  const side = (leaving: boolean) =>
    assets
      .filter(({ amount }) => (leaving ? amount < 0n : amount > 0n))
      .map(({ amount, decimals, asset }) => `${formatBaseUnits(amount, decimals)} ${asset}`)
      .join(' + ');
  const [gives, gets] = [side(true), side(false)];
  if (!gives && !gets) return null;
  return [gives, '→', gets].filter(Boolean).join(' ');
}

/** Every delegation, named: a harmless first one must not hide the next. */
function approvalsText(t: Translate, details: EffectDetails): string | undefined {
  if (details.approvals.length === 0) return undefined;
  return details.approvals
    .map((grant) =>
      t('dapp.effects_approval_body', {
        spender: getShortAddress(grant.spender, 4) ?? grant.spender,
        amount:
          grant.scope === 'unlimited'
            ? t('dapp.effects_approval_unlimited')
            : formatBaseUnits(grant.amount, grant.decimals),
        token: grant.symbol ?? grant.mint,
      })
    )
    .join('\n\n');
}

export function dappTransactionDisplay(
  input: DAppTransactionDisplayInput,
  t: Translate
): ProposalDisplay {
  const { effects } = input;
  const rows: ConfirmationRow[] = [
    { label: t('dapp.requesting_site'), value: input.origin },
    { label: t('dapp.wallet_address'), value: formatSigningAccount(input.signingAccount) },
  ];
  let warning: ProposalDisplay['warning'];

  if (input.parsingError) {
    warning = { title: t('dapp.transaction_unavailable'), body: t('dapp.decode_error') };
  } else if (input.effectsLoading) {
    rows.push({ label: t('dapp.effects_title'), value: t('dapp.effects_loading'), pending: true });
  } else if (effects?.kind === 'effects') {
    rows.push(...movementRows(t, effects));
    const approvals = approvalsText(t, effects);
    if (approvals) warning = { title: t('dapp.effects_approval_title'), body: approvals };
  } else if (effects?.kind === 'undetermined' && effects.known) {
    // A program Salmon cannot read can make its simulation say anything, so
    // its numbers read as a simulation; with every program readable they are
    // what moves, short of the change the preview cannot show.
    if (effects.reason === 'unanalysed-program') {
      const line = simulatedMovementLine(effects.known);
      if (line) rows.push({ label: t('dapp.effects_simulated_label'), value: line });
    } else {
      rows.push(...movementRows(t, effects.known));
    }
    const reason = t(UNDETERMINED_REASON_KEYS[effects.reason]);
    const approvals = approvalsText(t, effects.known);
    warning = approvals
      ? { title: t('dapp.effects_approval_title'), body: `${approvals}\n\n${reason}` }
      : { title: reason };
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
      body: `${t(UNDETERMINED_REASON_KEYS[effects.reason])}\n\n${t('dapp.effects_undetermined_body')}`,
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

export interface DAppTransactionGateInput {
  effects: TransactionEffects | null;
  effectsLoading: boolean;
  parsingError: string | null;
}

/**
 * The extension's approval rules (`DAppTransactionApprovalView`): nothing is
 * signable before the preview answers or when it could not read the bytes —
 * the requesting site controls how long the preview takes — and a delegation,
 * an undetermined preview, a failing transaction or a preview that settled
 * with no answer needs a deliberate hold.
 */
export function dappTransactionGate({
  effects,
  effectsLoading,
  parsingError,
}: DAppTransactionGateInput): { canApprove: boolean; requiresHold: boolean } {
  const requiresHold =
    effects == null
      ? !effectsLoading
      : effects.kind === 'undetermined' ||
        effects.kind === 'transaction-would-fail' ||
        (effects.kind === 'effects' && effects.approvals.length > 0);
  return { canApprove: !effectsLoading && !parsingError, requiresHold };
}
