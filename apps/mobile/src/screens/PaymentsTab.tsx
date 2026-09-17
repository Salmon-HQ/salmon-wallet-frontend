/**
 * PaymentsTab — the Payments Powerup's Home surface on mobile: Home's account
 * inputs to the shared screen, nothing more. Home mounts this only with an
 * account, so there is no "no account" state here (`docs/POWERUPS-UI.md` §1.1).
 */
import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import type { PowerupTabProps } from '../powerups';
import { PaymentsScreen } from '../components/PaymentsScreen';

export default function PaymentsTab({
  publicKey,
  networkId,
  onNavigateHome,
  sheetHeight,
}: PowerupTabProps) {
  const router = useRouter();
  const onPay = useCallback(
    () => router.push({ pathname: '/send', params: { scan: '1' } }),
    [router]
  );
  // The history is a pushed screen, hosted by the core Powerup route.
  const onHistory = useCallback(() => router.push('/powerup/payments/history'), [router]);
  return (
    <PaymentsScreen
      publicKey={publicKey}
      networkId={networkId}
      onNavigateHome={onNavigateHome}
      onPay={onPay}
      onHistory={onHistory}
      sheetHeight={sheetHeight}
    />
  );
}
