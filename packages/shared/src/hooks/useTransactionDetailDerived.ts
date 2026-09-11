/**
 * TransactionDetail's three derived values — identical on both platforms:
 * the type config (falling back to "unknown"), the status config (falling
 * back to "completed"), and the swap conversion rate. The config tables
 * carry the platform's icon components, so they stay the caller's argument.
 */
import { useMemo } from 'react';

import { conversionRateFor, type ConversionRate } from '../utils/transactionDisplay';
import type { Transaction } from '../types/transaction';

export function useTransactionDetailDerived<TypeConfig, StatusConfig>(
  transaction: Transaction | null | undefined,
  typeConfigTable: Record<string, TypeConfig> & { unknown: TypeConfig },
  statusConfigTable: Record<string, StatusConfig> & { completed: StatusConfig }
): { typeConfig: TypeConfig; statusConfig: StatusConfig; conversionRate: ConversionRate | null } {
  const typeConfig = useMemo(() => {
    if (!transaction) return typeConfigTable.unknown;
    return typeConfigTable[transaction.type] || typeConfigTable.unknown;
  }, [transaction, typeConfigTable]);

  const statusConfig = useMemo(() => {
    if (!transaction) return statusConfigTable.completed;
    return statusConfigTable[transaction.status] || statusConfigTable.completed;
  }, [transaction, statusConfigTable]);

  const conversionRate = useMemo(() => conversionRateFor(transaction), [transaction]);

  return { typeConfig, statusConfig, conversionRate };
}
