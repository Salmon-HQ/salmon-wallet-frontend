import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAccountsContext, useWaitExit } from '@salmon/shared';
import { LoadingScreen, WalletInitErrorScreen } from '@salmon/ui';

/**
 * Protects authenticated routes.
 * - Not ready → the wait, held until its closing wave has left the screen
 * - Locked   → redirect to /lock
 * - Init failed with no accounts → blocking retry screen (never onboarding:
 *   sending a user with broken storage to "create wallet" risks overwriting
 *   an existing vault)
 * - No accounts → redirect to /auth/select
 * - Otherwise → render child route
 */
export function AuthGuard(): React.ReactElement {
  const [state, actions] = useAccountsContext();
  // The boot wait leaves on a wave, and this guard used to swap branches the
  // instant `ready` flipped — unmounting it mid-crossing. Held until the water
  // is calm; the wait's own `wavefrontExitMs()` bound is what stops a dropped
  // animation callback from stranding the app here.
  const { held: waitHeld, onExited: onWaitExited } = useWaitExit(!state.ready);

  if (waitHeld) {
    return <LoadingScreen visible={!state.ready} onExited={onWaitExited} />;
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
