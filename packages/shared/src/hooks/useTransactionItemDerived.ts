/**
 * TransactionItem's per-row derived values — identical on both platforms:
 * which type-config entry applies, whether the amounts collapse, the
 * description under the verb, and the type's translated label. The type
 * config table carries the platform's icon components, so it stays the
 * caller's argument.
 */
import { useMemo } from 'react';

import { TYPE_LABEL_KEYS, describeTransactionRow } from '../utils/transactionDisplay';
import type { Transaction } from '../types/transaction';

/**
 * `i18next`'s `t`, loosened to `any` on the second param — `TFunction`'s
 * overloads (string default vs. options object) don't collapse into one
 * assignable signature, and this hook only ever forwards what it's given.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransactionItemTranslate = (key: string, optionsOrDefault?: any) => string;

export interface UseTransactionItemDerivedResult<TypeConfig> {
  config: TypeConfig;
  /** `inputs.length + outputs.length` — what `isComplex` is measured against. */
  totalAmounts: number;
  isComplex: boolean;
  descriptionText: string;
  typeLabel: string;
}

export function useTransactionItemDerived<TypeConfig extends { label: string }>(
  transaction: Transaction,
  contacts: Record<string, string> | undefined,
  t: TransactionItemTranslate,
  typeConfigTable: Record<string, TypeConfig> & { unknown: TypeConfig },
  maxVisibleAmounts: number
): UseTransactionItemDerivedResult<TypeConfig> {
  const { type, inputs, outputs } = transaction;
  const config = typeConfigTable[type] || typeConfigTable.unknown;

  const totalAmounts = inputs.length + outputs.length;
  const isComplex = type === 'swap' && totalAmounts > maxVisibleAmounts;

  const descriptionText = useMemo(() => {
    const said = describeTransactionRow(transaction, contacts);
    return t(said.key, said.values);
  }, [transaction, contacts, t]);

  const typeLabel = t(TYPE_LABEL_KEYS[type] ?? TYPE_LABEL_KEYS.unknown, config.label);

  return { config, totalAmounts, isComplex, descriptionText, typeLabel };
}
