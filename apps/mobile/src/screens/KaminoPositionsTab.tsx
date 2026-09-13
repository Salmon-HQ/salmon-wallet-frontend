/**
 * KaminoPositionsTab — the Kamino Positions Powerup's Home surface on mobile:
 * the active address to the shared screen, nothing more.
 */
import React from 'react';
import type { PowerupTabProps } from '../powerups';
import { KaminoPositionsScreen } from '../components/KaminoPositionsScreen';

export default function KaminoPositionsTab({ publicKey }: PowerupTabProps) {
  return <KaminoPositionsScreen publicKey={publicKey} />;
}
