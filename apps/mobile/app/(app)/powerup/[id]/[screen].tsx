/**
 * The core route that hosts a Powerup's pushed screen — Payments' history
 * behind the tab's clock, and whatever the next Powerup pushes. The route is
 * core's, once, so a Powerup never registers one (`docs/POWERUPS-UI.md`
 * §1.12); it resolves the screen through the Powerups entry, which the
 * off build aliases to nothing, and hands it the account Home would.
 * DOM twin: the `powerupScreen` page of Home's stack
 * (`apps/extension/src/pages/home/powerupBodies.tsx`).
 */
import React from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAccountsContext } from '@salmon/shared';

import { getPowerupScreen } from '../../../../src/powerups';

export default function PowerupScreenRoute() {
  const router = useRouter();
  const { id, screen } = useLocalSearchParams<{ id: string; screen: string }>();
  const [accountState] = useAccountsContext();
  const { activeBlockchainAccount, networkId } = accountState;

  const body = id && screen ? getPowerupScreen(id, screen) : null;
  if (!body || !activeBlockchainAccount) {
    return <Redirect href="/" />;
  }

  // Resolved, never created, here — the same shape Home gives a Powerup tab.
  return React.createElement(body, {
    publicKey: activeBlockchainAccount.getReceiveAddress(),
    networkId: networkId ?? null,
    onBack: () => router.back(),
  });
}
