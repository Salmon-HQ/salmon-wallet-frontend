import type { CSSProperties } from 'react';
import type { PowerupEntry } from '@salmon/shared/powerups';

export interface PowerupsPageProps {
  /** The registry entries for the active network, in the registry's order. */
  powerups: readonly PowerupEntry[];
  /** Open the Powerup's screen — the host maps `entry.route` to its page. */
  onOpen: (entry: PowerupEntry) => void;
  onBack: () => void;
  style?: CSSProperties;
}
