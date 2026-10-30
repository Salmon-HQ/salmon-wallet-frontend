/**
 * DagonTab — the Dagon Powerup's Home surface on mobile: Home's account
 * inputs to the screen, nothing more. Home mounts this only with an account
 * on devnet, so there is no "no account" state here (`docs/POWERUPS-UI.md` §1.1).
 */
import React from 'react';
import type { PowerupTabProps } from '../powerups';
import { DagonScreen } from '../components/DagonScreen';

export default function DagonTab({ publicKey, networkId, sheetHeight }: PowerupTabProps) {
  return <DagonScreen publicKey={publicKey} networkId={networkId} sheetHeight={sheetHeight} />;
}
