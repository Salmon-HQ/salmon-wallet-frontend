import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAccountsContext } from '@salmon/shared';
import { LoadingScreen, WalletInitErrorScreen } from '@salmon/ui';

/**
 * Protects authenticated routes.
 * - Not ready → loading spinner
 * - Locked   → redirect to /lock
 * - Init failed with no accounts → blocking retry screen (never onboarding:
 *   sending a user with broken storage to "create wallet" risks overwriting
 *   an existing vault)
 * - No accounts → redirect to /auth/select
 * - Otherwise → render child route
 */
export function AuthGuard(): React.ReactElement {
  const [state, actions] = useAccountsContext();

  if (!state.ready) {
    return <LoadingScreen visible />;
  }

  if (state.locked) {
    return <Navigate to="/lock" replace />;
  }

  if (state.error && state.accounts.length === 0) {
    return <WalletInitErrorScreen onRetry={actions.retryInit} />;
  }

  if (state.accounts.length === 0) {
    return <Navigate to="/auth/select" replace />;
  }

  return <Outlet />;
}
