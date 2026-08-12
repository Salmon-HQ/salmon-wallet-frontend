/**
 * AccountsContext - Shared state context for account management
 *
 * This context solves the shared state problem where multiple components
 * calling useAccounts() each have their own isolated state. By wrapping
 * the app with AccountsProvider, all components share the same state instance.
 *
 * The provider calls useAccounts() once internally and shares that single
 * instance via context. This means when RootLayoutNav unlocks the wallet,
 * HomeScreen and all other components see the update immediately.
 *
 * @module contexts/AccountsContext
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import { useAccounts, type UseAccountsState, type UseAccountsActions } from '../hooks/useAccounts';

// ============================================================================
// Types
// ============================================================================

/**
 * Context value type - tuple of [state, actions] matching useAccounts return type
 */
type AccountsContextValue = [UseAccountsState, UseAccountsActions];

// ============================================================================
// Context
// ============================================================================

/**
 * The accounts context - holds the shared [state, actions] tuple from useAccounts
 */
const AccountsContext = createContext<AccountsContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

/**
 * Props for the AccountsProvider component
 */
interface AccountsProviderProps {
  children: ReactNode;
}

/**
 * AccountsProvider - Wraps the app to provide shared account state
 *
 * This component calls useAccounts() once and provides that single instance
 * to all child components via context. This ensures all components share
 * the same state and see updates from any component.
 *
 * @example
 * ```tsx
 * // In _layout.tsx
 * export default function RootLayout() {
 *   return (
 *     <AccountsProvider>
 *       <RootLayoutNav />
 *     </AccountsProvider>
 *   );
 * }
 * ```
 */
export function AccountsProvider({ children }: AccountsProviderProps) {
  // Single source of truth - useAccounts called once here
  const accountsValue = useAccounts();

  return <AccountsContext.Provider value={accountsValue}>{children}</AccountsContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useAccountsContext - Hook to access shared account state from context
 *
 * This hook returns the same [state, actions] tuple as useAccounts(),
 * but retrieves it from context so all components share the same instance.
 *
 * @throws Error if used outside of AccountsProvider
 *
 * @example
 * ```tsx
 * function HomeScreen() {
 *   const [state, actions] = useAccountsContext();
 *
 *   if (!state.ready) return <Loading />;
 *   if (state.locked) return <UnlockScreen onUnlock={actions.unlockAccounts} />;
 *
 *   return (
 *     <div>
 *       <p>Active: {state.activeAccount?.name}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAccountsContext(): AccountsContextValue {
  const context = useContext(AccountsContext);

  if (!context) {
    throw new Error(
      'useAccountsContext must be used within an AccountsProvider. ' +
        'Make sure to wrap your app with <AccountsProvider>.'
    );
  }

  return context;
}

// ============================================================================
// Exports
// ============================================================================

export { AccountsContext };
export type { AccountsContextValue, AccountsProviderProps };
