/**
 * Contexts module for shared React contexts.
 *
 * @module contexts
 */

// Accounts context
export { AccountsContext, AccountsProvider, useAccountsContext } from './AccountsContext';

export type { AccountsContextValue, AccountsProviderProps } from './AccountsContext';

// Currency context
export { CurrencyContext, CurrencyProvider, useCurrencyContext } from './CurrencyContext';

export type {
  CurrencyState,
  CurrencyActions,
  CurrencyContextValue,
  CurrencyProviderProps,
} from './CurrencyContext';

// Bridge settlement context (background cross-chain settlement)
export {
  BridgeSettlementContext,
  BridgeSettlementProvider,
  useBridgeSettlement,
} from './BridgeSettlementContext';

export type {
  PendingBridgeExchange,
  BridgeSettlementProviderProps,
} from './BridgeSettlementContext';

// Pending transactions context (global in-flight state for signed on-chain txs)
export {
  PendingTransactionsContext,
  PendingTransactionsProvider,
  usePendingTransactions,
  usePendingTransactionsOptional,
} from './PendingTransactionsContext';

export type {
  PendingTransaction,
  PendingTransactionKind,
  PendingTransactionStatus,
  PendingTransactionsProviderProps,
} from './PendingTransactionsContext';
