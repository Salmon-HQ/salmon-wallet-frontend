/**
 * PaymentsTab — the Payments Powerup's Home surface on mobile: Home's account
 * inputs to the shared screen, nothing more. Home mounts this only with an
 * account, so there is no "no account" state here (`docs/POWERUPS-UI.md` §1.1).
 */
import React from 'react';
import type { PowerupTabProps } from '../powerups';
import { PaymentsScreen } from '../components/PaymentsScreen';

export default function PaymentsTab({ publicKey, networkId, onNavigateHome }: PowerupTabProps) {
  return (
    <PaymentsScreen publicKey={publicKey} networkId={networkId} onNavigateHome={onNavigateHome} />
  );
}
