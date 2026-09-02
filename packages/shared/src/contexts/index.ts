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

// Theme context (appearance preference → active mode → resolved tokens)
export { ThemeContext, ThemeProvider, useTheme } from './ThemeContext';

export type {
  ThemePreference,
  SystemScheme,
  ThemeContextValue,
  ThemeProviderProps,
} from './ThemeContext';

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

// Task chrome (a task flow's grip on the shell; the surface count Home keys on)
export { TaskChromeProvider, useTaskChrome, useTaskChromeClaim } from './TaskChromeContext';

export type { TaskChromeContextValue } from './TaskChromeContext';

// Developer mode (which networks are offered; whether unverified tokens show)
export {
  DeveloperModeProvider,
  useDeveloperMode,
  useUnverifiedTokens,
  useDeveloperModeSettings,
} from './DeveloperModeContext';

export type { DeveloperModeContextValue } from './DeveloperModeContext';
