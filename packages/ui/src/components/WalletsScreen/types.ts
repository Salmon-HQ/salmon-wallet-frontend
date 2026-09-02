import type { CSSProperties } from 'react';
import type { Testable } from '@salmon/shared';

/**
 * Wallets — CORE 10, on the DOM. Mobile's twin is the route
 * `app/(app)/wallets.tsx`; the screen reads the accounts, the totals and the
 * preferences from the shared contexts itself, and takes only what the host
 * routes: rename, add, rescan.
 */
export interface WalletsScreenProps extends Testable {
  onBack: () => void;
  /** Opens the rename screen for one wallet. */
  onRename: (accountId: string) => void;
  /** Opens the add-wallet flow. */
  onAddWallet: () => void;
  /** Runs the derived-accounts scan for one seed wallet (spec 025). */
  onRescan?: (accountId: string) => void;
  /** The wallet a scan is running for, so the rescan wells stay quiet meanwhile. */
  scanningAccountId?: string | null;
  /** The same list Home totals: unverified tokens count when the toggle is on. */
  showUnverifiedTokens?: boolean;
  style?: CSSProperties;
  className?: string;
}
