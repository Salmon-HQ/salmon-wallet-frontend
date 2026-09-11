/**
 * The developer-mode card's row data: the raw shape of the transaction as
 * the indexer reported it — Helius type, account count, programs, inner
 * swaps, fees — turned into plain sections and rows.
 *
 * Shared because both `TransactionDetailDeveloper` twins (mobile and DOM)
 * draw the exact same groups from the exact same transaction fields; only
 * the card/row/section components differ per platform.
 */
import { getShortAddress } from './address';
import type { Transaction } from '../types';

export interface TransactionDeveloperRow {
  key: string;
  label: string;
  value: string;
  valueTone?: 'secondary';
  labelWeight?: 500 | 600;
}

export interface TransactionDeveloperSection {
  key: string;
  /** Section caption; omitted for the two ungrouped top rows. */
  title?: string;
  rows: TransactionDeveloperRow[];
}

/**
 * `i18next`'s `t`, loosened to `any` on the second param — `TFunction`'s
 * overloads (string default vs. options object) don't collapse into one
 * assignable signature, and this builder only ever forwards what it's given.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransactionDeveloperTranslate = (key: string, optionsOrDefault?: any) => string;

export function buildTransactionDeveloperSections(
  transaction: Transaction,
  t: TransactionDeveloperTranslate
): TransactionDeveloperSection[] {
  const sections: TransactionDeveloperSection[] = [];

  const topRows: TransactionDeveloperRow[] = [];
  if (transaction.heliusType) {
    topRows.push({
      key: 'heliusType',
      label: t('transactions.detail.heliusType', 'Type'),
      value: transaction.heliusType,
      labelWeight: 600,
    });
  }
  if (transaction.accountsInvolved != null) {
    topRows.push({
      key: 'accountsInvolved',
      label: t('transactions.detail.accountsInvolved', 'Accounts Involved'),
      value: String(transaction.accountsInvolved),
      labelWeight: 600,
    });
  }
  if (topRows.length > 0) sections.push({ key: 'top', rows: topRows });

  if (transaction.instructions && transaction.instructions.length > 0) {
    sections.push({
      key: 'programs',
      title: t('transactions.detail.programs', 'Programs'),
      rows: transaction.instructions.map((ix, index) => ({
        key: `ix-${index}`,
        label: getShortAddress(ix.programId, 6) ?? '',
        value:
          ix.innerInstructionsCount > 0
            ? t('transactions.detail.innerCount', {
                count: ix.innerInstructionsCount,
                defaultValue: '{{count}} inner',
              })
            : '',
        valueTone: 'secondary',
      })),
    });
  }

  if (transaction.innerSwaps && transaction.innerSwaps.length > 0) {
    sections.push({
      key: 'innerSwaps',
      title: t('transactions.detail.innerSwaps', 'Inner Swaps'),
      rows: transaction.innerSwaps.map((swap, index) => ({
        key: `inner-${index}`,
        label: swap.programInfo.source,
        value: `${swap.programInfo.programName} / ${swap.programInfo.instructionName}`,
        valueTone: 'secondary',
      })),
    });
  }

  if (transaction.swapFees) {
    sections.push({
      key: 'swapFees',
      title: t('transactions.detail.swapFees', 'Swap Fees'),
      rows: [
        ...transaction.swapFees.nativeFees.map((fee, index) => ({
          key: `nfee-${index}`,
          label: getShortAddress(fee.account, 6) ?? '',
          value: `${fee.amount} SOL`,
          valueTone: 'secondary' as const,
        })),
        ...transaction.swapFees.tokenFees.map((fee, index) => ({
          key: `tfee-${index}`,
          label: getShortAddress(fee.account, 6) ?? '',
          value: `${fee.amount} (${getShortAddress(fee.mint, 4) ?? ''})`,
          valueTone: 'secondary' as const,
        })),
      ],
    });
  }

  return sections;
}
