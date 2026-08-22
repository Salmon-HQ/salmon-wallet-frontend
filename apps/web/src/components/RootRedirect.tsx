import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAccountsContext, useWaitExit } from '@salmon/shared';
import { LoadingScreen, WalletInitErrorScreen } from '@salmon/ui';

/**
 * Root "/" redirect logic based on wallet state.
 */
export function RootRedirect(): React.ReactElement {
  const [state, actions] = useAccountsContext();
  // Held until the boot wait's closing wave has left the screen — a redirect
  // that fires the frame `ready` flips unmounts the wave mid-crossing.
  const { held: waitHeld, onExited: onWaitExited } = useWaitExit(!state.ready);

  if (waitHeld) {
    return <LoadingScreen visible={!state.ready} onExited={onWaitExited} />;
  }

  // Init failed and nothing loaded — block instead of routing a user with
  // broken storage into onboarding (lock screen still takes precedence).
  if (state.error && state.accounts.length === 0 && !state.locked) {
    return <WalletInitErrorScreen onRetry={actions.retryInit} />;
  }

  if (state.accounts.length === 0) {
    return <Navigate to="/auth/select" replace />;
  }

  if (state.locked) {
    return <Navigate to="/lock" replace />;
  }

  return <Navigate to="/home" replace />;
}
