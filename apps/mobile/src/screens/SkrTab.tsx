/**
 * SkrTab — the SKR Powerup's Home surface on mobile: Home's account input to
 * the shared screen, nothing more (`docs/POWERUPS-UI.md` §1.1).
 */
import React from 'react';
import type { PowerupTabProps } from '../powerups';
import { SkrScreen } from '../components/SkrScreen';

export default function SkrTab({ publicKey }: PowerupTabProps) {
  return <SkrScreen publicKey={publicKey} />;
}
